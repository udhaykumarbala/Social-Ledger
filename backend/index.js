
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Web3 } = require('web3');

// Initialize Web3
const web3 = new Web3("https://polygon-mumbai.infura.io/v3/f5dea307b8e141b1959889e8829587f8");

const app = express();
app.use(cors());
// frontend url : https://social-ledger.pages.dev/ add this to cors
app.use(cors({ origin: 'https://social-ledger.pages.dev' }));
app.use(bodyParser.json());
const port = 80;


// Initialize SQLite database
const db = new sqlite3.Database('./mydb.sqlite3', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTable();
  }
});

// Function to create the address table
const createTable = () => {
  db.run('CREATE TABLE IF NOT EXISTS address (id TEXT, address TEXT)', (err) => {
    if (err) {
      console.error(err.message);
    }
  });
};

// Function to create random alphanumeric ID
const createRandomAlphanumeric = (length) => {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Function to add an address
const addAddress = (address, callback) => {
  let id = createRandomAlphanumeric(6);

  const checkIdExists = (id, cb) => {
    db.get(`SELECT id FROM address WHERE id = ?`, [id], (err, row) => {
      if (err) {
        return cb(err);
      }
      cb(null, row != null);
    });
  };

  const tryInsert = () => {
    checkIdExists(id, (err, exists) => {
      if (err) {
        return callback(err);
      }
      if (!exists) {
        db.run(`INSERT INTO address (id, address) VALUES (?, ?)`, [id, address], function (err) {
          if (err) {
            return callback(err);
          }
          console.log(`Address with ID ${id} added.`);
          callback(null, id);
        });
      } else {
        id = createRandomAlphanumeric(6);
        tryInsert();
      }
    });
  };

  tryInsert();
};

// Function to get an address
const getAddress = (id, callback) => {
  db.get(`SELECT address FROM address WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return callback(err);
    }
    callback(null, row ? row.address : null);
  });
};

const getID = (address, callback) => {
  db.get(`SELECT id FROM address WHERE address = ?`, [address], (err, row) => {
    if (err) {
      return callback(err);
    }
    callback(null, row ? row.id : "");
  });
};

// verifySignedMessage 
function verifySignedMessage(message, signature) {

  let address = web3.eth.accounts.recover(message, signature);
  return address;
}


app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Route to get address
app.get('/getAddress', (req, res) => {
  const id = req.query.id;
  getAddress(id, (err, address) => {
    if (err) {
      res.status(500).send('Error retrieving address');
    } else {
      const response = {
        address: address,
      };
      res.send(response);
    }
  });
});

// Route to add address
app.post('/addAddress', (req, res) => {
  const signature = req.body.signature;

  const message = req.body.message;
  const address = verifySignedMessage(message, signature);

  getID(address, (err, id) => {
    if (err) {
      res.status(500).send('Error retrieving address');
    } else {
      if (id == "") {
        addAddress(address, (err, id) => {
          if (err) {
            res.status(500).send('Error adding address');
          } else {
            console.log("Address added :", address, "with ID :", id, "\n");
            const response = {
              id: id,
              address: address,
            };
            res.send(response);
          }
        });
      } else {
        console.log("Address already exists :", address, "with ID :", id, "\n");
        const response = {
          id: id,
          address: address,
        };
        res.send(response);
      }
    }
  });
});

// Route to add address without signature
app.post('/addAddressWithoutSignature', (req, res) => {
  const address = req.body.address;
  addAddress(address, (err, id) => {
    if (err) {
      res.status(500).send('Error adding address');
    } else {
      const response = {
        id: id,
        address: address,
      };
      res.send(response);
    }
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
