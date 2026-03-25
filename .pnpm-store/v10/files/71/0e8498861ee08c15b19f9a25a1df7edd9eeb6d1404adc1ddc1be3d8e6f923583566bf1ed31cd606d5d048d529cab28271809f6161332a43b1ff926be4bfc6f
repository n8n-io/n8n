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

const errors = require('../errors.js');
const nodbUtil = require('../util.js');

class PoolImpl {

  //---------------------------------------------------------------------------
  // _accessTokenHandler()
  //
  // Access token handler callback function which wraps the user callback and
  // returns the token to the implementation.
  //---------------------------------------------------------------------------
  async _accessTokenHandler(userFn, externalObj, refresh, accessTokenConfig) {
    let accessToken;
    try {
      let result = userFn(refresh, accessTokenConfig);
      if (result instanceof Promise) {
        result = await result;
      }

      if (!nodbUtil.isTokenValid(result)) {
        errors.throwErr(errors.ERR_TOKEN_HAS_EXPIRED);
      }
      if (typeof result === 'object' && result.privateKey !== undefined) {
        result.privateKey = nodbUtil.denormalizePrivateKey(result.privateKey);
      }
      accessToken = result;
    } finally {
      this.returnAccessToken(externalObj, accessToken);
    }
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the pool.
  //---------------------------------------------------------------------------
  close() {
    errors.throwNotImplemented("closing the pool");
  }

  //---------------------------------------------------------------------------
  // create()
  //
  // Creates the pool and makes it available for use.
  //---------------------------------------------------------------------------
  create() {
    errors.throwNotImplemented("creating the pool");
  }

  //---------------------------------------------------------------------------
  // getConnection()
  //
  // Returns a connection from the pool.
  //---------------------------------------------------------------------------
  getConnection() {
    errors.throwNotImplemented("getting a connection from the pool");
  }

  //---------------------------------------------------------------------------
  // getConnectionsInUse()
  //
  // Returns the number of connections in use in the pool.
  //---------------------------------------------------------------------------
  getConnectionsInUse() {
    errors.throwNotImplemented("getting num connection in use");
  }

  //---------------------------------------------------------------------------
  // getConnectionsOpen()
  //
  // Returns the number of connections opened by the pool.
  //---------------------------------------------------------------------------
  getConnectionsOpen() {
    errors.throwNotImplemented("getting num connection open");
  }

  //---------------------------------------------------------------------------
  // getPoolIncrement()
  //
  // Returns the number of connections to create when the pool needs to grow.
  //---------------------------------------------------------------------------
  getPoolIncrement() {
    errors.throwNotImplemented("getting the pool increment");
  }

  //---------------------------------------------------------------------------
  // getPoolMax()
  //
  // Returns the maximum number of connections allowed in the pool.
  //---------------------------------------------------------------------------
  getPoolMax() {
    errors.throwNotImplemented("getting the pool max");
  }

  //---------------------------------------------------------------------------
  // getPoolMaxPerShard()
  //
  // Returns the maximum number of connections allowed per shard in the pool.
  //---------------------------------------------------------------------------
  getPoolMaxPerShard() {
    errors.throwNotImplemented("getting the pool max per shard");
  }

  //---------------------------------------------------------------------------
  // getPoolMin()
  //
  // Returns the minimum number of connections allowed in the pool.
  //---------------------------------------------------------------------------
  getPoolMin() {
    errors.throwNotImplemented("getting the pool min");
  }

  //---------------------------------------------------------------------------
  // getPoolPingInterval()
  //
  // Returns the pool ping interval (seconds).
  //---------------------------------------------------------------------------
  getPoolPingInterval() {
    errors.throwNotImplemented("getting the pool ping interval");
  }

  //---------------------------------------------------------------------------
  // getPoolPingTimeout()
  //
  // Returns the pool ping Timeout (milliseconds).
  //---------------------------------------------------------------------------
  getPoolPingTimeout() {
    errors.throwNotImplemented("getting the pool ping Timeout");
  }

  //---------------------------------------------------------------------------
  // getPoolTimeout()
  //
  // Returns the pool timeout.
  //---------------------------------------------------------------------------
  getPoolTimeout() {
    errors.throwNotImplemented("getting the pool timeout");
  }

  //---------------------------------------------------------------------------
  // getMaxLifetimeSession()
  //
  // Returns the pool max lifetime for a session.
  //---------------------------------------------------------------------------
  getMaxLifetimeSession() {
    errors.throwNotImplemented("getting the pool max lifetime");
  }

  //---------------------------------------------------------------------------
  // getStmtCacheSize()
  //
  // Returns the statement cache size associate with the pool.
  //---------------------------------------------------------------------------
  getStmtCacheSize() {
    errors.throwNotImplemented("getting the pool statement cache size");
  }

  //---------------------------------------------------------------------------
  // _getConnectTraceConfig()
  //
  // Returns the necessary connection config used by pool for debug/trace.
  //---------------------------------------------------------------------------
  _getConnectTraceConfig() {
    return {
      connectString: this._connectString,
      user: this._user,
      poolMin: this.getPoolMin(),
      poolMax: this.getPoolMax(),
      poolIncrement: this.getPoolIncrement()
    };
  }

  //---------------------------------------------------------------------------
  // getSodaMetaDataCache()
  //
  // Returns whether the SODA metadata cache is enabled or not.
  //---------------------------------------------------------------------------
  getSodaMetaDataCache() {
    errors.throwNotImplemented("getting the SODA metadata cache flag");
  }

  //---------------------------------------------------------------------------
  // reconfigure()
  //
  // Reconfigures the pool with new parameters.
  //---------------------------------------------------------------------------
  reconfigure() {
    errors.throwNotImplemented("reconfiguring the pool");
  }

  //---------------------------------------------------------------------------
  // setAccessToken()
  //
  // Sets the access token to use with the pool.
  //---------------------------------------------------------------------------
  setAccessToken() {
    errors.throwNotImplemented("sets the access token");
  }

}

module.exports = PoolImpl;
