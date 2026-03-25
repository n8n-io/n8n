// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

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

const constants = require("../constants.js");
const Message = require("./base.js");

/**
 * Executes a Protocol Negotiation RPC function
 *
 * @class ProtocolMessage
 * @extends {Message}
 */
class ProtocolMessage extends Message {

  /**
   * Serializes the ProtocolMessage function arguments
   *
   * @param {object} buf input arguments
   */
  encode(buf) {
    buf.writeUInt8(constants.TNS_MSG_TYPE_PROTOCOL);
    buf.writeUInt8(6);                          // protocol version (8.1+)
    buf.writeUInt8(0);                          // "array" terminator
    buf.writeStr("node-oracledb");              // unique name for driver
    buf.writeUInt8(0);
  }

  processMessage(buf, messageType) {
    if (messageType === constants.TNS_MSG_TYPE_PROTOCOL) {
      this.processProtocolInfo(buf);
      this.endOfResponse = !this.connection.nscon.endOfRequestSupport;
    } else {
      super.processMessage(buf, messageType);
    }
  }

  processProtocolInfo(buf) {
    this.serverVersion = buf.readUInt8();
    buf.skipUB1();
    this.serverBanner = buf.readNullTerminatedBytes(48);
    buf.caps.charSetID = buf.readUInt16LE();
    this.serverFlags = buf.readUInt8();
    const num_elem = buf.readUInt16LE();
    if (num_elem > 0) {                       // skip elements
      buf.skipBytes(num_elem * 5);
    }
    const fdoLen = buf.readUInt16BE();
    const fdo = buf.readBytes(fdoLen);
    const ix = 6 + fdo[5] + fdo[6];
    buf.caps.nCharsetId = (fdo[ix + 3] << 8) + fdo[ix + 4];
    const serverCompileCaps = buf.readBytesWithLength();
    if (serverCompileCaps) {
      this.serverCompileCaps = Buffer.from(serverCompileCaps);
      buf.caps.adjustForServerCompileCaps(this.serverCompileCaps, this.connection.nscon);

      // Set the maximum OSON field name size
      if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_1) {
        this.connection._osonMaxFieldNameSize = 65535;
      } else {
        this.connection._osonMaxFieldNameSize = 255;
      }
    }
    const serverRunTimeCaps = buf.readBytesWithLength();
    if (serverRunTimeCaps) {
      this.serverRunTimeCaps = Buffer.from(serverRunTimeCaps);
      buf.caps.adjustForServerRuntimeCaps(this.serverRunTimeCaps);
    }
  }

}

module.exports = ProtocolMessage;
