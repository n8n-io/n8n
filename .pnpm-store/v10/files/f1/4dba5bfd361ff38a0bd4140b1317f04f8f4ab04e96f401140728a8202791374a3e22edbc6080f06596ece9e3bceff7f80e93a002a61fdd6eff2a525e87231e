'use strict';

const process = require('process');

const Pool = require('./pool.js');
const PoolConfig = require('./pool_config.js');
const Connection = require('./connection.js');
const EventEmitter = require('events').EventEmitter;

/**
 * Selector
 */
const makeSelector = {
  RR() {
    let index = 0;
    return (clusterIds) => clusterIds[index++ % clusterIds.length];
  },
  RANDOM() {
    return (clusterIds) =>
      clusterIds[Math.floor(Math.random() * clusterIds.length)];
  },
  ORDER() {
    return (clusterIds) => clusterIds[0];
  },
};

const getMonotonicMilliseconds = function () {
  let ms;

  if (typeof process.hrtime === 'function') {
    ms = process.hrtime();
    ms = ms[0] * 1e3 + ms[1] * 1e-6;
  } else {
    ms = process.uptime() * 1000;
  }

  return Math.floor(ms);
};

const patternRegExp = function (pattern) {
  if (pattern instanceof RegExp) {
    return pattern;
  }

  const source = pattern
    .replace(/([.+?^=!:${}()|[\]/\\])/g, '\\$1')
    .replace(/\*/g, '.*');

  return new RegExp(`^${source}$`);
};

class PoolNamespace {
  constructor(cluster, pattern, selector) {
    this._cluster = cluster;
    this._pattern = pattern;
    this._selector = makeSelector[selector]();
  }

  getConnection(cb) {
    const clusterNode = this._getClusterNode();
    if (clusterNode === null) {
      let err = new Error('Pool does Not exist.');
      err.code = 'POOL_NOEXIST';

      if (this._cluster._findNodeIds(this._pattern, true).length !== 0) {
        err = new Error('Pool does Not have online node.');
        err.code = 'POOL_NONEONLINE';
      }

      return cb(err);
    }
    return this._cluster._getConnection(clusterNode, (err, connection) => {
      if (err) {
        if (
          this._cluster._canRetry &&
          this._cluster._findNodeIds(this._pattern).length !== 0
        ) {
          this._cluster.emit('warn', err);
          return this.getConnection(cb);
        }

        return cb(err);
      }
      return cb(null, connection);
    });
  }

  /**
   * pool cluster query
   * @param {*} sql
   * @param {*} values
   * @param {*} cb
   * @returns query
   */
  query(sql, values, cb) {
    const query = Connection.createQuery(sql, values, cb, {});
    this.getConnection((err, conn) => {
      if (err) {
        if (typeof query.onResult === 'function') {
          query.onResult(err);
        } else {
          query.emit('error', err);
        }
        return;
      }
      try {
        conn.query(query).once('end', () => {
          conn.release();
        });
      } catch (e) {
        conn.release();
        throw e;
      }
    });
    return query;
  }

  /**
   * pool cluster execute
   * @param {*} sql
   * @param {*} values
   * @param {*} cb
   */
  execute(sql, values, cb) {
    if (typeof values === 'function') {
      cb = values;
      values = [];
    }
    this.getConnection((err, conn) => {
      if (err) {
        return cb(err);
      }
      try {
        conn.execute(sql, values, cb).once('end', () => {
          conn.release();
        });
      } catch (e) {
        conn.release();
        throw e;
      }
    });
  }

  _getClusterNode() {
    const foundNodeIds = this._cluster._findNodeIds(this._pattern);
    if (foundNodeIds.length === 0) {
      return null;
    }
    const nodeId =
      foundNodeIds.length === 1
        ? foundNodeIds[0]
        : this._selector(foundNodeIds);
    return this._cluster._getNode(nodeId);
  }
}

class PoolCluster extends EventEmitter {
  constructor(config) {
    super();
    config = config || {};
    this._canRetry =
      typeof config.canRetry === 'undefined' ? true : config.canRetry;
    this._removeNodeErrorCount = config.removeNodeErrorCount || 5;
    this._restoreNodeTimeout = config.restoreNodeTimeout || 0;
    this._defaultSelector = config.defaultSelector || 'RR';
    this._closed = false;
    this._lastId = 0;
    this._nodes = {};
    this._serviceableNodeIds = [];
    this._namespaces = {};
    this._findCaches = {};
  }

  of(pattern, selector) {
    pattern = pattern || '*';
    selector = selector || this._defaultSelector;
    selector = selector.toUpperCase();
    if (!makeSelector[selector] === 'undefined') {
      selector = this._defaultSelector;
    }
    const key = pattern + selector;
    if (typeof this._namespaces[key] === 'undefined') {
      this._namespaces[key] = new PoolNamespace(this, pattern, selector);
    }
    return this._namespaces[key];
  }

  add(id, config) {
    if (typeof id === 'object') {
      config = id;
      id = `CLUSTER::${++this._lastId}`;
    }
    if (typeof this._nodes[id] === 'undefined') {
      this._nodes[id] = {
        id: id,
        errorCount: 0,
        pool: new Pool({ config: new PoolConfig(config) }),
        _offlineUntil: 0,
      };
      this._serviceableNodeIds.push(id);
      this._clearFindCaches();
    }
  }

  remove(pattern) {
    const foundNodeIds = this._findNodeIds(pattern, true);

    for (let i = 0; i < foundNodeIds.length; i++) {
      const node = this._getNode(foundNodeIds[i]);

      if (node) {
        this._removeNode(node);
      }
    }
  }

  getConnection(pattern, selector, cb) {
    let namespace;
    if (typeof pattern === 'function') {
      cb = pattern;
      namespace = this.of();
    } else {
      if (typeof selector === 'function') {
        cb = selector;
        selector = this._defaultSelector;
      }
      namespace = this.of(pattern, selector);
    }
    namespace.getConnection(cb);
  }

  end(callback) {
    const cb =
      callback !== undefined
        ? callback
        : (err) => {
            if (err) {
              throw err;
            }
          };
    if (this._closed) {
      process.nextTick(cb);
      return;
    }

    this._closed = true;

    let calledBack = false;
    let waitingClose = 0;
    const onEnd = (err) => {
      if (!calledBack && (err || --waitingClose <= 0)) {
        calledBack = true;
        return cb(err);
      }
    };

    for (const id in this._nodes) {
      waitingClose++;
      this._nodes[id].pool.end(onEnd);
    }

    if (waitingClose === 0) {
      process.nextTick(onEnd);
    }
  }

  _findNodeIds(pattern, includeOffline) {
    let currentTime = 0;
    let foundNodeIds = this._findCaches[pattern];

    if (foundNodeIds === undefined) {
      const expression = patternRegExp(pattern);

      foundNodeIds = this._serviceableNodeIds.filter((id) =>
        id.match(expression)
      );
    }

    this._findCaches[pattern] = foundNodeIds;

    if (includeOffline) {
      return foundNodeIds;
    }

    return foundNodeIds.filter((nodeId) => {
      const node = this._getNode(nodeId);

      if (!node._offlineUntil) {
        return true;
      }

      if (!currentTime) {
        currentTime = getMonotonicMilliseconds();
      }

      return node._offlineUntil <= currentTime;
    });
  }

  _getNode(id) {
    return this._nodes[id] || null;
  }

  _increaseErrorCount(node) {
    const errorCount = ++node.errorCount;

    if (this._removeNodeErrorCount > errorCount) {
      return;
    }

    if (this._restoreNodeTimeout > 0) {
      node._offlineUntil =
        getMonotonicMilliseconds() + this._restoreNodeTimeout;
      this.emit('offline', node.id);
      return;
    }

    this._removeNode(node);
    this.emit('remove', node.id);
  }

  _decreaseErrorCount(node) {
    let errorCount = node.errorCount;

    if (errorCount > this._removeNodeErrorCount) {
      errorCount = this._removeNodeErrorCount;
    }

    if (errorCount < 1) {
      errorCount = 1;
    }

    node.errorCount = errorCount - 1;

    if (node._offlineUntil) {
      node._offlineUntil = 0;
      this.emit('online', node.id);
    }
  }

  _getConnection(node, cb) {
    node.pool.getConnection((err, connection) => {
      if (err) {
        this._increaseErrorCount(node);
        return cb(err);
      }
      this._decreaseErrorCount(node);

      connection._clusterId = node.id;
      return cb(null, connection);
    });
  }

  _removeNode(node) {
    const index = this._serviceableNodeIds.indexOf(node.id);
    if (index !== -1) {
      this._serviceableNodeIds.splice(index, 1);
      delete this._nodes[node.id];
      this._clearFindCaches();
      node.pool.end();
    }
  }

  _clearFindCaches() {
    this._findCaches = {};
  }
}

module.exports = PoolCluster;
