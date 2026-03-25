'use strict';

const EventEmitter = require('events').EventEmitter;
const makeDoneCb = require('./make_done_cb.js');
const PromisePoolConnection = require('./pool_connection.js');
const inheritEvents = require('./inherit_events.js');
const BasePool = require('../base/pool.js');

class PromisePool extends EventEmitter {
  constructor(pool, thePromise) {
    super();
    this.pool = pool;
    this.Promise = thePromise || Promise;
    inheritEvents(pool, this, ['acquire', 'connection', 'enqueue', 'release']);
  }

  getConnection() {
    const corePool = this.pool;
    return new this.Promise((resolve, reject) => {
      corePool.getConnection((err, coreConnection) => {
        if (err) {
          reject(err);
        } else {
          resolve(new PromisePoolConnection(coreConnection, this.Promise));
        }
      });
    });
  }

  releaseConnection(connection) {
    if (connection instanceof PromisePoolConnection) connection.release();
  }

  query(sql, args) {
    const corePool = this.pool;
    const localErr = new Error();
    if (typeof args === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, localErr);
      if (args !== undefined) {
        corePool.query(sql, args, done);
      } else {
        corePool.query(sql, done);
      }
    });
  }

  execute(sql, args) {
    const corePool = this.pool;
    const localErr = new Error();
    if (typeof args === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, localErr);
      if (args) {
        corePool.execute(sql, args, done);
      } else {
        corePool.execute(sql, done);
      }
    });
  }

  end() {
    const corePool = this.pool;
    const localErr = new Error();
    return new this.Promise((resolve, reject) => {
      corePool.end((err) => {
        if (err) {
          localErr.message = err.message;
          localErr.code = err.code;
          localErr.errno = err.errno;
          localErr.sqlState = err.sqlState;
          localErr.sqlMessage = err.sqlMessage;
          reject(localErr);
        } else {
          resolve();
        }
      });
    });
  }
}

(function (functionsToWrap) {
  for (let i = 0; functionsToWrap && i < functionsToWrap.length; i++) {
    const func = functionsToWrap[i];

    if (
      typeof BasePool.prototype[func] === 'function' &&
      PromisePool.prototype[func] === undefined
    ) {
      PromisePool.prototype[func] = (function factory(funcName) {
        return function () {
          return BasePool.prototype[funcName].apply(this.pool, arguments);
        };
      })(func);
    }
  }
})([
  // synchronous functions
  'escape',
  'escapeId',
  'format',
]);

module.exports = PromisePool;
