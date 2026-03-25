// Copyright (c) 2023, 2025, Oracle and/or its affiliates.

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
 * Executes a Fast Negotiation RPC function.
 * It sends Protocol Negotiation, Datatype Negotiation
 * and OSESS Key RPC in single round trip.
 *
 * @class FastAuthMessage
 * @extends {Message}
 */
class FastAuthMessage extends Message {

  /**
   * Serializes the FastAuthMessage function arguments
   *
   * @param {object} buf input arguments
   */
  encode(buf) {
    buf.writeUInt8(constants.TNS_MSG_TYPE_FAST_AUTH);
    buf.writeUInt8(1); // Fast Auth version
    buf.writeUInt8(constants.TNS_SERVER_CONVERTS_CHARS); // flag 1
    buf.writeUInt8(0); // flag 2
    this.protocolMessage.encode(buf);
    buf.writeUInt16BE(0); // server charset (unused)
    buf.writeUInt8(0); // server charset flag (unused)
    buf.writeUInt16BE(0); // server ncharset (unused)
    buf.caps.ttcFieldVersion = constants.TNS_CCAP_FIELD_VERSION_19_1_EXT_1;
    buf.writeUInt8(buf.caps.ttcFieldVersion);
    this.dataTypeMessage.encode(buf);
    this.authMessage.encode(buf);
    buf.caps.ttcFieldVersion = constants.TNS_CCAP_FIELD_VERSION_MAX;
  }

  processMessage(buf, messageType) {
    if (messageType === constants.TNS_MSG_TYPE_RENEGOTIATE) {
      this.reNegotiate = true;
    } else if (messageType === constants.TNS_MSG_TYPE_PROTOCOL) {
      this.protocolMessage.processMessage(buf, messageType);
    } else if (messageType === constants.TNS_MSG_TYPE_DATA_TYPES) {
      this.dataTypeMessage.processMessage(buf, messageType);
    } else {
      this.authMessage.processMessage(buf, messageType);
      this.endOfResponse = this.authMessage.endOfResponse;
      if (this.authMessage.errorOccurred) {
        // Capture the Error returned in TNS_MSG_TYPE_ERROR processing.
        this.errorOccurred = this.authMessage.errorOccurred;
        this.errorInfo = this.authMessage.errorInfo;
      }
    }
  }

}

module.exports = FastAuthMessage;
