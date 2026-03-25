'use strict';

const Pool = require('./pool.js');
const PoolConfig = require('./pool_config.js');

function createPool(config) {
  return new Pool({ config: new PoolConfig(config) });
}

module.exports = createPool;
