'use strict';

const BaseConnection = require('./base/connection.js');

class Connection extends BaseConnection {
  promise(promiseImpl) {
    const PromiseConnection = require('./promise/connection.js');
    return new PromiseConnection(this, promiseImpl);
  }
}

module.exports = Connection;
