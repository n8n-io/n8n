// Copyright (c) 2022, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const PoolImpl = require('../impl/pool.js');
const ThinConnectionImpl = require('./connection.js');
const protocolUtil = require('./protocol/utils.js');
const errors = require('../errors.js');
const settings = require('../settings.js');
const util = require('../util.js');
const thinUtil = require('./util.js');
const {getConnectionInfo} = require('./sqlnet/networkSession.js');
const crypto = require('crypto');
const Timers = require('timers');

class ThinPoolImpl extends PoolImpl {

  _init(params) {
    if (!params.homogeneous) {
      errors.throwErr(errors.ERR_NOT_IMPLEMENTED, 'Heterogeneous Pooling');
    }
    if (!params.connectString) {
      errors.throwErr(errors.ERR_EMPTY_CONNECT_STRING);
    }
    thinUtil.checkCredentials(params);

    this._availableObjects = [];
    this._name = 'node-thin';
    this._poolMin = params.poolMin;
    this._poolMax = params.poolMax;
    this._poolIncrement = params.poolIncrement;
    this._poolTimeout = params.poolTimeout;
    this._poolPingInterval = params.poolPingInterval;
    this._poolPingTimeout = params.poolPingTimeout;
    this._maxLifetimeSession = params.maxLifetimeSession || 0;
    this._stmtCacheSize = params.stmtCacheSize;

    // The user Config filterd from common layer is cached except
    // sensitive data as sensitive data is obfuscated in the pool
    // and de-obfuscated as necessary.
    this._userConfig = params;
    this._freeConnectionList = [];
    this._usedConnectionList = new Set();
    this._password = params.password;
    this._walletPassword = params.walletPassword;
    this._walletContent = params.walletContent;
    this._obfuscatedPassword = [];
    this._obfuscatedWalletPassword = [];
    this._token = params.token;
    this._obfuscatedToken = [];
    this._privateKey = params.privateKey;
    this._obfuscatedPrivateKey = [];
    this._schedulerJob = null;
    this._poolCloseWaiter = null;
    this._pendingRequests = [];
    this._connsToDrop = [];
    this._bgCleaner = null;
    this._poolCloseCleaner = null;

    // password obfuscation
    if (this._password !== undefined) {
      const obj = protocolUtil.setObfuscatedValue(this._password);
      this._password = obj.value;
      this._obfuscatedPassword = obj.obfuscatedValue;
      this._userConfig.password = null;
    }
    // wallet password obfuscation
    if (this._walletPassword !== undefined) {
      const obj = protocolUtil.setObfuscatedValue(this._walletPassword);
      this._walletPassword = obj.value;
      this._obfuscatedWalletPassword = obj.obfuscatedValue;
      this._userConfig.walletPassword = null;
    }
    // wallet content obfuscation
    if (this._walletContent !== undefined) {
      const obj = protocolUtil.setObfuscatedValue(this._walletContent);
      this._walletContent = obj.value;
      this._obfuscatedWalletContent = obj.obfuscatedValue;
      this._userConfig.walletConent = null;
    }
    // token obfuscation
    if (this._token !== undefined) {
      const obj = protocolUtil.setObfuscatedValue(this._token);
      this._token = obj.value;
      this._obfuscatedToken = obj.obfuscatedValue;
      this._userConfig.token = null;
    }
    // privateKey obfuscation
    if (this._privateKey !== undefined) {
      const obj = protocolUtil.setObfuscatedValue(this._privateKey);
      this._privateKey = obj.value;
      this._obfuscatedPrivateKey = obj.obfuscatedValue;
      this._userConfig.privateKey = null;
    }
    this._accessTokenFn = params.accessTokenFn;
    this._accessTokenConfig = params.accessTokenConfig;
    this._isDRCPEnabled = false;
    this._implicitPool = null;
  }

  //---------------------------------------------------------------------------
  // create pool with specified parameters and miminum number of connections as
  // specified by poolMin
  //---------------------------------------------------------------------------
  async create(params) {
    this._init(params);
    this._userConfig._connInfo =
      await getConnectionInfo(params);
    this._isDRCPEnabled =
      String(this._userConfig._connInfo[0]).toLowerCase() === 'pooled';
    // generate connection class when none is provided by user
    if (this._isDRCPEnabled && settings.connectionClass === '') {
      this._generateConnectionClass();
    }

    // create a background task. It will create minimum connections in the pool
    // and expand the pool as required.
    this.bgThreadFunc();
    // create a background task to remove connections that are to in
    // _connsToDrop, reason for dropping may be poolTimeout or poolMax decrease
    this._bgConnCleaner();
  }

  //---------------------------------------------------------------------------
  // set new token and private key in pool
  //---------------------------------------------------------------------------
  setAccessToken(params) {
    if (params.token) {
      this._token = params.token;
      const objToken = protocolUtil.setObfuscatedValue(this._token);
      this._token = objToken.value;
      this._obfuscatedToken = objToken.obfuscatedValue;
    }
    if (params.privateKey) {
      this._privateKey = params.privateKey;
      const objKey = protocolUtil.setObfuscatedValue(this._privateKey);
      this._privateKey = objKey.value;
      this._obfuscatedPrivateKey = objKey.obfuscatedValue;
    }
  }

  //---------------------------------------------------------------------------
  // credentials are obfuscated and stored in an object(userConfig) during
  // pool creation. _getConnAttrs() method is used to deobfuscate encrypted
  // credentials for creating new connections
  //---------------------------------------------------------------------------
  async _getConnAttrs() {
    let accessToken;
    const clonedAttrs = Object.assign({}, this._userConfig);
    // deobfuscate password
    if (clonedAttrs.password === null) {
      clonedAttrs.password = protocolUtil.getDeobfuscatedValue(this._password,
        this._obfuscatedPassword);
    }

    // deobfuscate wallet password
    if (clonedAttrs.walletPassword === null) {
      clonedAttrs.walletPassword =
        protocolUtil.getDeobfuscatedValue(this._walletPassword,
          this._obfuscatedWalletPassword);
    }

    // deobfuscate wallet content
    if (clonedAttrs.walletContent === null) {
      clonedAttrs.walletContent =
            protocolUtil.getDeobfuscatedValue(this._walletContent,
              this._obfuscatedWalletContent);
    }

    // deobfuscate token and private key
    // check for token expiry
    if (clonedAttrs.token === null) {
      clonedAttrs.token =
        protocolUtil.getDeobfuscatedValue(this._token, this._obfuscatedToken);
      if (util.isTokenExpired(clonedAttrs.token)) {
        if (typeof this._accessTokenFn === 'function') {
          try {
            accessToken = await this._accessTokenFn(true, this._accessTokenConfig);
          } catch (error) {
            errors.throwWrapErr(error, errors.ERR_ACCESS_TOKEN);
          }
          if (typeof accessToken === 'string') {
            clonedAttrs.token = accessToken;
            if (util.isTokenExpired(clonedAttrs.token)) {
              // OAuth2 token is expired
              errors.throwErr(errors.ERR_TOKEN_HAS_EXPIRED);
            } else {
              // update pool with OAuth2 token
              const obj = protocolUtil.setObfuscatedValue(clonedAttrs.token);
              this._token = obj.value;
              this._obfuscatedToken = obj.obfuscatedValue;
            }
          } else if (typeof accessToken === 'object') {
            clonedAttrs.token = accessToken.token;
            clonedAttrs.privateKey = util.denormalizePrivateKey(accessToken.privateKey);
            if (util.isTokenExpired(clonedAttrs.token)) {
              // IAM token is expired
              errors.throwErr(errors.ERR_TOKEN_HAS_EXPIRED);
            } else {
              // update pool with IAM token and private key
              const objToken = protocolUtil.setObfuscatedValue(clonedAttrs.token);
              this._token = objToken.value;
              this._obfuscatedToken = objToken.obfuscatedValue;
              const objKey = protocolUtil.setObfuscatedValue(clonedAttrs.privateKey);
              this._privateKey = objKey.value;
              this._obfuscatedPrivateKey = objKey.obfuscatedValue;
            }
          }
        } else {
          errors.throwErr(errors.ERR_TOKEN_HAS_EXPIRED);
        }
      }
    }
    if (clonedAttrs.privateKey === null) {
      clonedAttrs.privateKey =
        protocolUtil.getDeobfuscatedValue(this._privateKey,
          this._obfuscatedPrivateKey);
    }
    return clonedAttrs;
  }

  //---------------------------------------------------------------------------
  // return available connection if present in pool else
  // create new connection and return it
  //---------------------------------------------------------------------------
  async getConnection() {
    return await this.acquire();
  }

  //---------------------------------------------------------------------------
  // destroy connection when pool close operation is called
  //---------------------------------------------------------------------------
  async _destroy(connection) {
    try {
      if (connection.nscon.ntAdapter.connected) {
        connection._dropSess = true;
        await connection.close();
      }
    } catch (err) {
      return;
    }
  }

  //---------------------------------------------------------------------------
  // close pool by destroying available connections
  //---------------------------------------------------------------------------
  async close() {

    // wait till background task for pool expansion is finished; if it is not
    // currently running, wake it up!
    await new Promise((resolve) => {
      this._poolCloseWaiter = resolve;
      if (this.bgWaiter) {
        this.bgWaiter();
      }
    });

    // clear scheduled job
    if (this._schedulerJob) {
      clearTimeout(this._schedulerJob);
      this._schedulerJob = null;
    }

    // destroy all free connections
    for (const conn of this._freeConnectionList) {
      await this._destroy(conn);
    }

    // destroy all used connections
    for (const conn of this._usedConnectionList) {
      await this._destroy(conn);
    }

    // Let the bgCleaner destroy all connsToDrop and stop
    await new Promise((resolve) => {
      this._poolCloseCleaner = resolve;
      if (this._bgCleaner)
        this._bgCleaner();
    });
  }

  //---------------------------------------------------------------------------
  // returns poolMax from configuration
  //---------------------------------------------------------------------------
  getPoolMax() {
    return this._poolMax;
  }

  //---------------------------------------------------------------------------
  // returns poolMin from configuration
  //---------------------------------------------------------------------------
  getPoolMin() {
    return this._poolMin;
  }

  //---------------------------------------------------------------------------
  // get number of used connection
  //---------------------------------------------------------------------------
  getConnectionsInUse() {
    return this._usedConnectionList.size;
  }

  //---------------------------------------------------------------------------
  // get number of free connection
  //---------------------------------------------------------------------------
  getConnectionsOpen() {
    return this._freeConnectionList.length + this._usedConnectionList.size;
  }

  //---------------------------------------------------------------------------
  // returns poolIncrement from configuration
  //---------------------------------------------------------------------------
  getPoolIncrement() {
    return this._poolIncrement;
  }

  //---------------------------------------------------------------------------
  // returns maximum number of connections allowed per shard in the pool
  //---------------------------------------------------------------------------
  getPoolMaxPerShard() {
    return;
  }

  //---------------------------------------------------------------------------
  // returns the pool ping interval (seconds)
  //---------------------------------------------------------------------------
  getPoolPingInterval() {
    return this._poolPingInterval;
  }

  //---------------------------------------------------------------------------
  // returns the pool ping Timeout (milliseconds)
  //---------------------------------------------------------------------------
  getPoolPingTimeout() {
    return this._poolPingTimeout;
  }

  //---------------------------------------------------------------------------
  // returns the pool timeout
  //---------------------------------------------------------------------------
  getPoolTimeout() {
    return this._poolTimeout;
  }

  //---------------------------------------------------------------------------
  // returns the pool max lifetime for a session  (seconds)
  //---------------------------------------------------------------------------
  getMaxLifetimeSession() {
    return this._maxLifetimeSession;
  }

  //---------------------------------------------------------------------------
  // returns whether the SODA metadata cache is enabled or not
  //---------------------------------------------------------------------------
  getSodaMetaDataCache() {
    return;
  }

  //---------------------------------------------------------------------------
  // returns the statement cache size associate with the pool
  //---------------------------------------------------------------------------
  getStmtCacheSize() {
    return this._stmtCacheSize;
  }

  //---------------------------------------------------------------------------
  // _setScheduler()
  //
  // set scheduler to scan and remove idle connections
  //---------------------------------------------------------------------------
  _setScheduler() {
    if (!this._schedulerJob && this._poolTimeout > 0 &&
        this._freeConnectionList.length > 0 &&
        (this._freeConnectionList.length + this._usedConnectionList.size >
        this._poolMin)) {
      this._schedulerJob = setTimeout(() => {
        this._scanIdleConnection();
      }, this._poolTimeout * 1000);
    }
  }

  //---------------------------------------------------------------------------
  // scanIdleConnection()
  //
  // scan connection list and removes idle connections from pool
  //---------------------------------------------------------------------------
  _scanIdleConnection() {
    while ((this._usedConnectionList.size + this._freeConnectionList.length) >
        this._poolMin && this._freeConnectionList.length > 0) {
      const conn = this._freeConnectionList[0];
      if (Date.now() - conn._lastTimeUsed < this._poolTimeout * 1000) {
        break;
      }

      this._connsToDrop.push(conn);
      this._freeConnectionList.shift();
    }

    // call cleaner for destroying connections added to _connsToDrop
    if (this._bgCleaner)
      this._bgCleaner();
    this._schedulerJob = null;
    this._setScheduler();
  }

  //---------------------------------------------------------------------------
  // _getNumConnsToCreate()
  //
  // get number of connections need to be created
  //---------------------------------------------------------------------------
  _getNumConnsToCreate() {
    const usedConns = this._freeConnectionList.length + this._usedConnectionList.size;
    // less connections in the pool than poolMin? restore to poolMin
    if (usedConns < this._poolMin) {
      return this._poolMin - usedConns;
    // connections need to be created? create up to poolIncrement without exceeding poolMax
    } else if (this._pendingRequests.length > 0) {
      return Math.min(this._poolIncrement, this._poolMax - usedConns);
    // no pending requests and we are already at poolMin so nothing to do!
    } else {
      return 0;
    }
  }

  //---------------------------------------------------------------------------
  // bgThreadFunc()
  //
  // method which runs in a background thread and is used to create connections.
  // When first started, it creates poolMin connections. After that, it creates
  // poolIncrement connections up to the value of poolMax when needed.
  // The thread terminates automatically when the pool is closed.
  //---------------------------------------------------------------------------
  async bgThreadFunc() {

    // continue until a close request is received
    while (!this._poolCloseWaiter) {

      const numToCreate = this._getNumConnsToCreate();
      // connection creation is going on serially and not concurrently
      for (let i = 0; i < numToCreate; i++) {
        try {
          // get deobfuscated value
          const config = await this._getConnAttrs();
          const conn = new ThinConnectionImpl();
          conn._pool = this;
          await conn.connect(config);
          conn._newSession = true;
          conn._dropSess = false;
          conn._creationTime = Date.now();
          conn._lastTimeUsed = Date.now();
          this._freeConnectionList.push(conn);
        } catch (err) {
          this._bgErr = err;
        }

        if (this._poolIncrement > 1 && (this._poolMax - this._usedConnectionList.size
            - this._freeConnectionList.length) > 1) {
          this._setScheduler();
        }

        // resolve pending request
        if (this._pendingRequests.length > 0) {
          const payload = this._pendingRequests.shift();
          payload.resolve();
        }

        // give an opportunity for other "threads" to do their work.
        await new Promise((resolve) => Timers.setImmediate(resolve));

        // break loop when pool is closing
        if (this._poolCloseWaiter) {
          break;
        }
      }

      // when pool is closing, break from while loop
      if (this._poolCloseWaiter) {
        break;
      }

      // if no pending requests, wait for pending requests to appear!
      if ((this._pendingRequests.length == 0 || this._bgErr) &&
        this.getConnectionsOpen() >= this._poolMin) {
        await new Promise((resolve) => {
          this.bgWaiter = resolve;
        });
        this.bgWaiter = null;
      }
    }

    // notify the closer that the close can actually take place
    this._poolCloseWaiter();
  }

  //---------------------------------------------------------------------------
  // _bgConnCleaner()
  // Method which stays in the stack and performs cleanup whenever a connection
  // gets added for cleanup to _connsToDrop
  // acquire a connection from connection pool
  //---------------------------------------------------------------------------
  async _bgConnCleaner() {
    // run until a pool.close() is issued
    while (!this._poolCloseCleaner) {

      // wait for _bgCleaner to be called for cleanup
      if (this._connsToDrop.length == 0)
        await new Promise(resolve => this._bgCleaner = resolve);

      // destroy connections in _connsToDrop
      while (this._connsToDrop.length)
        await this._destroy(this._connsToDrop.pop());
    }
    this._poolCloseCleaner();
  }

  //---------------------------------------------------------------------------
  // acquire()
  //
  // acquire a connection from connection pool
  //---------------------------------------------------------------------------
  async acquire() {

    // return first connection from the free list that passes health checks
    while (this._freeConnectionList.length > 0) {
      const conn = this._freeConnectionList.pop();

      // drop from the pool if the connection is unhealthy, or if the
      // connection's lifetime exceeds maxLifetimeSession
      if (!this._shouldRetainInPool(conn)) {
        this._invokeBgCleaner(conn);
        continue;
      }

      // perform a ping, if necessary; a ping interval less than 0 disables
      // pings; a ping interval of 0 forces a ping for each use of the
      // connection and a value greater than 0 will be performed if the
      // connection has not been used for that period of time; if the ping is
      // unsuccessful, drop the connection from the pool
      let requiresPing = false;
      if (this._poolPingInterval === 0) {
        requiresPing = true;
      } else if (this._poolPingInterval > 0) {
        const elapsed = Date.now() - conn._lastTimeUsed;
        if (elapsed > this._poolPingInterval * 1000)
          requiresPing = true;
      }
      if (requiresPing) {
        let pingTimer;
        try {
          if (this._poolPingTimeout) {
            pingTimer = setTimeout(() => {
              // force disconnect causes ping task to unblock
              // and return.
              conn.nscon.forceDisconnect();
            }, this._poolPingTimeout);
          }
          await conn.ping();
        } catch {
          conn.nscon.forceDisconnect();
          continue;
        } finally {
          clearTimeout(pingTimer);
        }
      }

      // connection has passed health checks, return it immediately
      this._usedConnectionList.add(conn);
      return conn;

    }

    // no free connections exist at this point; if less than poolMin
    // connections exist, grow the pool to poolMin again; otherwise, increase
    // the pool by poolIncrement up to poolMax. We are deferring this
    // to the background thread function!
    await new Promise((resolve) => {
      this._pendingRequests.push({resolve: resolve});
      if (this.bgWaiter) {
        // this wakes up the function to do some more work
        this.bgWaiter();
      }
    });

    if (this._bgErr) {
      const err = this._bgErr;
      this._bgErr = null;

      // if an error has occurred in the background thread we clear it and then,
      // if there are more pending requests we request the background thread
      // function to try again.
      if (this._pendingRequests.length > 0 && this.bgWaiter) {
        this.bgWaiter();
      }
      throw err;
    }
    // return a connection from the ones that were just built
    const conn = this._freeConnectionList.pop();
    this._usedConnectionList.add(conn);
    return conn;
  }

  // release connection to connection pool
  release(conn) {
    conn.warning = undefined;
    this._usedConnectionList.delete(conn);
    if (conn.nscon.connected) {
      conn._lastTimeUsed = Date.now();
      conn._newSession = false;
      if ((this.getConnectionsOpen() < this._poolMax) &&
          this._shouldRetainInPool(conn)) {
        this._freeConnectionList.push(conn);
      } else {
        this._invokeBgCleaner(conn);
      }
    }

    this._setScheduler();
  }

  //---------------------------------------------------------------------------
  // _generateConnectionClass()
  //
  // generate connection class for drcp if none is provided by user
  //---------------------------------------------------------------------------
  _generateConnectionClass() {
    this._userConfig.connectionClass = crypto.randomBytes(16).toString('base64');
    this._userConfig.connectionClass = "NJS:" + this._userConfig.connectionClass;
  }

  //---------------------------------------------------------------------------
  // reconfigure()
  //
  // Reconfigures the pool with new parameters
  //---------------------------------------------------------------------------
  reconfigure(params) {
    if (params.poolIncrement !== undefined) {
      this._poolIncrement = params.poolIncrement;
    }

    if (params.poolTimeout !== undefined &&
      this._poolTimeout !== params.poolTimeout) {
      this._poolTimeout = params.poolTimeout;
      // clear scheduled job
      if (this._schedulerJob) {
        clearTimeout(this._schedulerJob);
        this._schedulerJob = null;
      }
    }

    if (params.poolPingInterval !== undefined) {
      this._poolPingInterval = params.poolPingInterval;
    }

    if (params.stmtCacheSize !== undefined) {
      this._stmtCacheSize = params.stmtCacheSize;
    }

    if (params.poolMax !== undefined) {
      this._poolMax = params.poolMax;
    }

    if (params.poolMin !== undefined) {
      this._poolMin = params.poolMin;
    }

    if (params.maxLifetimeSession !== undefined) {
      this._maxLifetimeSession = params.maxLifetimeSession;
    }

    let numToDestroy = this.getConnectionsOpen() - this._poolMax;
    while (this._freeConnectionList.length && numToDestroy > 0) {
      const conn = this._freeConnectionList.pop();
      this._connsToDrop.push(conn);
      numToDestroy--;
    }

    // call cleanup for destroying connections in _connsToDrop
    if (this._bgCleaner)
      this._bgCleaner();
  }

  //---------------------------------------------------------------------------
  // _invokeBgCleaner()
  //
  // drop conn and invoke the bgCleaner while also ensuring min connections
  //---------------------------------------------------------------------------
  _invokeBgCleaner(conn) {
    this._connsToDrop.push(conn);
    if (this._bgCleaner)
      this._bgCleaner();

    // ensure min connections are maintained in pool
    if ((this.getConnectionsOpen() < this._poolMin) && this.bgWaiter)
      this.bgWaiter();
  }

  //---------------------------------------------------------------------------
  // _shouldRetainInPool()
  //
  // returns true if the connection should be retained in pool
  //---------------------------------------------------------------------------
  _shouldRetainInPool(conn) {
    if (!conn.isHealthy())
      return false;
    // check if maxLifetimeSession of conn has expired
    if (this._maxLifetimeSession !== 0) {
      if ((Date.now() - conn._creationTime) > (this._maxLifetimeSession * 1000))
        return false;
    }
    return true;
  }
}

module.exports = ThinPoolImpl;
