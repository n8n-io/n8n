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

const constants = require("./constants.js");
const Capabilities = require("./capabilities.js");
const {WritePacket, ReadPacket} = require("./packet.js");
const errors = require("../../errors");
const utils = require("./utils.js");
const traceHandler = require('../../traceHandler.js');

/**
 * Handles protocol details.
 *
 * @class Protocol
 */
class Protocol {

  constructor(conn) {
    this._breakInProgress = false;
    this.txnInProgress = false;
    this.connInProgress = true;
    this.nsi = conn.nscon;
    this.sequenceId = 1;
    /**
     * Compile and Runtime capabilities negotiated with Server
     * @type {object}
     */
    this.caps = new Capabilities(conn.nscon);
    this.writeBuf = new WritePacket(conn.nscon, this.caps, this);
    this.readBuf = new ReadPacket(conn.nscon, this.caps);
    this.callTimeout = 0;
  }

  /**
   * Decodes the message returned by the database. A message may consist of
   * multiple packets. Not all packets may be available so if insufficient
   * packets are available, the message decode function is expected to return
   * the value true if more data is expected to follow.
   *
   * If that occurs, waiting occurs until more packets arrive.
   *
   * @param {object} message: the RPC dynamic structure specific to the RPC
   */
  async _decodeMessage(message) {
    message.preProcess();
    await this.readBuf.waitForPackets(true);
    while (true) {     // eslint-disable-line
      if (this.nsi.isBreak) {
        await this.resetMessage();
        delete this.readBuf.savedPackets;
        await this.readBuf.waitForPackets();
      }
      try {
        message.decode(this.readBuf);
        break;
      } catch (err) {
        if (err instanceof utils.OutOfPacketsError) {
          if (!this.nsi.isBreak) {
            await this.readBuf.waitForPackets();
            this.readBuf.restorePoint();
          }
          continue;
        }
        throw (err);
      }
    }
    await message.postProcess();
  }

  /**
   * Encodes the message to be sent to the database. A message may be encoded
   * in multiple packets. In order to facilitate encoding of very large
   * messages consisting of a large number of packets, the message encode
   * function is expected to return the value true if more data is to follow.
   *
   * If that occurs, waiting occurs until the stream has drained and is ready
   * to accept more data.
   *
   * @param {object} message: the RPC dynamic structure specific to the RPC
   */
  async _encodeMessage(message) {
    const adapter = this.nsi.ntAdapter;
    this.writeBuf.startRequest(constants.TNS_PACKET_TYPE_DATA);
    while (message.encode(this.writeBuf)) {
      await adapter.pauseWrite();
    }
    this.writeBuf.endRequest();
  }

  async _recoverFromError(caughtErr, message) {
    /*
     * We have NJS error(protocol related) detected during packet write/read
     * operation.  Issue a break and reset to clear channel . We receive the
     * response as ORA-1013 from the server.
     */
    try {
      this.breakMessage();
      this._breakInProgress = false;
      await this.resetMessage();
      await this.readBuf.waitForPackets();
      message.decode(this.readBuf);
    } catch (err) { // Recovery failed
      this.nsi.disconnect();
      const newErr = errors.getErr(errors.ERR_CONNECTION_CLOSED);
      caughtErr.message = newErr.message +
        "\nError recovery failed: " + err.message +
        "\nOriginal error: " + caughtErr.message;
      throw caughtErr;
    }
  }

  /**
   *
   * @param {object} message The RPC dynamic structure specific to the RPC
   * @return {Promise}
   */
  async _processMessage(message) {
    let callTimer;
    let callTimeoutExpired = false;
    let traceInstance, traceContext;
    const traceEnabled = traceHandler.isEnabled();

    if (traceEnabled) {
      traceContext = { additionalConfig: {} };
      traceInstance = traceHandler.getTraceInstance();
    }
    try {
      if (this.callTimeout > 0) {
        callTimer = setTimeout(() => {
          callTimeoutExpired = true;
          this.breakMessage();
        }, this.callTimeout);
      }
      if (traceEnabled) {
        traceContext.operation = `oracledb.${message.constructor.name}`;
        traceInstance.onBeginRoundTrip(traceContext);
      }
      await this._encodeMessage(message);
      if (message.messageType !== constants.TNS_MSG_TYPE_ONEWAY_FN) {
        await this._decodeMessage(message);
      }
    } catch (err) {
      if (!this.connInProgress &&
          err.code !== errors.ERR_CONNECTION_CLOSED_CODE) {
        await this._recoverFromError(err, message);
      }
      if (traceEnabled) {
        traceContext.error = err;
      }
      throw err;
    } finally {
      clearTimeout(callTimer);
      if (traceEnabled) {
        traceContext.callLevelConfig = message.connection._callLevelTraceData;
        traceContext.connectLevelConfig = message.connection._getConnectTraceConfig();
        if (message.callStatus & constants.TNS_EOCS_FLAGS_SESS_RELEASE) {
          traceContext.additionalConfig.implicitRelease = true;
        }
        traceInstance.onEndRoundTrip(traceContext);
      }
    }
    if (message.flushOutBinds) {
      await this.flushOutBindMessage(message);
    }
    this.txnInProgress = Boolean(message.callStatus & constants.TNS_EOCS_FLAGS_TXN_IN_PROGRESS);
    // processes the call status flags returned by the server.
    if (message.callStatus & constants.TNS_EOCS_FLAGS_SESS_RELEASE) {
      message.connection.statementCache.clearCursors();
    }

    if (message.errorOccurred) {
      if (callTimeoutExpired) {
        errors.throwErr(errors.ERR_CALL_TIMEOUT_EXCEEDED, this.callTimeout);
      }
      if (message.retry) {
        message.errorOccurred = false;
        return await this._processMessage(message);
      }
      let err = new Error(message.errorInfo.message);
      err.offset = message.errorInfo.pos;
      err.errorNum = message.errorInfo.num;
      err.isRecoverable = message.errorInfo.isRecoverable;
      err = errors.transformErr(err);
      if (err.code === errors.ERR_CONNECTION_CLOSED_CODE) {
        this.nsi.disconnect();
      }
      throw err;
    }
  }

  async flushOutBindMessage(message) {
    this.writeBuf.startRequest(constants.TNS_PACKET_TYPE_DATA);
    this.writeBuf.writeUInt8(constants.TNS_MSG_TYPE_FLUSH_OUT_BINDS);
    this.writeBuf.endRequest();
    await this._decodeMessage(message);
  }

  /**
   * Send break packet
   */
  breakMessage() {
    this._breakInProgress = true;
    this.nsi.sendBreak();
  }

  /**
   * Reset the connection
   */
  async resetMessage() {
    await this.nsi.reset();
  }

}

module.exports = Protocol;
