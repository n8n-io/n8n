'use strict';

const Connection = require('./connection.js');
const ConnectionConfig = require('./connection_config.js');

function createConnection(opts) {
  return new Connection({ config: new ConnectionConfig(opts) });
}

module.exports = createConnection;
