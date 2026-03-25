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
const errors = require("../../../errors.js");

/**
 * Used for two-phase commit (TPC) transaction start, attach and detach.
 *
 * @class TransactionSwitchMessage
 * @extends {Message}
 */
class TransactionSwitchMessage extends Message {

  constructor(connImpl) {
    super(connImpl);
    this.functionCode = constants.TNS_FUNC_TPC_TXN_SWITCH;
    this.applicationValue = 0;
    this.internalName = connImpl.internalName;
    if (this.internalName) {
      this.internalName = Buffer.from(this.internalName);
    }
    this.externalName = connImpl.externalName;
    if (this.externalName) {
      this.externalName = Buffer.from(this.externalName);
    }
  }

  processReturnParameter(buf) {
    // process the parameters returned by the datatabase
    this.applicationValue = buf.readUB4();
    this.contextLen = buf.readUB2();
    if (this.contextLen > 0) {
      this.context = Buffer.from(buf.readBytes(this.contextLen));
    }
  }

  encode(buf) {
    // We unset the pending flag in writePiggybacks just before encode is
    // called to ensure message is written
    if (this.connection._sessionlessData?.pending)
      errors.throwErr(errors.ERR_SESSIONLESS_ALREADY_ACTIVE);

    // writes the message to the database
    // acquire data to send to the server
    let xidBytes;
    if (this.xid) {
      xidBytes = Buffer.alloc(128);
      this.xid.globalTransactionId.copy(xidBytes);
      if (this.xid.branchQualifier)
        this.xid.branchQualifier.copy(xidBytes,
          this.xid.globalTransactionId.length);
    }

    this.writeFunctionHeader(buf);


    buf.writeUB4(this.operation);
    if (this.context) {
      buf.writeUInt8(1);  // pointer (transaction context)
      buf.writeUB4(this.context.length);
    } else {
      buf.writeUInt8(0);  // pointer (transaction context)
      buf.writeUB4(0);    // transaction context length
    }

    if (this.xid) {
      buf.writeUB4(this.xid.formatId);
      buf.writeUB4(this.xid.globalTransactionId.length);
      buf.writeUB4(this.xid.branchQualifier.length);
      buf.writeUInt8(1);  // pointer (XID)
      buf.writeUB4(xidBytes.length);
    } else {
      buf.writeUB4(0);    // format id
      buf.writeUB4(0);    // global transaction id length
      buf.writeUB4(0);    // branch qualifier length
      buf.writeUInt8(0);  // pointer (XID)
      buf.writeUB4(0);    // XID length
    }

    buf.writeUB4(this.flags);
    buf.writeUB4(this.timeout ? this.timeout : 0);
    buf.writeUInt8(1);   // pointer (application value)
    buf.writeUInt8(1);   // pointer (return context)
    buf.writeUInt8(1);   // pointer (return context length)

    if (this.internalName) {
      buf.writeUInt8(1);   // pointer (internal name)
      buf.writeUB4(this.internalName.length);
    } else {
      buf.writeUInt8(0);   // pointer (internal name)
      buf.writeUB4(0);     // length of internal name
    }

    if (this.externalName) {
      buf.writeUInt8(1);   // pointer (external name)
      buf.writeUB4(this.externalName.length);
    } else {
      buf.writeUInt8(0);   // pointer (external name)
      buf.writeUB4(0);     // length of external name
    }

    if (this.context) {
      buf.writeBytes(this.context);
    }
    if (this.xid) {
      buf.writeBytes(xidBytes);
    }
    buf.writeUB4(this.applicationValue);

    if (this.internalName) {
      buf.writeBytes(this.internalName);
    }

    if (this.externalName) {
      buf.writeBytes(this.externalName);
    }
  }
}

module.exports = TransactionSwitchMessage;
