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
const MessageWithData = require("./withData.js");
const errors = require("../../../errors.js");

/**
 * Executes OFETCH RPC
 *
 * @class FetchMessage
 * @extends {MessageWithData}
 */
class FetchMessage extends MessageWithData {

  constructor(connection, statement, options, resultSet) {
    super(connection, statement, options);
    this.resultSet = resultSet;
    this.functionCode = constants.TNS_FUNC_FETCH;
  }

  //-------------------------------------------------------------------------
  // encode()
  //
  // Write the cursor ID and the number of rows to be fetched in the
  // Fetch Message RPC
  //-------------------------------------------------------------------------
  encode(buf) {
    this.writeFunctionHeader(buf);
    if (this.statement.cursorId === 0) {
      errors.throwErr(errors.ERR_CURSOR_HAS_BEEN_CLOSED);
    }
    buf.writeUB4(this.statement.cursorId);
    buf.writeUB4(this.options.fetchArraySize);
  }

}

module.exports = FetchMessage;
