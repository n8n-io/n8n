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
const utils = require("../utils");
const constants = require("../constants.js");
const Message = require("./base.js");
const { ThinDbObjectImpl, readXML } = require("../../dbObject.js");
const ThinLobImpl = require("../../lob.js");
const errors = require('../../../errors');
const types = require('../../../types.js');

/**
 * Handles data like row header, rowdata , ... recevied from an RPC Execute
 *
 * @class MessageWithData
 * @extends {Message}
 */
class MessageWithData extends Message {
  constructor(connection, statement = null, options = null) {
    super(connection);
    this.statement = statement;
    this.options = options;
    this.offset = 0;
    this.numExecs = 1;
    this.arrayDmlRowCounts = false;
    this.requiresDefine = false;
    this.rowIndex = statement.bufferRowCount || 0;
    this.dmlRowCounts = [];
    this.batchErrors = false;
    this.outVariables = [];
    this.inFetch = false;
    this.parseOnly = false;
    this.resultSetsToSetup = [];
    this.deferredErr = null;
  }

  /**
    * processMessage() - Process the data type message
    */
  processMessage(buf, messageType) {
    if (messageType === constants.TNS_MSG_TYPE_DESCRIBE_INFO) {
      buf.skipBytesChunked();
      const prevQueryVars = this.statement.queryVars;
      this.statement.numQueryVars = 0;
      this.statement.bufferRowCount = 0;
      this.statement.bufferRowIndex = 0;
      this.processDescribeInfo(buf, this.resultSet, prevQueryVars);
      this.outVariables = this.statement.queryVars;
    } else if (messageType === constants.TNS_MSG_TYPE_ROW_HEADER) {
      this.processRowHeader(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_ROW_DATA) {
      this.processRowData(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_IMPLICIT_RESULTSET) {
      this.processImplicitResultSet(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_BIT_VECTOR) {
      this.processBitVector(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_IO_VECTOR) {
      this.processIOVector(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_FLUSH_OUT_BINDS) {
      this.flushOutBinds = true;
      this.endOfResponse = true;
    } else if (messageType === constants.TNS_MSG_TYPE_ERROR) {
      this.processErrorInfo(buf);
    } else {
      super.processMessage(buf, messageType);
    }
  }

  processErrorInfo(buf) {
    super.processErrorInfo(buf);
    if (this.errorInfo.cursorId !== 0) {
      this.statement.cursorId = this.errorInfo.cursorId;
    }
    if (!this.statement.isPlSql) {
      this.statement.rowCount = this.errorInfo.rowCount;
    }
    // we do not set the lastRowid if the rows affected is 0
    if (this.errorInfo.rowCount > 0) {
      this.statement.lastRowid = utils.encodeRowID(this.errorInfo.rowID);
    }
    this.options.batchErrors = this.errorInfo.batchErrors;
    if (this.batchErrors && this.options.batchErrors === null) {
      this.options.batchErrors = [];
    }
    if (this.errorInfo.num === constants.TNS_ERR_NO_DATA_FOUND && this.statement.isQuery) {
      this.errorInfo.num = 0;
      this.errorOccurred = false;
      this.statement.moreRowsToFetch = false;
    } else if (this.retry) {
      this.retry = false;
    } else if (this.statement.isQuery &&
      (this.errorInfo.num === constants.TNS_ERR_VAR_NOT_IN_SELECT_LIST
        || this.errorInfo.num === constants.TNS_ERR_INCONSISTENT_DATA_TYPES)) {
      this.retry = true;
      this.connection.statementCache.clearCursor(this.statement);
    } else if (this.errorInfo.num !== 0 && this.errorInfo.cursorId !== 0) {
      if (!errors.ERR_INTEGRITY_ERROR_CODES.includes(this.errorInfo.num)) {
        this.connection.statementCache.clearCursor(this.statement);
        this.statement.returnToCache = false;
      }
    }
    if (this.errorInfo.batchErrors) {
      this.errorOccurred = false;
    }
  }

  //---------------------------------------------------------------------------
  // If we have fetched this column earlier, we set that
  // fetch type for the describe info variable received
  // assuming the returned column order is same as previous.
  //---------------------------------------------------------------------------
  _adjustFetchType(pVar, cVar) {
    if ((cVar.fetchInfo.dbType._oraTypeNum === constants.TNS_DATA_TYPE_CLOB
       && pVar.fetchInfo.fetchType._oraTypeNum === constants.TNS_DATA_TYPE_LONG)
        || (cVar.fetchInfo.dbType._oraTypeNum === constants.TNS_DATA_TYPE_BLOB
          && pVar.fetchInfo.fetchType._oraTypeNum === constants.TNS_DATA_TYPE_LONG_RAW)
        || (cVar.fetchInfo.dbType._oraTypeNum === constants.TNS_DATA_TYPE_JSON
          && pVar.fetchInfo.fetchType._oraTypeNum === constants.TNS_DATA_TYPE_VARCHAR)
        || (cVar.fetchInfo.dbType._oraTypeNum === constants.TNS_DATA_TYPE_VECTOR
          && pVar.fetchInfo.fetchType._oraTypeNum === constants.TNS_DATA_TYPE_LONG)) {
      cVar.type = pVar.fetchInfo.fetchType;
      cVar.maxSize = pVar.maxSize;
    }
  }

  processDescribeInfo(buf, resultSet, prevQueryVars) {
    const statement = resultSet.statement;
    buf.skipUB4();                              // max row size
    statement.numQueryVars = buf.readUB4();
    if (statement.numQueryVars > 0) {
      buf.skipUB1();
    }
    resultSet.metadata = [];
    const metadata = [];
    const queryVars = [];
    for (let i = 0; i < statement.numQueryVars; i++) {
      const variable = this.processColumnInfo(buf, i + 1);
      if (prevQueryVars && i < prevQueryVars.length) {
        this._adjustFetchType(prevQueryVars[i], variable);
      }
      queryVars.push(variable);
      metadata.push(variable.fetchInfo);
    }
    let numBytes = buf.readUB4();
    if (numBytes > 0) {
      buf.skipBytesChunked();                   // current date
    }
    buf.skipUB4();                              // dcbflag
    buf.skipUB4();                              // dcbmdbz
    buf.skipUB4();                              // dcbmnpr
    buf.skipUB4();                              // dcbmxpr
    numBytes = buf.readUB4();
    if (numBytes > 0) {
      buf.skipBytesChunked();
    }

    /*
     * The message state(resultSet) and statement state(queryVars) is modified
     * at end of the DescribeInfo function so that an OutOfPacketsError
     * won't cause partial information state to be stored.
     */
    resultSet.metadata = metadata;
    statement.queryVars = queryVars;
    this.resultSetsToSetup.push(resultSet);
  }

  processColumnInfo(buf, columnNum) {
    const dataType = buf.readUInt8();
    buf.skipUB1(); // flags
    const precision = buf.readInt8();
    const scale = buf.readInt8();
    const maxSize = buf.readUB4();
    buf.skipUB4();                              // max number of array elements
    buf.skipUB8();                              // cont flags
    let oid;
    let numBytes = buf.readUB4();               // OID
    if (numBytes > 0) {
      oid = Buffer.from(buf.readBytesWithLength());
    }
    buf.skipUB2();                              // version
    buf.skipUB2();                              // character set id
    const csfrm = buf.readUInt8();              // character set form
    let size = buf.readUB4();
    if (dataType === constants.TNS_DATA_TYPE_RAW) {
      size = maxSize;
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_12_2) {
      buf.skipUB4();                            // oaccolid
    }
    const nullable = Boolean(buf.readUInt8());
    buf.skipUB1();                              // v7 length of name
    let name;
    numBytes = buf.readUB4();
    if (numBytes > 0) {
      name = buf.readStr(constants.CSFRM_IMPLICIT);
    }
    let schema;
    numBytes = buf.readUB4();
    if (numBytes > 0) {
      schema = buf.readStr(constants.CSFRM_IMPLICIT);
    }
    numBytes = buf.readUB4();
    let typeName;
    if (numBytes > 0) {
      typeName = buf.readStr(constants.CSFRM_IMPLICIT);
    }
    buf.skipUB2();                              // column position
    const udsFlags = buf.readUB4();             // uds flag

    // build metadata
    const fetchInfo = {
      name: name,
      dbType: types.getTypeByOraTypeNum(dataType, csfrm),
      nullable: nullable
    };
    fetchInfo.isJson = Boolean(udsFlags & constants.TNS_UDS_FLAGS_IS_JSON);
    fetchInfo.isOson = Boolean(udsFlags & constants.TNS_UDS_FLAGS_IS_OSON);
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_1) {
      numBytes = buf.readUB4();
      if (numBytes > 0) {
        fetchInfo.domainSchema = buf.readStr(constants.CSFRM_IMPLICIT);
      }
      numBytes = buf.readUB4();
      if (numBytes > 0) {
        fetchInfo.domainName = buf.readStr(constants.CSFRM_IMPLICIT);
      }
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_1_EXT_3) {
      if (buf.readUB4() > 0) {
        fetchInfo.annotations = {};
        buf.skipUB1();
        const numAnnotations = buf.readUB4();
        buf.skipUB1();
        let key, value;
        for (let i = 0; i < numAnnotations; i++) {
          buf.skipUB4();
          value = "";
          key = buf.readStr(constants.CSFRM_IMPLICIT);
          numBytes = buf.readUB4();
          if (numBytes > 0) {
            value = buf.readStr(constants.CSFRM_IMPLICIT);
          }
          fetchInfo.annotations[key] = value;
          buf.skipUB4();                        // flags
        }
        buf.skipUB4();                          // flags
      }
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_4) {
      const dimensions = buf.readUB4();
      const vectorFormat = buf.readUInt8();
      const vectorFlags = buf.readUInt8();
      if (fetchInfo.dbType === types.DB_TYPE_VECTOR) {
        if (!(vectorFlags & constants.VECTOR_META_FLAG_FLEXIBLE_DIM)) {
          fetchInfo.vectorDimensions = dimensions;
        }
        fetchInfo.isSparseVector = Boolean(vectorFlags & constants.VECTOR_META_FLAG_SPARSE);
        if (vectorFormat !== constants.VECTOR_FORMAT_FLEX) {
          fetchInfo.vectorFormat = vectorFormat;
        }
      }
    }

    switch (fetchInfo.dbType) {
      case types.DB_TYPE_VARCHAR:
      case types.DB_TYPE_NVARCHAR:
      case types.DB_TYPE_CHAR:
      case types.DB_TYPE_NCHAR:
      case types.DB_TYPE_RAW:
        fetchInfo.byteSize = size;
        break;
      case types.DB_TYPE_NUMBER:
        fetchInfo.precision = precision;
        break;
      case types.DB_TYPE_TIMESTAMP:
      case types.DB_TYPE_TIMESTAMP_TZ:
      case types.DB_TYPE_TIMESTAMP_LTZ:
        fetchInfo.precision = scale;
        break;
      case types.DB_TYPE_OBJECT:
        fetchInfo.dbTypeClass = this.connection._getDbObjectType(schema,
          typeName, undefined, oid);
        if (fetchInfo.dbTypeClass.partial) {
          this.connection._partialDbObjectTypes.push(fetchInfo.dbTypeClass);
        }
        if (fetchInfo.dbTypeClass.isXmlType) {
          fetchInfo.dbType = types.DB_TYPE_XMLTYPE;
        }
        break;
      default:
        break;
    }
    if (fetchInfo.dbType === types.DB_TYPE_NUMBER) {
      fetchInfo.scale = scale;
    }
    return {
      fetchInfo: fetchInfo,
      type: fetchInfo.dbType,
      maxSize: maxSize,
      columnNum: columnNum,
      values: new Array(this.options.fetchArraySize)
    };
  }

  processRowHeader(buf) {
    buf.skipUB1();                              // flags
    buf.skipUB2();                              // num requests
    buf.skipUB4();                              // iteration number
    buf.skipUB4();                              // num iters
    buf.skipUB2();                              // buffer length
    let numBytes = buf.readUB4();
    if (numBytes > 0) {
      this.bitVector = Buffer.from(buf.readBytesWithLength());
    }
    numBytes = buf.readUB4();
    if (numBytes > 0) {
      buf.skipBytesChunked();                   // rxhrid
    }
  }

  isDuplicateData(columnName) {
    if (!this.bitVector) {
      return false;
    }
    const byteNum = Math.floor(columnName / 8);
    const bitNum = columnName % 8;
    return (this.bitVector[byteNum] & (1 << bitNum)) === 0;
  }

  processRowData(buf) {
    let value;
    for (const [col, variable] of this.outVariables.entries()) {
      if (variable.isArray) {
        variable.numElementsInArray = buf.readUB4();
        const values = new Array(variable.numElementsInArray).fill(null);
        for (let pos = 0; pos < variable.numElementsInArray; pos++) {
          value = this.processColumnData(buf, variable, pos);
          values[pos] = value;
        }
        variable.values[this.rowIndex] = values;
      } else if (this.statement.isReturning) {
        const numRows = buf.readUB4();
        const values = Array(numRows).fill(null);
        for (let j = 0; j < numRows; j++) {
          values[j] = this.processColumnData(buf, variable, j);
        }
        variable.values[this.rowIndex] = values;
      } else if (this.isDuplicateData(col)) {
        if (this.rowIndex === 0 && variable.outConverter) {
          value = variable.lastRawValue;
        } else {
          value = variable.values[this.statement.lastRowIndex];
        }
        variable.values[this.rowIndex] = value;
      } else {
        value = this.processColumnData(buf, variable, this.rowIndex);
        variable.values[this.rowIndex] = value;
      }
    }
    this.rowIndex++;
    if (this.inFetch) {
      this.statement.lastRowIndex = this.rowIndex - 1;
      this.statement.bufferRowCount++;
      this.bitVector = null;
    }
  }

  processIOVector(buf) {
    let numBytes;
    buf.skipUB1();                              // flag
    const temp16 = buf.readUB2();              // num requests
    const temp32 = buf.readUB4();              // iter num
    const numBinds = temp32 * 256 + temp16;
    buf.skipUB4();                              // num iters this time
    buf.skipUB2();                              // uac buffer length
    numBytes = buf.readUB2();                   // bit vector for fast fetch
    if (numBytes > 0) {
      buf.skipBytes(numBytes);
    }
    numBytes = buf.readUB2();                   // rowid
    if (numBytes > 0) {
      buf.skipBytes(numBytes);
    }
    this.outVariables = [];
    for (let i = 0; i < numBinds; i++) {              // bind directions
      const bindInfo = this.statement.bindInfoList[i];
      bindInfo.bindDir = buf.readUInt8();
      if (bindInfo.bindDir === constants.TNS_BIND_DIR_INPUT) {
        continue;
      }
      this.outVariables.push(bindInfo.bindVar);
    }
  }

  processColumnData(buf, variable) {
    const dbType = variable.type;
    const oraTypeNum = dbType._oraTypeNum;
    const csfrm = dbType._csfrm;
    const maxSize = variable.maxSize;

    let colValue = null;
    if (maxSize === 0 && oraTypeNum !== constants.TNS_DATA_TYPE_LONG
      && oraTypeNum !== constants.TNS_DATA_TYPE_LONG_RAW
      && oraTypeNum !== constants.TNS_DATA_TYPE_UROWID) {
      colValue = null;
    } else if (
      oraTypeNum === constants.TNS_DATA_TYPE_VARCHAR ||
      oraTypeNum === constants.TNS_DATA_TYPE_CHAR ||
      oraTypeNum === constants.TNS_DATA_TYPE_LONG
    ) {
      if (csfrm === constants.CSFRM_NCHAR) {
        buf.caps.checkNCharsetId();
      }
      colValue = buf.readStr(csfrm);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_RAW ||
      oraTypeNum === constants.TNS_DATA_TYPE_LONG_RAW) {
      colValue = buf.readBytesWithLength();
      if (colValue !== null) {
        colValue = Buffer.from(colValue);
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_NUMBER) {
      colValue = buf.readOracleNumber();
      if (!this.inFetch && colValue !== null)
        colValue = parseFloat(colValue);
    } else if (
      oraTypeNum === constants.TNS_DATA_TYPE_DATE ||
      oraTypeNum === constants.TNS_DATA_TYPE_TIMESTAMP ||
      oraTypeNum === constants.TNS_DATA_TYPE_TIMESTAMP_LTZ ||
      oraTypeNum === constants.TNS_DATA_TYPE_TIMESTAMP_TZ
    ) {
      const useLocalTime = (oraTypeNum === constants.TNS_DATA_TYPE_DATE ||
        oraTypeNum === constants.TNS_DATA_TYPE_TIMESTAMP);
      colValue = buf.readOracleDate(useLocalTime);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_ROWID) {
      if (!this.inFetch) {
        colValue = buf.readStr(constants.CSFRM_IMPLICIT);
      } else {
        const numBytes = buf.readUInt8();
        if (isNullLength(numBytes)) {
          colValue = null;
        } else {
          const rowid = buf.readRowID();
          colValue = utils.encodeRowID(rowid);
        }
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_UROWID) {
      if (!this.inFetch) {
        colValue = buf.readStr(constants.CSFRM_IMPLICIT);
      } else {
        colValue = buf.readURowID();
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_BINARY_DOUBLE) {
      colValue = buf.readBinaryDouble();
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_BINARY_FLOAT) {
      colValue = buf.readBinaryFloat();
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_BINARY_INTEGER) {
      colValue = buf.readOracleNumber();
      if (colValue !== null)
        colValue = parseFloat(colValue);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_CURSOR) {
      const numBytes = buf.readUInt8();
      if (isNullLength(numBytes)) {
        colValue = null;
      } else {
        colValue = this.createCursorFromDescribe(buf);
        colValue.statement.cursorId = buf.readUB2();
        // If the cursor ID is 0 for the returned ref cursor then
        // it is an invalid cursor
        if (colValue.statement.cursorId === 0 && variable.dir !== constants.BIND_IN) {
          if (this.options.nullifyInvalidCursor) {
            colValue = null;
          } else {
            errors.throwErr(errors.ERR_INVALID_REF_CURSOR);
          }
        }
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_BOOLEAN) {
      colValue = buf.readBool();
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_INTERVAL_YM) {
      colValue = buf.readOracleIntervalYM();
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_INTERVAL_DS) {
      colValue = buf.readOracleIntervalDS();
    } else if (
      oraTypeNum === constants.TNS_DATA_TYPE_CLOB ||
      oraTypeNum === constants.TNS_DATA_TYPE_BLOB ||
      oraTypeNum === constants.TNS_DATA_TYPE_BFILE
    ) {
      let length = 0;
      let chunkSize = 0;
      const bvalue = buf.readUB4();
      if (bvalue > 0) { // Non Null data in column
        colValue = new ThinLobImpl();
        if (oraTypeNum !== constants.TNS_DATA_TYPE_BFILE) {
          length = buf.readUB8();
          chunkSize = buf.readUB4();
        }
        const locator = Buffer.from(buf.readBytesWithLength());
        colValue.init(this.connection, locator, dbType, length, chunkSize);
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_JSON) {
      colValue = buf.readOson();
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_VECTOR) {
      colValue = buf.readVector();
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_INT_NAMED) {
      const obj = buf.readDbObject();
      if (obj.packedData) {
        const objType = (variable.fetchInfo) ? variable.fetchInfo.dbTypeClass :
          variable.typeClass;

        if (variable.type === types.DB_TYPE_XMLTYPE) {
          colValue = readXML(this.connection, obj.packedData);
        } else {
          colValue = new ThinDbObjectImpl(objType, obj.packedData);
          colValue.toid = obj.toid;
          colValue.oid = obj.oid;
        }
      }
    } else {
      errors.throwErr(errors.ERR_UNSUPPORTED_DATA_TYPE, dbType.num,
        variable.columnNum);
    }

    if (!this.inFetch) {
      const actualNumBytes = buf.readSB4();
      if (actualNumBytes < 0 && oraTypeNum === constants.TNS_DATA_TYPE_BOOLEAN) {
        colValue = null;

      // For objects, maxsize validation is skipped
      } else if (actualNumBytes !== 0 && colValue !== null &&
        oraTypeNum !== constants.TNS_DATA_TYPE_INT_NAMED) {
        this.saveDeferredErr(errors.ERR_INSUFFICIENT_BUFFER_FOR_BINDS);
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_LONG || oraTypeNum === constants.TNS_DATA_TYPE_LONG_RAW || variable.maxSize > buf.caps.maxStringSize) {
      buf.skipSB4();                            // null indicator
      buf.skipUB4();                            // return code
    }
    return colValue;
  }

  processReturnParameter(buf) {
    let keywordNum = 0;
    let keyTextValue;
    let numParams = buf.readUB2();              // al8o4l (ignored)

    for (let i = 0; i < numParams; i++) {
      buf.skipUB4();
    }
    let numBytes = buf.readUB2();               // al8txl (ignored)
    if (numBytes > 0) {
      buf.skipBytes(numBytes);
    }
    numParams = buf.readUB2();                  // num key/value pairs
    for (let i = 0; i < numParams; i++) {
      numBytes = buf.readUB2();                 // key
      if (numBytes > 0) {
        keyTextValue = buf.readStr(constants.CSFRM_IMPLICIT);
      }
      numBytes = buf.readUB2();                 // value
      if (numBytes > 0) {
        buf.skipBytesChunked();
      }
      keywordNum = buf.readUB2();               // keyword num
      if (keywordNum === constants.TNS_KEYWORD_NUM_CURRENT_SCHEMA) {
        this.connection.currentSchema = keyTextValue;
      } else if (keywordNum === constants.TNS_KEYWORD_NUM_EDITION) {
        this.connection._edition = keyTextValue;
      }
    }
    numBytes = buf.readUB2();                   // registration
    if (numBytes > 0) {
      buf.skip(numBytes);
    }
    if (this.arrayDmlRowCounts) {
      const numRows = buf.readUB4();
      const rowCounts = this.options.dmlRowCounts = [];
      for (let i = 0; i < numRows; i++) {
        const rowCount = buf.readUB8();
        rowCounts.push(rowCount);
      }
    }
  }

  async postProcess() {
    if (this.deferredErr) {
      throw this.deferredErr;
    }

    if (this.outVariables) {
      for (const variable of this.outVariables) {
        if (variable.isArray) {
          if (variable.outConverter) {
            for (let pos = 0; pos < variable.numElementsInArray; pos++) {
              variable.values[0][pos] = await variable.outConverter(variable.values[0][pos]);
            }
          }
        } else {
          if (variable.outConverter) {
            variable.values[0] = await variable.outConverter(variable.values[0]);
          }
        }
      }
    }
    await this.connection._populatePartialDbObjectTypes();
    for (const resultSet of this.resultSetsToSetup) {
      resultSet._setup(this.options, resultSet.metadata);
      // LOBs always require define and they change the type that is actually
      // returned by the server
      for (const variable of resultSet.statement.queryVars) {
        if (variable.type === types.DB_TYPE_CLOB ||
            variable.type === types.DB_TYPE_NCLOB ||
            variable.type === types.DB_TYPE_BLOB ||
            variable.type === types.DB_TYPE_JSON ||
            variable.type === types.DB_TYPE_VECTOR) {
          if (variable.type !== variable.fetchInfo.fetchType) {
            variable.type = variable.fetchInfo.fetchType;
            variable.maxSize = constants.TNS_MAX_LONG_LENGTH;
          }
          if (!resultSet.statement.noPrefetch) {
            resultSet.statement.requiresDefine = true;
            resultSet.statement.noPrefetch = true;
          }
        }
      }
    }
  }

  preProcess() {
    if (this.statement.isReturning && !this.parseOnly) {
      this.outVariables = [];
      for (const bindInfo of this.statement.bindInfoList) {
        if (bindInfo.isReturnBind) {
          this.outVariables.push(bindInfo.bindVar);
        }
      }
    }

    if (this.statement.isQuery) {
      this.inFetch = true;
      if (this.statement.queryVars) {
        this.outVariables = [];
        for (let i = 0; i < this.statement.queryVars.length; i++) {
          this.outVariables.push(this.statement.queryVars[i]);
        }
      }
    }
  }

  processBitVector(buf) {
    this.numColumnsSent = buf.readUB2();
    let numBytes = Math.floor(this.statement.numQueryVars / 8);
    if (this.statement.numQueryVars % 8 > 0) {
      numBytes += 1;
    }
    this.bitVector = Buffer.from(buf.readBytes(numBytes));
  }

  processBindParams(buf, params) {
    const bindVars = [];
    const nonReturningParams = [];
    for (const bindInfo of params) {
      if (!bindInfo.isReturnBind) {
        nonReturningParams.push(bindInfo);
      }
      bindVars.push(bindInfo.bindVar);
    }
    this.writeColumnMetadata(buf, bindVars);
    return nonReturningParams;
  }

  writeColumnMetadata(buf, bindVars) {
    for (const variable of bindVars) {
      let oraTypeNum = variable.type._oraTypeNum;
      let maxSize = variable.maxSize || variable.type._bufferSizeFactor;
      let lobPrefetchLength = 0;

      // NCHAR, NVARCHAR reports ORA-01460: unimplemented or unreasonable
      // conversion requested if maxSize is not multiplied by the
      // bufferSizeFactor
      if (variable.type._csfrm === constants.CSFRM_NCHAR) {
        maxSize = Math.min(maxSize * variable.type._bufferSizeFactor, constants.TNS_MAX_LONG_LENGTH);
      }
      if ([constants.TNS_DATA_TYPE_ROWID, constants.TNS_DATA_TYPE_UROWID].includes(oraTypeNum)) {
        oraTypeNum = constants.TNS_DATA_TYPE_VARCHAR;
        maxSize = constants.TNS_MAX_UROWID_LENGTH;
      }
      let flag = constants.TNS_BIND_USE_INDICATORS;
      if (variable.isArray) {
        flag |= constants.TNS_BIND_ARRAY;
      }
      let contFlag = 0;
      if (variable.type === types.DB_TYPE_BLOB ||
          variable.type === types.DB_TYPE_CLOB ||
          variable.type === types.DB_TYPE_NCLOB) {
        contFlag = constants.TNS_LOB_PREFETCH_FLAG;
      } else if (variable.type === types.DB_TYPE_JSON) {
        contFlag = constants.TNS_LOB_PREFETCH_FLAG;
        maxSize = lobPrefetchLength = constants.TNS_JSON_MAX_LENGTH;
      } else if (variable.type === types.DB_TYPE_VECTOR) {
        contFlag = constants.TNS_LOB_PREFETCH_FLAG;
        maxSize = lobPrefetchLength = constants.TNS_VECTOR_MAX_LENGTH;
      }
      buf.writeUInt8(oraTypeNum);
      buf.writeUInt8(flag);
      // precision and scale are always written as zero as the server
      // expects that and complains if any other value is sent!
      buf.writeUInt8(0);
      buf.writeUInt8(0);

      // Write the max buffer size
      buf.writeUB4(maxSize);

      if (variable.isArray) {
        buf.writeUB4(variable.maxArraySize);
      } else {
        buf.writeUB4(0);                        // max num elements
      }
      buf.writeUB4(contFlag);
      if (variable.objType) {
        const objType = variable.objType;
        buf.writeUB4(objType.oid.length);
        buf.writeBytesWithLength(objType.oid);
        buf.writeUB2(objType.version);
      } else {
        buf.writeUB4(0);                        // OID
        buf.writeUB2(0);                        // version
      }
      if (variable.type._csfrm !== 0) {
        buf.writeUB2(constants.TNS_CHARSET_UTF8);
      } else {
        buf.writeUB2(0);
      }
      buf.writeUInt8(variable.type._csfrm);
      buf.writeUB4(lobPrefetchLength);          // max chars (LOB prefetch)
      if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_12_2) {
        buf.writeUB4(0);                        // oaccolid
      }
    }
  }

  writeBindParamsRow(buf, params, pos) {
    const offset = this.offset;
    let foundLong = false;
    for (const bindInfo of params) {
      if (bindInfo.isReturnBind)
        continue;
      const variable = bindInfo.bindVar;
      if (variable.isArray) {
        const numElements = variable.values.length;
        buf.writeUB4(numElements);
        for (let i = 0; i < numElements; i++) {
          this.writeBindParamsColumn(buf, variable, variable.values[i]);
        }
      } else {
        if ((!this.statement.isPlSql) && variable.maxSize > buf.caps.maxStringSize) {
          foundLong = true;
        } else {
          this.writeBindParamsColumn(buf, variable,
            variable.values[pos + offset]);
        }
      }
    }
    if (foundLong) {
      for (const bindInfo of params) {
        if (bindInfo.isReturnBind)
          continue;
        const variable = bindInfo.bindVar;
        if (variable.maxSize > buf.caps.maxStringSize) {
          this.writeBindParamsColumn(buf, variable, variable.values[pos + offset]);
        }
      }
    }
  }

  writeBindParamsColumn(buf, variable, value) {
    const oraTypeNum = variable.type._oraTypeNum;
    let tempVal;
    if ((value === undefined || value === null) && oraTypeNum !== constants.TNS_DATA_TYPE_CURSOR && oraTypeNum !== constants.TNS_DATA_TYPE_JSON) {
      if (oraTypeNum === constants.TNS_DATA_TYPE_BOOLEAN) {
        buf.writeUInt8(constants.TNS_ESCAPE_CHAR);
        buf.writeUInt8(1);
      } else if (oraTypeNum === constants.TNS_DATA_TYPE_INT_NAMED) {
        buf.writeUB4(0);                // TOID
        buf.writeUB4(0);                // OID
        buf.writeUB4(0);                // snapshot
        buf.writeUB4(0);                // version
        buf.writeUB4(0);                // packed data length
        buf.writeUB4(constants.TNS_OBJ_TOP_LEVEL);    // flags
      } else {
        buf.writeUInt8(0);
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_NUMBER ||
      oraTypeNum === constants.TNS_DATA_TYPE_BINARY_INTEGER) {
      if (typeof value === 'boolean') {
        tempVal = (value) ? "1" : "0";
      } else {
        tempVal = value.toString();
      }
      buf.writeOracleNumber(tempVal);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_VARCHAR ||
      oraTypeNum === constants.TNS_DATA_TYPE_CHAR ||
      oraTypeNum === constants.TNS_DATA_TYPE_LONG ||
      oraTypeNum === constants.TNS_DATA_TYPE_RAW ||
      oraTypeNum === constants.TNS_DATA_TYPE_LONG_RAW) {
      if (variable.type._csfrm === constants.CSFRM_NCHAR) {
        buf.caps.checkNCharsetId();
        value = Buffer.from(value, constants.TNS_ENCODING_UTF16).swap16();
      } else {
        value = Buffer.from(value);
      }
      buf.writeBytesWithLength(value);
    } else if (
      oraTypeNum === constants.TNS_DATA_TYPE_DATE ||
      oraTypeNum === constants.TNS_DATA_TYPE_TIMESTAMP ||
      oraTypeNum === constants.TNS_DATA_TYPE_TIMESTAMP_TZ ||
      oraTypeNum === constants.TNS_DATA_TYPE_TIMESTAMP_LTZ
    ) {
      buf.writeOracleDate(value, variable.type);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_BINARY_DOUBLE) {
      buf.writeUInt8(8);
      buf.writeBinaryDouble(value);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_BINARY_FLOAT) {
      buf.writeUInt8(4);
      buf.writeBinaryFloat(value);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_CURSOR) {
      let cursor = value;
      if (!value) {
        cursor = this.connection._createResultSet();
      }
      if (cursor.statement.cursorId === 0) {
        buf.writeUInt8(1);
        buf.writeUInt8(0);
      } else {
        buf.writeUB4(1);
        buf.writeUB4(cursor.statement.cursorId);
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_BOOLEAN) {
      if (value) {
        buf.writeUInt8(2);
        buf.writeUInt16BE(0x0101);
      } else {
        buf.writeUInt16BE(0x0100);
      }
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_INTERVAL_YM) {
      buf.writeOracleIntervalYM(value);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_INTERVAL_DS) {
      buf.writeOracleIntervalDS(value);
    } else if (
      oraTypeNum === constants.TNS_DATA_TYPE_CLOB ||
      oraTypeNum === constants.TNS_DATA_TYPE_BLOB ||
      oraTypeNum === constants.TNS_DATA_TYPE_BFILE
    ) {
      buf.writeUB4(value._locator.length);
      buf.writeBytesWithLength(value._locator);
    } else if ([constants.TNS_DATA_TYPE_ROWID, constants.TNS_DATA_TYPE_UROWID].includes(oraTypeNum)) {
      buf.writeBytesWithLength(Buffer.from(value));
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_JSON) {
      buf.writeOson(value, this.connection._osonMaxFieldNameSize);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_VECTOR) {
      buf.writeVector(value);
    } else if (oraTypeNum === constants.TNS_DATA_TYPE_INT_NAMED) {
      buf.writeDbObject(value);
    } else {
      const message = `Binding data of type ${variable.type}`;
      errors.throwErr(errors.ERR_NOT_IMPLEMENTED, message);
    }
  }

  createCursorFromDescribe(buf) {
    const resultSet = this.connection._createResultSet(this.options);
    resultSet.options.moreRowsToFetch = true;
    resultSet.statement.isQuery = true;
    resultSet.statement.requiresFullExecute = true;
    this.processDescribeInfo(buf, resultSet);
    return resultSet;
  }

  processImplicitResultSet(buf) {
    this.options.implicitResultSet = [];
    const numResults = buf.readUB4();
    for (let i = 0; i < numResults; i++) {
      const numBytes = buf.readUInt8();
      buf.skipBytes(numBytes);
      const childResultSet = this.createCursorFromDescribe(buf);
      childResultSet.statement.cursorId = buf.readUB2();
      this.options.implicitResultSet.push(childResultSet);
    }
  }
}

const isNullLength = (len) => {
  return len === 0 || len === constants.TNS_NULL_LENGTH_INDICATOR;
};

module.exports = MessageWithData;
