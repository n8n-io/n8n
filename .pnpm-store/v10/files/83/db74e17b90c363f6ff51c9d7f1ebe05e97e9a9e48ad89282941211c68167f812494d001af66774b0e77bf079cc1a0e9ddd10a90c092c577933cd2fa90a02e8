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

const { Buffer } = require('buffer');
const constants = require('../constants.js');
const Message = require('./base.js');

/**
 * Abstracts all LOB operations.
 *
 * @class LobOpMessage
 * @extends {Message}
 */
class LobOpMessage extends Message {

  constructor(connImpl, options) {
    super(connImpl);
    /*
     * source LOB locator. Reading data from it.
     */
    this.sourceLobImpl = options.sourceLobImpl || null;
    this.operation = options.operation;
    /*
     * Offset from where sourceLob operation to start
     */
    this.sourceOffset = options.sourceOffset || 0;
    /*
     * Offset from where destLob operation to start
     */
    this.destOffset = options.destOffset || 0;
    this.boolFlag = false;
    if (options.data) { // data available For Writes
      this.data = options.data;
    }
    this.functionCode = constants.TNS_FUNC_LOB_OP;
    this.sendAmount = options.sendAmount;
    this.amount = options.amount || 0; // LOB length
    this.destLength = options.destLength || 0;
  }

  encode(buf) {
    this.writeFunctionHeader(buf);
    if (this.sourceLobImpl === null) {
      buf.writeUInt8(0);
      buf.writeUB4(0);
    } else {
      buf.writeUInt8(1);
      buf.writeUB4(this.sourceLobImpl._locator.length);
    }
    buf.writeUInt8(0);
    buf.writeUB4(this.destLength);
    buf.writeUB4(0);
    buf.writeUB4(0);
    if (this.operation === constants.TNS_LOB_OP_CREATE_TEMP) {
      buf.writeUInt8(1);
    } else {
      buf.writeUInt8(0);
    }
    buf.writeUInt8(0);
    const operations = [
      constants.TNS_LOB_OP_CREATE_TEMP,
      constants.TNS_LOB_OP_IS_OPEN,
      constants.TNS_LOB_OP_FILE_EXISTS,
      constants.TNS_LOB_OP_FILE_ISOPEN,
    ];
    if (operations.includes(this.operation)) {
      buf.writeUInt8(1);
    } else {
      buf.writeUInt8(0);
    }
    buf.writeUB4(this.operation);
    buf.writeUInt8(0);
    buf.writeUInt8(0);
    buf.writeUB8(this.sourceOffset);
    buf.writeUB8(this.destOffset);
    if (this.sendAmount) {
      buf.writeUInt8(1);
    } else {
      buf.writeUInt8(0);
    }
    for (let i = 0; i < 3; i++) {
      buf.writeUInt16BE(0);
    }
    if (this.sourceLobImpl) {
      buf.writeBytes(this.sourceLobImpl._locator);
    }
    if (this.operation === constants.TNS_LOB_OP_CREATE_TEMP) {
      if (this.sourceLobImpl.dbType._csfrm === constants.CSFRM_NCHAR) {
        buf.caps.checkNCharsetId();
        buf.writeUB4(constants.TNS_CHARSET_UTF16);
      } else {
        buf.writeUB4(constants.TNS_CHARSET_UTF8);
      }
    }
    if (this.data) {
      let data;
      buf.writeUInt8(constants.TNS_MSG_TYPE_LOB_DATA);
      if (this.sourceLobImpl.dbType._oraTypeNum === constants.TNS_DATA_TYPE_BLOB) {
        data = this.data;
      } else if (this.sourceLobImpl.getCsfrm() === constants.CSFRM_NCHAR) {
        data = this.data;
        // TODO: avoid conversion back to string, if possible
        // this is since bind data is converted to buffer automatically, but if
        // it exceeds 32K for PL/SQL it must be written as a temporary LOB
        if (Buffer.isBuffer(this.data)) {
          data = data.toString();
        }
        data = Buffer.from(data, constants.TNS_ENCODING_UTF16).swap16();
      } else {
        data = Buffer.from(this.data);
      }
      buf.writeBytesWithLength(data);
    }
    if (this.sendAmount) {
      buf.writeUB8(this.amount);
    }
  }

  processMessage(buf, messageType) {
    if (messageType === constants.TNS_MSG_TYPE_LOB_DATA) {
      const oraTypeNum = this.sourceLobImpl.dbType._oraTypeNum;
      let data = buf.readBytesWithLength();
      if (data !== null) {
        if (
          oraTypeNum === constants.TNS_DATA_TYPE_BLOB ||
          oraTypeNum === constants.TNS_DATA_TYPE_BFILE
        ) {
          data = Buffer.from(data);
        } else if (this.sourceLobImpl.getCsfrm() === constants.CSFRM_NCHAR) {
          data = Buffer.from(data).swap16().toString('utf16le');
        } else {
          data = data.toString();
        }
      }
      this.data = data;
    } else {
      super.processMessage(buf, messageType);
    }
  }

  processReturnParameter(buf) {
    let lobArray;
    let locator;
    let temp8;
    let numBytes;
    if (this.sourceLobImpl !== null) {
      numBytes = this.sourceLobImpl._locator.length;
      lobArray = buf.readBytes(numBytes);
      locator = lobArray.slice(0, numBytes);
      locator.copy(this.sourceLobImpl._locator);
    }
    if (this.operation === constants.TNS_LOB_OP_CREATE_TEMP) {
      buf.skipUB2();        // skip character set
      buf.skipUB1();        // skip trailing flags
    } else if (this.sendAmount) {
      this.amount = buf.readSB8();
    }
    if (
      this.operation === constants.TNS_LOB_OP_IS_OPEN
      || this.operation === constants.TNS_LOB_OP_FILE_EXISTS
      || this.operation === constants.TNS_LOB_OP_FILE_ISOPEN
    ) {
      temp8 = buf.readUInt8();
      this.boolFlag = temp8 > 0;
    }
  }

}

module.exports = LobOpMessage;
