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

const crypto = require('crypto');
const path = require('path');
const constants = require("./constants.js");
const fs = require("fs");
const {getFlags} = require("./ANO.js");

/**
   * Generate UUID (Used for Connection ID)
   * @returns Promise
   */
async function genuuid() {
  return await new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
    });
  });
}

/**
 * Network Session Attributes
 */
class SessionAtts {

  constructor(uuid) {
    this.largeSDU = false;
    this.tdu = constants.NSPDFTDULN;
    this.nt = {};
    this.nt.tcpNoDelay = true;
    this.uuid = uuid;
    this.nt.sslServerDNMatch = true;
    this.nt.sslAllowWeakDNMatch = false;
    this.nt.useSNI = false;
    this.networkCompressionThreshold = 1024;
  }

  /**
   * Update Session attributes with input Parameters
   * @param {object} Params Input paramters
   */
  setFrom(params) {
    if (params) {
      if (params.sdu > 0) {
        this.sdu = parseInt(params.sdu);
      }
      if (typeof params.networkCompression == 'boolean') {
        this.networkCompression = params.networkCompression;
        this.networkCompressionLevels = [];
        if (params.networkCompressionLevels) {
          if (params.networkCompressionLevels.includes('high'))
            this.networkCompressionLevels.push('high');
          if (params.networkCompressionLevels.length == 0)
            this.networkCompressionLevels.push('high');
        }
      }
      if (params.networkCompressionThreshold >= 200) {
        this.networkCompressionThreshold = parseInt(params.networkCompressionThreshold);
      }

      if (typeof params.walletLocation === 'string') {
        this.nt.walletFile = path.join(params.walletLocation, constants.PEM_WALLET_FILE_NAME);
      }
      if (typeof params.walletPassword === 'string') {
        this.nt.walletPassword = params.walletPassword;
      }
      if (typeof params.walletContent === 'string') {
        this.nt.wallet = params.walletContent;
      }
      if (params.expireTime > 0) {
        this.nt.expireTime = params.expireTime * 1000 * 60;
      }
      if (params.connectTimeout > 0) {
        this.connectTimeout = params.connectTimeout * 1000;
      }
      if (params.transportConnectTimeout > 0) {
        this.transportConnectTimeout = params.transportConnectTimeout * 1000;
      }
      if (params.recvTimeout > 0) {
        this.recvTimeout = params.recvTimeout * 1000;
      }
      if (params.sendTimeout > 0) {
        this.sendTimeout = params.sendTimeout * 1000;
      }
      if (typeof params.connectionIdPrefix === 'string') {
        this.connectionIdPrefix = params.connectionIdPrefix;
      }
      if (typeof params.tcpNoDelay === 'boolean') {
        this.nt.tcpNoDelay = params.tcpNoDelay;
      }
      if (typeof params.sslServerDNMatch === 'boolean') {
        this.nt.sslServerDNMatch = params.sslServerDNMatch;
      }
      if (typeof params.sslAllowWeakDNMatch === 'boolean') {
        this.nt.sslAllowWeakDNMatch = params.sslAllowWeakDNMatch;
      }
      if (typeof params.sslServerCertDN === 'string') {
        this.nt.sslServerCertDN = params.sslServerCertDN;
      }
      if (typeof params.enable === 'string' && params.enable.toUpperCase() == "BROKEN") {
        this.nt.enabledDCD = true;
      }
      if (typeof params.httpsProxy === 'string') {
        this.nt.httpsProxy = params.httpsProxy;
      }
      if (params.httpsProxyPort >= 0) {
        this.nt.httpsProxyPort = parseInt(params.httpsProxyPort);
      }
      if (typeof params.useSNI === 'boolean') {
        this.nt.useSNI = params.useSNI;
      }
    }
  }

  /**
   * Read wallet
   * @returns Promise
   */
  readWalletFile() {
    return new Promise((resolve, reject)=> {
      fs.readFile(this.nt.walletFile, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Clear wallet
   */
  clearWallet() {
    if (this.nt.wallet && Buffer.isBuffer(this.nt.wallet))
      this.nt.wallet.fill(0);
    this.nt.wallet = null;
  }

  /**
   * Prepare attributes for connection, Generate Connection ID and read Wallet file
   *
   */
  async prepare(protocol, userConfig) {
    if (!this.uuid) {
      this.uuid = await genuuid();
      this.uuid = this.uuid.toString('base64');
    }
    if (this.connectionIdPrefix) {
      this.connectionId = this.connectionIdPrefix + this.uuid;
    } else {
      this.connectionId = this.uuid;
    }
    this.nt.connectionId = this.connectionId;

    if (protocol && (protocol.toUpperCase() == "TCPS" && !this.nt.wallet && this.nt.walletFile)) {
      this.nt.wallet = await this.readWalletFile();
    }

    if (!this.connectTimeout && !this.transportConnectTimeout)
      this.transportConnectTimeout = constants.DEFAULT_TRANSPORT_CONNECT_TIMEOUT; /* Default to 20 secs */

    this.NAFlags = getFlags(protocol, userConfig);
  }

}

module.exports = SessionAtts;
