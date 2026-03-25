'use strict';

const ConnectionConfig = require('./connection_config.js');

class PoolConfig {
  constructor(options) {
    if (typeof options === 'string') {
      options = ConnectionConfig.parseUrl(options);
    }
    this.connectionConfig = new ConnectionConfig(options);
    this.waitForConnections =
      options.waitForConnections === undefined
        ? true
        : Boolean(options.waitForConnections);
    this.connectionLimit = isNaN(options.connectionLimit)
      ? 10
      : Number(options.connectionLimit);
    this.maxIdle = isNaN(options.maxIdle)
      ? this.connectionLimit
      : Number(options.maxIdle);
    this.idleTimeout = isNaN(options.idleTimeout)
      ? 60000
      : Number(options.idleTimeout);
    this.queueLimit = isNaN(options.queueLimit)
      ? 0
      : Number(options.queueLimit);
  }
}

module.exports = PoolConfig;
