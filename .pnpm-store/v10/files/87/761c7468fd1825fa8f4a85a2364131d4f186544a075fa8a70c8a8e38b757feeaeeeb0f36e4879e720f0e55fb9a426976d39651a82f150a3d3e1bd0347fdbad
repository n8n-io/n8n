'use strict';

const PromiseConnection = require('./connection.js');
const BasePoolConnection = require('../base/pool_connection.js');

class PromisePoolConnection extends PromiseConnection {
  constructor(connection, promiseImpl) {
    super(connection, promiseImpl);
  }

  destroy() {
    return BasePoolConnection.prototype.destroy.apply(
      this.connection,
      arguments
    );
  }
}

module.exports = PromisePoolConnection;
