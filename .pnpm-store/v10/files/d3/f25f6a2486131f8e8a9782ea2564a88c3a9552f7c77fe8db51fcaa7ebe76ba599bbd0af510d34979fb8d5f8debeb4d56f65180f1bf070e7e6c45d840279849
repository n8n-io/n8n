'use strict';

const SqlString = require('sql-escaper');
const EventEmitter = require('events').EventEmitter;
const parserCache = require('./lib/parsers/parser_cache.js');
const PoolCluster = require('./lib/pool_cluster.js');
const createConnection = require('./lib/create_connection.js');
const createPool = require('./lib/create_pool.js');
const createPoolCluster = require('./lib/create_pool_cluster.js');
const PromiseConnection = require('./lib/promise/connection.js');
const PromisePool = require('./lib/promise/pool.js');
const makeDoneCb = require('./lib/promise/make_done_cb.js');
const PromisePoolConnection = require('./lib/promise/pool_connection.js');
const inheritEvents = require('./lib/promise/inherit_events.js');
const PromisePoolNamespace = require('./lib/promise/pool_cluster');

function createConnectionPromise(opts) {
  const coreConnection = createConnection(opts);
  const createConnectionErr = new Error();
  const thePromise = opts.Promise || Promise;
  if (!thePromise) {
    throw new Error(
      'no Promise implementation available.' +
        'Use promise-enabled node version or pass userland Promise' +
        " implementation as parameter, for example: { Promise: require('bluebird') }"
    );
  }
  return new thePromise((resolve, reject) => {
    coreConnection.once('connect', () => {
      resolve(new PromiseConnection(coreConnection, thePromise));
    });
    coreConnection.once('error', (err) => {
      createConnectionErr.message = err.message;
      createConnectionErr.code = err.code;
      createConnectionErr.errno = err.errno;
      createConnectionErr.sqlState = err.sqlState;
      reject(createConnectionErr);
    });
  });
}

// note: the callback of "changeUser" is not called on success
// hence there is no possibility to call "resolve"

function createPromisePool(opts) {
  const corePool = createPool(opts);
  const thePromise = opts.Promise || Promise;
  if (!thePromise) {
    throw new Error(
      'no Promise implementation available.' +
        'Use promise-enabled node version or pass userland Promise' +
        " implementation as parameter, for example: { Promise: require('bluebird') }"
    );
  }

  return new PromisePool(corePool, thePromise);
}

class PromisePoolCluster extends EventEmitter {
  constructor(poolCluster, thePromise) {
    super();
    this.poolCluster = poolCluster;
    this.Promise = thePromise || Promise;
    inheritEvents(poolCluster, this, ['warn', 'remove', 'online', 'offline']);
  }

  getConnection(pattern, selector) {
    const corePoolCluster = this.poolCluster;
    return new this.Promise((resolve, reject) => {
      corePoolCluster.getConnection(
        pattern,
        selector,
        (err, coreConnection) => {
          if (err) {
            reject(err);
          } else {
            resolve(new PromisePoolConnection(coreConnection, this.Promise));
          }
        }
      );
    });
  }

  query(sql, args) {
    const corePoolCluster = this.poolCluster;
    const localErr = new Error();
    if (typeof args === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, localErr);
      corePoolCluster.query(sql, args, done);
    });
  }

  execute(sql, args) {
    const corePoolCluster = this.poolCluster;
    const localErr = new Error();
    if (typeof args === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, localErr);
      corePoolCluster.execute(sql, args, done);
    });
  }

  of(pattern, selector) {
    return new PromisePoolNamespace(
      this.poolCluster.of(pattern, selector),
      this.Promise
    );
  }

  end() {
    const corePoolCluster = this.poolCluster;
    const localErr = new Error();
    return new this.Promise((resolve, reject) => {
      corePoolCluster.end((err) => {
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

/**
 * proxy poolCluster synchronous functions
 */
(function (functionsToWrap) {
  for (let i = 0; functionsToWrap && i < functionsToWrap.length; i++) {
    const func = functionsToWrap[i];

    if (
      typeof PoolCluster.prototype[func] === 'function' &&
      PromisePoolCluster.prototype[func] === undefined
    ) {
      PromisePoolCluster.prototype[func] = (function factory(funcName) {
        return function () {
          return PoolCluster.prototype[funcName].apply(
            this.poolCluster,
            arguments
          );
        };
      })(func);
    }
  }
})(['add', 'remove']);

function createPromisePoolCluster(opts) {
  const corePoolCluster = createPoolCluster(opts);
  const thePromise = (opts && opts.Promise) || Promise;
  if (!thePromise) {
    throw new Error(
      'no Promise implementation available.' +
        'Use promise-enabled node version or pass userland Promise' +
        " implementation as parameter, for example: { Promise: require('bluebird') }"
    );
  }
  return new PromisePoolCluster(corePoolCluster, thePromise);
}

exports.createConnection = createConnectionPromise;
exports.createPool = createPromisePool;
exports.createPoolCluster = createPromisePoolCluster;
exports.escape = SqlString.escape;
exports.escapeId = SqlString.escapeId;
exports.format = SqlString.format;
exports.raw = SqlString.raw;
exports.PromisePool = PromisePool;
exports.PromiseConnection = PromiseConnection;
exports.PromisePoolConnection = PromisePoolConnection;

exports.__defineGetter__('Types', () => require('./lib/constants/types.js'));

exports.__defineGetter__('Charsets', () =>
  require('./lib/constants/charsets.js')
);

exports.__defineGetter__('CharsetToEncoding', () =>
  require('./lib/constants/charset_encodings.js')
);

exports.setMaxParserCache = function (max) {
  parserCache.setMaxCache(max);
};

exports.clearParserCache = function () {
  parserCache.clearCache();
};
