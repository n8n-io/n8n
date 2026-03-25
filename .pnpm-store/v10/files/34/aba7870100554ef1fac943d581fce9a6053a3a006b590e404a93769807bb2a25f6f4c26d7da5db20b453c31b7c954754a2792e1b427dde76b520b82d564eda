'use strict';

const BaseConnection = require('./connection.js');

class BasePoolConnection extends BaseConnection {
  constructor(pool, options) {
    super(options);
    this._pool = pool;
    // The last active time of this connection
    this.lastActiveTime = Date.now();
    // When a fatal error occurs the connection's protocol ends, which will cause
    // the connection to end as well, thus we only need to watch for the end event
    // and we will be notified of disconnects.
    // REVIEW: Moved to `once`
    this.once('end', () => {
      this._removeFromPool();
    });
    this.once('error', () => {
      this._removeFromPool();
    });
  }

  release() {
    if (!this._pool || this._pool._closed) {
      return;
    }
    // update last active time
    this.lastActiveTime = Date.now();
    this._pool.releaseConnection(this);
  }

  end() {
    if (this.config.gracefulEnd) {
      this._removeFromPool();
      super.end();

      return;
    }

    const err = new Error(
      'Calling conn.end() to release a pooled connection is ' +
        'deprecated. In next version calling conn.end() will be ' +
        'restored to default conn.end() behavior. Use ' +
        'conn.release() instead.'
    );
    this.emit('warn', err);
    console.warn(err.message);
    this.release();
  }

  destroy() {
    this._removeFromPool();
    super.destroy();
  }

  _removeFromPool() {
    if (!this._pool || this._pool._closed) {
      return;
    }
    const pool = this._pool;
    this._pool = null;
    pool._removeConnection(this);
  }
}

BasePoolConnection.statementKey = BaseConnection.statementKey;
module.exports = BasePoolConnection;

// TODO: Remove this when we are removing PoolConnection#end
BasePoolConnection.prototype._realEnd = BaseConnection.prototype.end;
