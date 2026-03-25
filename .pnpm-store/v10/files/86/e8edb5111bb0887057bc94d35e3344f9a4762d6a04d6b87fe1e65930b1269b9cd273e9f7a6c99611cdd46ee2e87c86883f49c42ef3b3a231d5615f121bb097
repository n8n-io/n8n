// Copyright (c) 2024, Oracle and/or its affiliates.

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

const Message = require("./base.js");
const constants = require("../constants.js");

/**
 * Used for two-phase commit (TPC) transaction change state: commit, rollback,
 * forget, etc.
 *
 * @class TransactionChangeStateMessage
 * @extends {Message}
 */
class TransactionChangeStateMessage extends Message {

  constructor(connImpl) {
    super(connImpl);
    this.functionCode = constants.TNS_FUNC_TPC_TXN_CHANGE_STATE;
  }

  processReturnParameter(buf) {
    // process the parameters returned by the datatabase
    this.state = buf.readUB4();
  }

  encode(buf) {
    // writes the message to the database
    // acquire data to send to the server
    let xidBytes;
    if (this.xid) {
      xidBytes = Buffer.alloc(128);
      this.xid.globalTransactionId.copy(xidBytes);
      this.xid.branchQualifier.copy(xidBytes,
        this.xid.globalTransactionId.length);
    }

    this.writeFunctionHeader(buf);
    buf.writeUB4(this.operation);
    if (this.context) {
      buf.writeUInt8(1);
      buf.writeUB4(this.context.length);
    } else {
      buf.writeUInt8(0);
      buf.writeUB4(0);
    }

    if (this.xid) {
      buf.writeUB4(this.xid.formatId);
      buf.writeUB4(this.xid.globalTransactionId.length);
      buf.writeUB4(this.xid.branchQualifier.length);
      buf.writeUInt8(1);
      buf.writeUB4(xidBytes.length);
    } else {
      buf.writeUB4(0);
      buf.writeUB4(0);
      buf.writeUB4(0);
      buf.writeUInt8(0);
      buf.writeUB4(0);
    }
    buf.writeUB4(0);
    buf.writeUB4(this.state);
    buf.writeUInt8(1);
    buf.writeUB4(this.flags);

    if (this.context) {
      buf.writeBytes(this.context);
    }
    if (this.xid) {
      buf.writeBytes(xidBytes);
    }
  }
}

module.exports = TransactionChangeStateMessage;
