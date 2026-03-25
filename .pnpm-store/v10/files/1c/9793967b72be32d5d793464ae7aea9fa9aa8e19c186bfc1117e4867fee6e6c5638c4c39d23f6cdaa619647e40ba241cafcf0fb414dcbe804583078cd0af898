'use strict';

const process = require('process');
const SqlString = require('sql-escaper');
const EventEmitter = require('events').EventEmitter;
const PoolConnection = require('../pool_connection.js');
const Queue = require('denque');
const BaseConnection = require('./connection.js');

function spliceConnection(queue, connection) {
  const len = queue.length;
  for (let i = 0; i < len; i++) {
    if (queue.get(i) === connection) {
      queue.removeOne(i);
      break;
    }
  }
}

class BasePool extends EventEmitter {
  constructor(options) {
    super();
    this.config = options.config;
    this.config.connectionConfig.pool = this;
    this._allConnections = new Queue();
    this._freeConnections = new Queue();
    this._connectionQueue = new Queue();
    this._closed = false;
    if (this.config.maxIdle < this.config.connectionLimit) {
      // create idle connection timeout automatically release job
      this._removeIdleTimeoutConnections();
    }
  }

  getConnection(cb) {
    if (this._closed) {
      return process.nextTick(() => cb(new Error('Pool is closed.')));
    }
    let connection;
    if (this._freeConnections.length > 0) {
      connection = this._freeConnections.pop();
      this.emit('acquire', connection);
      return process.nextTick(() => cb(null, connection));
    }
    if (
      this.config.connectionLimit === 0 ||
      this._allConnections.length < this.config.connectionLimit
    ) {
      connection = new PoolConnection(this, {
        config: this.config.connectionConfig,
      });
      this._allConnections.push(connection);
      return connection.connect((err) => {
        if (this._closed) {
          return cb(new Error('Pool is closed.'));
        }
        if (err) {
          return cb(err);
        }
        this.emit('connection', connection);
        this.emit('acquire', connection);
        return cb(null, connection);
      });
    }
    if (!this.config.waitForConnections) {
      return process.nextTick(() => cb(new Error('No connections available.')));
    }
    if (
      this.config.queueLimit &&
      this._connectionQueue.length >= this.config.queueLimit
    ) {
      return cb(new Error('Queue limit reached.'));
    }
    this.emit('enqueue');
    return this._connectionQueue.push(cb);
  }

  releaseConnection(connection) {
    let cb;
    if (!connection._pool) {
      // The connection has been removed from the pool and is no longer good.
      if (this._connectionQueue.length) {
        cb = this._connectionQueue.shift();
        process.nextTick(this.getConnection.bind(this, cb));
      }
    } else if (this._connectionQueue.length) {
      cb = this._connectionQueue.shift();
      process.nextTick(cb.bind(null, null, connection));
    } else {
      this._freeConnections.push(connection);
      this.emit('release', connection);
    }
  }

  end(cb) {
    this._closed = true;
    clearTimeout(this._removeIdleTimeoutConnectionsTimer);
    if (typeof cb !== 'function') {
      cb = function (err) {
        if (err) {
          throw err;
        }
      };
    }
    let calledBack = false;
    let closedConnections = 0;
    let connection;
    const endCB = function (err) {
      if (calledBack) {
        return;
      }
      if (err || ++closedConnections >= this._allConnections.length) {
        calledBack = true;
        cb(err);
        return;
      }
    }.bind(this);
    if (this._allConnections.length === 0) {
      endCB();
      return;
    }
    for (let i = 0; i < this._allConnections.length; i++) {
      connection = this._allConnections.get(i);
      connection._realEnd(endCB);
    }
  }

  query(sql, values, cb) {
    const cmdQuery = BaseConnection.createQuery(
      sql,
      values,
      cb,
      this.config.connectionConfig
    );
    if (typeof cmdQuery.namedPlaceholders === 'undefined') {
      cmdQuery.namedPlaceholders =
        this.config.connectionConfig.namedPlaceholders;
    }
    this.getConnection((err, conn) => {
      if (err) {
        if (typeof cmdQuery.onResult === 'function') {
          cmdQuery.onResult(err);
        } else {
          cmdQuery.emit('error', err);
        }
        return;
      }
      try {
        conn.query(cmdQuery).once('end', () => {
          conn.release();
        });
      } catch (e) {
        conn.release();
        throw e;
      }
    });
    return cmdQuery;
  }

  execute(sql, values, cb) {
    // TODO construct execute command first here and pass it to connection.execute
    // so that polymorphic arguments logic is there in one place
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
        return cb(e);
      }
    });
  }

  _removeConnection(connection) {
    // Remove connection from all connections
    spliceConnection(this._allConnections, connection);
    // Remove connection from free connections
    spliceConnection(this._freeConnections, connection);
    this.releaseConnection(connection);
  }

  _removeIdleTimeoutConnections() {
    if (this._removeIdleTimeoutConnectionsTimer) {
      clearTimeout(this._removeIdleTimeoutConnectionsTimer);
    }

    this._removeIdleTimeoutConnectionsTimer = setTimeout(() => {
      try {
        while (
          this._freeConnections.length > this.config.maxIdle ||
          (this._freeConnections.length > 0 &&
            Date.now() - this._freeConnections.get(0).lastActiveTime >
              this.config.idleTimeout)
        ) {
          if (this.config.connectionConfig.gracefulEnd) {
            this._freeConnections.get(0).end();
          } else {
            this._freeConnections.get(0).destroy();
          }
        }
      } finally {
        this._removeIdleTimeoutConnections();
      }
    }, 1000);
  }

  format(sql, values) {
    return SqlString.format(
      sql,
      values,
      this.config.connectionConfig.stringifyObjects,
      this.config.connectionConfig.timezone
    );
  }

  escape(value) {
    return SqlString.escape(
      value,
      this.config.connectionConfig.stringifyObjects,
      this.config.connectionConfig.timezone
    );
  }

  escapeId(value) {
    return SqlString.escapeId(value, false);
  }
}

module.exports = BasePool;
