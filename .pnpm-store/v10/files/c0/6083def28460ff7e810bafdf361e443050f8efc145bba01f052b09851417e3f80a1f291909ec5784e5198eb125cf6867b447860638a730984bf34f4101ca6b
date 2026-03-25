'use strict';

const BasePool = require('./base/pool.js');

class Pool extends BasePool {
  promise(promiseImpl) {
    const PromisePool = require('./promise/pool.js');
    return new PromisePool(this, promiseImpl);
  }
}

module.exports = Pool;
