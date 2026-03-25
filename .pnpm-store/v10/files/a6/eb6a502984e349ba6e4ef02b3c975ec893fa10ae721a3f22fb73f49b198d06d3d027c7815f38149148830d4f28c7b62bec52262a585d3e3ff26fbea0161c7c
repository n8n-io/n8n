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

const MessageWithData = require("./withData.js");
const constants = require("../constants.js");
const errors = require("../../../errors.js");
const TransactionSwitchMessage = require("./transactionSwitch.js");

/**
 *
 * Executes OALL8 RPC function
 *
 * @class ExecuteMessage
 * @extends {MessageWithData}
 */
class ExecuteMessage extends MessageWithData {
  /**
   *
   * @param {object} statement
   * @param {object} options
   */
  constructor(connection, statement, options, resultSet) {
    super(connection, statement, options);
    if (!resultSet && statement.isQuery) {
      resultSet = connection._createResultSet(options, statement);
    }
    this.resultSet = resultSet;
    this.functionCode = constants.TNS_FUNC_EXECUTE;
    this.bindParams = undefined;
    this.currentRow = 0;
  }

  //-------------------------------------------------------------------------
  // writeReExecuteMessage()
  //
  // Write the message for a full execute.
  //-------------------------------------------------------------------------
  writeExecuteMessage(buf) {
    let options = 0x0;
    let dmlOptions = 0;
    let numParams = 0;
    let numIters = 1;
    // Configuring the options field thats send to the server
    const stmt = this.statement;
    const params = stmt.bindInfoList;

    if (this.noImplicitRelease) {
      dmlOptions |= constants.TNS_EXEC_OPTION_NO_IMPL_REL;
    }

    if (!stmt.requiresDefine && !this.parseOnly && params) {
      numParams = params.length;
    }
    if (stmt.requiresDefine) {
      options |= constants.TNS_EXEC_OPTION_DEFINE;
    } else if (!this.parseOnly && stmt.sql) {
      dmlOptions |= constants.TNS_EXEC_OPTION_IMPLICIT_RESULTSET;
      options |= constants.TNS_EXEC_OPTION_EXECUTE;
    }
    if (stmt.cursorId === 0 || stmt.isDdl) {
      options |= constants.TNS_EXEC_OPTION_PARSE;
    }
    if (stmt.isQuery) {
      if (this.parseOnly) {
        options |= constants.TNS_EXEC_OPTION_DESCRIBE;
      } else {
        if (stmt.cursorId === 0 || stmt.requiresDefine) {
          numIters = this.options.prefetchRows;
        } else {
          numIters = this.options.fetchArraySize;
        }
        if (numIters > 0 && !stmt.noPrefetch) {
          options |= constants.TNS_EXEC_OPTION_FETCH;
        }
      }
    }
    if (!stmt.isPlSql && !this.parseOnly) {
      options |= constants.TNS_EXEC_OPTION_NOT_PLSQL;
    } else if (stmt.isPlSql && numParams > 0) {
      options |= constants.TNS_EXEC_OPTION_PLSQL_BIND;
    }
    if (numParams > 0) {
      options |= constants.TNS_EXEC_OPTION_BIND;
    }
    if (this.batchErrors) {
      options |= constants.TNS_EXEC_OPTION_BATCH_ERRORS;
    }
    if (this.arrayDmlRowCounts) {
      dmlOptions |= constants.TNS_EXEC_OPTION_DML_ROWCOUNTS;
    }
    if (this.options.autoCommit) {
      options |= constants.TNS_EXEC_OPTION_COMMIT;
    }

    // In case SuspendOnSuccess is set for execute and a sessionless transaction
    // is active we add a piggyback for post-call suspend
    if (this.options.suspendOnSuccess) {
      this._handleSuspendSessionless();
    }

    this.writeFunctionHeader(buf);
    buf.writeUB4(options);                           // execute options
    buf.writeUB4(stmt.cursorId);                     // cursor id
    if (stmt.cursorId === 0 || stmt.isDdl) {
      buf.writeUInt8(1);                             // pointer (cursor id)
      buf.writeUB4(stmt.sqlLength);
    } else {
      buf.writeUInt8(0);                             // pointer (cursor id)
      buf.writeUB4(0);
    }
    buf.writeUInt8(1);                               // pointer (vector)
    buf.writeUB4(13);                                // al8i4 array length
    buf.writeUInt8(0);                               // pointer (al8o4)
    buf.writeUInt8(0);                               // pointer (al8o4l)
    buf.writeUInt8(0);                               // prefetc buffer size
    buf.writeUB4(numIters);                          // prefetch num rows
    buf.writeUB4(constants.TNS_MAX_LONG_LENGTH);     // maximum long size
    if (numParams === 0) {
      buf.writeUInt8(0);                             // pointer (binds)
      buf.writeUB4(0);                               // number of binds
    } else {
      buf.writeUInt8(1);                             // pointer (binds)
      buf.writeUB4(numParams);                       // number of binds
    }
    buf.writeUInt8(0);                               // pointer (al8pp)
    buf.writeUInt8(0);                               // pointer (al8txn)
    buf.writeUInt8(0);                               // pointer (al8txl)
    buf.writeUInt8(0);                               // pointer (al8kv)
    buf.writeUInt8(0);                               // pointer (al8kvl)
    if (stmt.requiresDefine) {
      buf.writeUInt8(1);                             // pointer (al8doac)
      buf.writeUB4(this.statement.queryVars.length);     // number of defines
    } else {
      buf.writeUInt8(0);
      buf.writeUB4(0);
    }
    buf.writeUB4(0);                                 // registration id
    buf.writeUInt8(0);                               // pointer (al8objlist)
    buf.writeUInt8(1);                               // pointer (al8objlen)
    buf.writeUInt8(0);                               // pointer (al8blv)
    buf.writeUB4(0);                                 // al8blv
    buf.writeUInt8(0);                               // pointer (al8dnam)
    buf.writeUB4(0);                                 // al8dnaml
    buf.writeUB4(0);                                 // al8regid_msb
    if (this.arrayDmlRowCounts) {
      buf.writeUInt8(1);                             // pointer (al8pidmlrc)
      buf.writeUB4(this.numExecs);                   // al8pidmlrcbl
      buf.writeUInt8(1);                             // pointer (al8pidmlrcl)
    } else {
      buf.writeUInt8(0);                             // pointer (al8pidmlrc)
      buf.writeUB4(0);                               // al8pidmlrcbl
      buf.writeUInt8(0);                             // pointer (al8pidmlrcl)
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_12_2) {
      buf.writeUInt8(0);                             // pointer (al8sqlsig)
      buf.writeUB4(0);                               // SQL signature length
      buf.writeUInt8(0);                             // pointer (SQL ID)
      buf.writeUB4(0);                               // allocated size of SQL ID
      buf.writeUInt8(0);                             // pointer (length of SQL ID)
      if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_12_2_EXT1) {
        buf.writeUInt8(0);                           // pointer (chunk ids)
        buf.writeUB4(0);                             // number of chunk ids
      }
    }
    if (stmt.cursorId === 0 || stmt.isDdl) {
      if (stmt.sql) {
        buf.writeBytesWithLength(stmt.sqlBytes);
        buf.writeUB4(1);                             // al8i4[0] parse
      } else {
        errors.throwErr(errors.ERR_INVALID_REF_CURSOR);
      }
    } else {
      buf.writeUB4(0);                               // al8i4[0] parse
    }
    if (stmt.isQuery) {
      if (stmt.cursorId === 0) {
        buf.writeUB4(0);                             // al8i4[1] execution count
      } else {
        buf.writeUB4(numIters);
      }
    } else {
      buf.writeUB4(this.numExecs);                   // al8i4[1] execution count
    }
    buf.writeUB4(0);                                 // al8i4[2]
    buf.writeUB4(0);                                 // al8i4[3]
    buf.writeUB4(0);                                 // al8i4[4]
    buf.writeUB4(0);                                 // al8i4[5] SCN (part 1)
    buf.writeUB4(0);                                 // al8i4[6] SCN (part 2)
    buf.writeUB4((stmt.isQuery) ? 1 : 0);            // al8i4[7] is query
    buf.writeUB4(0);                                 // al8i4[8]
    buf.writeUB4(dmlOptions);                        // al8i4[9] DML row counts/implicit
    buf.writeUB4(0);                                 // al8i4[10]
    buf.writeUB4(0);                                 // al8i4[11]
    buf.writeUB4(0);                                 // al8i4[12]

    /*
     * write column metadata and bind params
     */
    if (stmt.requiresDefine) {
      this.writeColumnMetadata(buf, this.statement.queryVars);
    } else if (numParams > 0) {
      return this.processBindParams(buf, params);
    }
  }

  //-------------------------------------------------------------------------
  // writeReExecuteMessage()
  //
  // Write the message header for a re-execute and return the bind parameters.
  //-------------------------------------------------------------------------
  writeReExecuteMessage(buf) {
    const stmt = this.statement;
    let params = stmt.bindInfoList;
    let execFlag1 = 0, execFlag2 = 0, numIters;
    if (params !== undefined) {
      if (!stmt.isQuery) {
        this.outVariables = [];
        params.forEach(info => {
          if (info.bindDir !== constants.TNS_BIND_DIR_INPUT) {
            this.outVariables.push(info.bindVar);
          }
        });
      }

      const tmpparams = [];
      params.forEach(info => {
        if (info.bindDir !== constants.TNS_BIND_DIR_OUTPUT && !info.isReturnBind) {
          tmpparams.push(info);
        }
      });
      params = tmpparams;
    }

    if (this.functionCode === constants.TNS_FUNC_REEXECUTE_AND_FETCH) {
      execFlag1 |= constants.TNS_EXEC_OPTION_EXECUTE;
      numIters = this.options.prefetchRows;
    } else {
      if (this.options.autoCommit) {
        execFlag2 |= constants.TNS_EXEC_OPTION_COMMIT_REEXECUTE;
      }
      numIters = this.numExecs;
    }

    // In case SuspendOnSuccess is set for execute and a sessionless transaction
    // is active we add a piggyback for post-call suspend
    if (this.options.suspendOnSuccess) {
      this._handleSuspendSessionless();
    }

    this.writeFunctionHeader(buf);
    buf.writeUB4(stmt.cursorId);
    buf.writeUB4(numIters);
    buf.writeUB4(execFlag1);
    buf.writeUB4(execFlag2);
    return params;
  }

  //-------------------------------------------------------------------------
  // _handleSuspendSessionless()
  //
  // Suspend the active sessionless transaction after DML execution if
  // suspendOnSuccess option was given to execute()
  //-------------------------------------------------------------------------
  _handleSuspendSessionless() {
    const sessionlessData = this.connection._sessionlessData;
    // If sessionless transaction was started by server-call we cannot suspend
    // using client API(RPC) calls
    this.connection._validateSessionlessState();

    if (!sessionlessData)
      errors.throwErr(errors.ERR_SESSIONLESS_INACTIVE);
    // If a piggybacks already exists it is most likely a start/resume for a
    // sessionless transaction, add a post-call detach opcode to it
    if (sessionlessData.piggyback) {
      sessionlessData.piggyback.operation |=
        constants.TNS_TPC_TXN_POST_DETACH;
    } else {
      const message = new TransactionSwitchMessage(this.connection);
      message.operation = constants.TNS_TPC_TXN_POST_DETACH;
      message.flags = constants.TNS_TPC_TRANS_SESSIONLESS;
      message.messageType = constants.TNS_MSG_TYPE_PIGGYBACK;
      sessionlessData.piggyback = message;
      sessionlessData.pending = true;
    }
  }

  //-------------------------------------------------------------------------
  // encode()
  //
  // Write the execute message to the buffer. Two types of execute messages
  // are possible: one for a full execute and the second, simpler message,
  // for when an existing cursor is being re-executed.
  //-------------------------------------------------------------------------
  encode(buf) {

    // no rows have yet been sent so the header information needs to be sent
    if (this.currentRow === 0) {
      const stmt = this.statement;
      if (stmt.cursorId !== 0 && !stmt.requiresFullExecute && !this.parseOnly && !stmt.requiresDefine && !stmt.noPrefetch && !stmt.isDdl && !this.batchErrors) {
        if (stmt.isQuery && this.options.prefetchRows > 0) {
          this.functionCode = constants.TNS_FUNC_REEXECUTE_AND_FETCH;
        } else {
          this.functionCode = constants.TNS_FUNC_REEXECUTE;
        }
        this.bindParams = this.writeReExecuteMessage(buf);
      } else {
        this.functionCode = constants.TNS_FUNC_EXECUTE;
        this.bindParams = this.writeExecuteMessage(buf);
      }
    }

    // if any bind parameters need to be sent, do that
    // after each row is sent, check to see whether a pause should be performed
    if (this.bindParams && this.bindParams.length > 0) {
      const adapter = buf.nsi.ntAdapter;
      while (this.currentRow < this.numExecs) {
        buf.writeUInt8(constants.TNS_MSG_TYPE_ROW_DATA);
        this.writeBindParamsRow(buf, this.bindParams, this.currentRow);
        this.currentRow++;
        if (this.currentRow < this.numExecs && adapter.shouldPauseWrite())
          return true;
      }
    }

    // reset state in case message is resent
    this.currentRow = 0;
    this.bindParams = undefined;

  }

}

module.exports = ExecuteMessage;
