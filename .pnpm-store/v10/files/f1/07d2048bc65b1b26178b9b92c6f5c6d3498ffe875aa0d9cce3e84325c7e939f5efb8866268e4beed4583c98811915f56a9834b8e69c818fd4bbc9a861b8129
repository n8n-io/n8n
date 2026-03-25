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
const ConnectionImpl = require('../impl/connection.js');
const ThinResultSetImpl = require('./resultSet.js');
const ThinLobImpl  = require("./lob.js");
const Protocol = require("./protocol/protocol.js");
const { BaseBuffer } = require('../impl/datahandlers/buffer.js');
const {NetworkSession: nsi} = require("./sqlnet/networkSession.js");
const { Statement } = require("./statement");
const thinUtil = require('./util');
const sqlNetConstants = require('./sqlnet/constants.js');
const constants = require('./protocol/constants.js');
const process = require('process');
const types = require('../types.js');
const errors = require("../errors.js");
const messages = require('./protocol/messages');
const StatementCache = require('./statementCache.js');

const finalizationRegistry = new global.FinalizationRegistry((heldValue) => {
  heldValue.disconnect();
});

class TDSBuffer extends BaseBuffer {
}

class ThinConnectionImpl extends ConnectionImpl {

  /**
   * Terminates the connection
   *
   * @return {Promise}
   */
  async close() {
    try {
      if (this._protocol.txnInProgress) {
        if (this.tpcContext) {
          const message = this.createTpcRollbackMessage();
          await this._protocol._processMessage(message);
        } else {
          await this.rollback();
        }
        this.tpcContext = null;
      }
      if (this._drcpEnabled) {
        await this._sessRelease();
        this._drcpEstablishSession = true;
      }
      if (this._pool && !this._dropSess) {
        await this._pool.release(this);
      } else {
        if (!this._drcpEnabled) {
          const message = new messages.LogOffMessage(this);
          await this._protocol._processMessage(message);
        }
        this.nscon.disconnect();
      }
    } catch (err) {
      // immediate close of open socket on failure
      // exception won't be thrown to user
      this.nscon.disconnect(sqlNetConstants.NSFIMM);
      // If connection is associated with a pool, we release it
      if (this._pool)
        await this._pool.release(this);
    }
  }

  async _sessRelease() {
    const message = new messages.SessionReleaseMessage(this);
    if (!this.isPooled()) {
      message.sessReleaseMode = constants.DRCP_DEAUTHENTICATE;
    }
    await this._protocol._processMessage(message);
  }

  //---------------------------------------------------------------------------
  // _getElementTypeObj()
  //
  // Get the element type's object type. This is needed when processing
  // collections with an object as the element type since this information is
  // not available in the TDS.
  //---------------------------------------------------------------------------
  async _getElementTypeObj(info) {
    const binds = [
      {
        name: "owner",
        type: types.DB_TYPE_VARCHAR,
        dir: constants.BIND_IN,
        maxSize: 128,
        values: [info.schema]
      },
      {
        name: "name",
        type: types.DB_TYPE_VARCHAR,
        dir: constants.BIND_IN,
        maxSize: 128,
        values: [info.name]
      },
      {
        name: "package_name",
        type: types.DB_TYPE_VARCHAR,
        dir: constants.BIND_IN,
        maxSize: 128,
        values: [info.packageName]
      }
    ];
    let sql;
    if (info.packageName) {
      sql = `
        select
            elem_type_owner,
            elem_type_name,
            elem_type_package
        from all_plsql_coll_types
        where owner = :owner
          and type_name = :name
          and package_name = :package_name`;
    } else {
      binds.pop();
      sql = `
        select
            elem_type_owner,
            elem_type_name
        from all_coll_types
        where owner = :owner
          and type_name = :name`;
    }
    const options = {
      connection: { _impl: this },
      prefetchRows: 2
    };
    const result = await this.execute(sql, 1, binds, options, false);
    const rows = await result.resultSet.getRows(1, options);
    await result.resultSet.close();
    const row = rows[0];
    info.elementTypeClass = this._getDbObjectType(row[0], row[1], row[2]);
    if (info.elementTypeClass.partial) {
      this._partialDbObjectTypes.push(info.elementTypeClass);
    }
  }

  //---------------------------------------------------------------------------
  // _execute()
  //
  // Calls the RPC that executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  async _execute(statement, numIters, binds, options, executeManyFlag) {

    // Throw error if executeMany is not called on a DML statement or PL/SQL
    if (executeManyFlag && statement.isQuery) {
      errors.throwErr(errors.ERR_EXECMANY_NOT_ALLOWED_ON_QUERIES);
    }
    // perform binds
    const numStmtBinds = statement.bindInfoList.length;
    const numUserBinds = binds.length;
    if (numStmtBinds !== numUserBinds) {
      if (!binds[0]?.name) {
        // positional bind mismatch or zero binds
        errors.throwErr(errors.ERR_WRONG_NUMBER_OF_BINDS, numStmtBinds, numUserBinds);
      }

      // named bind mismatch
      // Find the number of distinct named bind placeholders and see
      // if they match the bind values
      const numDistinctStmtBinds = statement.bindInfoDict.size;
      if (numDistinctStmtBinds !== numUserBinds)
        errors.throwErr(errors.ERR_WRONG_NUMBER_OF_BINDS, numStmtBinds, numUserBinds);
    }

    for (let i = 0; i < binds.length; i++) {
      await this._bind(statement, binds[i], i + 1);
    }
    if (statement.isPlSql && (options.batchErrors || options.dmlRowCounts)) {
      errors.throwErr(errors.ERR_EXEC_MODE_ONLY_FOR_DML);
    }

    // send database request
    const message = new messages.ExecuteMessage(this, statement, options);
    message.numExecs = numIters;
    message.arrayDmlRowCounts = options.dmlRowCounts;
    message.batchErrors = options.batchErrors;

    // if a PL/SQL statement requires a full execute, perform only a single
    // iteration in order to allow the determination of input/output binds
    // to be completed; after that, an execution of the remaining iterations
    // can be performed.
    if (statement.isPlSql && (statement.cursorId === 0 ||
      statement.requiresFullExecute)) {
      message.numExecs = 1;
      message.noImplicitRelease = true;
      await this._protocol._processMessage(message);
      statement.requiresFullExecute = false;
      message.numExecs = numIters - 1;
      message.offset = 1;
      message.noImplicitRelease = false;
    }
    if (message.numExecs > 0) {
      await this._protocol._processMessage(message);
      statement.requiresFullExecute = false;
    }

    // if a define is required, send an additional request to the database
    if (statement.requiresDefine && statement.sql) {
      statement.requiresFullExecute = true;
      await this._protocol._processMessage(message);
      statement.requiresFullExecute = false;
      statement.requiresDefine = false;
    }

    // process results
    const result = {};
    if (message.warning) {
      result.warning = message.warning;
    }
    if (statement.numQueryVars > 0) {
      result.resultSet = message.resultSet;
    } else {
      statement.bufferRowIndex = 0;
      const outBinds = thinUtil.getOutBinds(statement, numIters,
        executeManyFlag);
      if (outBinds) {
        result.outBinds = outBinds;
      }
      if (executeManyFlag) {
        if (!statement.isPlSql) {
          result.rowsAffected = statement.rowCount;
          delete statement.rowCount;
        }
        if (options.dmlRowCounts) {
          result.dmlRowCounts = options.dmlRowCounts;
        }
        if (options.batchErrors) {
          result.batchErrors = options.batchErrors;
        }
      } else {
        if (statement.isPlSql && options.implicitResultSet) {
          result.implicitResults = options.implicitResultSet;
        }
        if (statement.lastRowid) {
          result.lastRowid = statement.lastRowid;
          delete statement.lastRowid;
        }
        if (statement.isPlSql) {
          if (statement.rowCount) {
            result.rowsAffected = statement.rowCount;
          }
        } else {
          result.rowsAffected = statement.rowCount || 0;
        }
        if (statement.rowCount) {
          delete statement.rowCount;
        }
      }
      this._returnStatement(statement);
    }

    return result;
  }

  //---------------------------------------------------------------------------
  // _parseTDSAttr()
  //
  // Returns the DB type and fills metadata from the TDS buffer.
  //---------------------------------------------------------------------------
  _parseTDSAttr(buf, metaData) {
    let oraTypeNum, csfrm, attrType;

    // skip until a type code that is of interest
    for (;;) {
      attrType = buf.readUInt8();
      if (attrType === constants.TNS_OBJ_TDS_TYPE_EMBED_ADT_INFO) {
        buf.skipBytes(1); // flags
      } else if (attrType !== constants.TNS_OBJ_TDS_TYPE_SUBTYPE_MARKER) {
        break;
      }
    }

    // process the type code.
    let tempPrecision, tempScale;
    switch (attrType) {
      case constants.TNS_OBJ_TDS_TYPE_NUMBER:
        tempPrecision = buf.readInt8();
        tempScale = buf.readInt8();
        if (tempPrecision || tempScale) {
          metaData.precision = tempPrecision;
          metaData.scale = tempScale;
        }
        return types.DB_TYPE_NUMBER;
      case constants.TNS_OBJ_TDS_TYPE_FLOAT:
        tempPrecision = buf.readInt8();
        if (tempPrecision)
          metaData.precision = tempPrecision;
        return types.DB_TYPE_NUMBER;
      case constants.TNS_OBJ_TDS_TYPE_VARCHAR:
      case constants.TNS_OBJ_TDS_TYPE_CHAR:
        metaData.maxSize = buf.readUInt16BE(); // maximum length
        oraTypeNum = (attrType === constants.TNS_OBJ_TDS_TYPE_VARCHAR) ?
          constants.TNS_DATA_TYPE_VARCHAR : constants.TNS_DATA_TYPE_CHAR;
        csfrm = buf.readUInt8();
        csfrm = csfrm & 0x7f;
        buf.skipBytes(2); // character set
        return types.getTypeByOraTypeNum(oraTypeNum, csfrm);
      case constants.TNS_OBJ_TDS_TYPE_RAW:
        metaData.maxSize = buf.readUInt16BE(); // maximum length
        return types.DB_TYPE_RAW;
      case constants.TNS_OBJ_TDS_TYPE_BINARY_FLOAT:
        return types.DB_TYPE_BINARY_FLOAT;
      case constants.TNS_OBJ_TDS_TYPE_BINARY_DOUBLE:
        return types.DB_TYPE_BINARY_DOUBLE;
      case constants.TNS_OBJ_TDS_TYPE_DATE:
        return types.DB_TYPE_DATE;
      case constants.TNS_OBJ_TDS_TYPE_TIMESTAMP:
        buf.skipBytes(1); // precision
        return types.DB_TYPE_TIMESTAMP;
      case constants.TNS_OBJ_TDS_TYPE_TIMESTAMP_LTZ:
        buf.skipBytes(1); // precision
        return types.DB_TYPE_TIMESTAMP_LTZ;
      case constants.TNS_OBJ_TDS_TYPE_TIMESTAMP_TZ:
        buf.skipBytes(1); // precision
        return types.DB_TYPE_TIMESTAMP_TZ;
      case constants.TNS_OBJ_TDS_TYPE_BOOLEAN:
        return types.DB_TYPE_BOOLEAN;
      case constants.TNS_OBJ_TDS_TYPE_CLOB:
        return types.DB_TYPE_CLOB;
      case constants.TNS_OBJ_TDS_TYPE_BLOB:
        return types.DB_TYPE_BLOB;
      case constants.TNS_OBJ_TDS_TYPE_OBJ:
        buf.skipBytes(5);
        return types.DB_TYPE_OBJECT;
      case constants.TNS_OBJ_TDS_TYPE_START_EMBED_ADT:
        // loop until end type, TNS_OBJ_TDS_TYPE_END_EMBED_ADT
        // is received.
        while (this._parseTDSAttr(buf, {}) !== 0) {
          continue;
        }
        return types.DB_TYPE_OBJECT;
      case constants.TNS_OBJ_TDS_TYPE_END_EMBED_ADT:
        return 0;
      default:
        errors.throwErr(errors.ERR_TDS_TYPE_NOT_SUPPORTED, attrType);
    }
  }

  //---------------------------------------------------------------------------
  // _parseTDS()
  //
  // Parses the TDS (type descriptor segment) for the type.
  //---------------------------------------------------------------------------
  async _parseTDS(tds, info) {
    // parse initial TDS bytes
    const buf = new TDSBuffer(tds);
    buf.skipBytes(4);                   // end offset
    buf.skipBytes(2);                   // version op code and version
    buf.skipBytes(2);                   // unknown

    // if the number of attributes exceeds 1, the type cannot refer to a
    // collection, so nothing further needs to be done
    const numAttrs = buf.readUInt16BE();

    // continue parsing TDS bytes to discover if type refers to a collection
    buf.skipBytes(1);                   // TDS attributes?
    buf.skipBytes(1);                   // start ADT op code
    buf.skipBytes(2);                   // ADT number (always zero)
    buf.skipBytes(4);                   // offset to index table

    // check to see if type refers to a collection (only one attribute is
    // present in that case).
    info.isCollection = false;
    if (numAttrs === 1) {
      const pos = buf.pos;
      const attrType = buf.readUInt8();
      if (attrType === constants.TNS_OBJ_TDS_TYPE_COLL) {
        info.isCollection = true;
      } else {
        buf.pos = pos;
      }
    }

    // Handle collections
    if (info.isCollection) {
      // continue parsing TDS to determine element type
      const elementPos = buf.readUInt32BE();
      info.maxNumElements = buf.readUInt32BE();
      info.collectionType = buf.readUInt8();
      if (info.collectionType === constants.TNS_OBJ_PLSQL_INDEX_TABLE) {
        info.collectionFlags = constants.TNS_OBJ_HAS_INDEXES;
      }
      buf.pos = elementPos;
      info.elementTypeInfo = {};
      info.elementType = this._parseTDSAttr(buf, info.elementTypeInfo);
      if (info.elementType === types.DB_TYPE_OBJECT) {
        await this._getElementTypeObj(info);
        if (info.elementTypeClass.isXmlType) {
          info.elementType = types.DB_TYPE_XMLTYPE;
        }
      }
    } else {
      if (info.attributes) { // skip for XML type as it has no attributes.
        for (const attr of info.attributes) {
          this._parseTDSAttr(buf, attr);
        }
      }
    }
  }

  //---------------------------------------------------------------------------
  // _populateRowTypeInfo()
  //
  // Get column and datatype information in case of %ROWTYPE handling.
  //---------------------------------------------------------------------------
  async _populateRowTypeInfo(info, options, result) {
    const getColumnsSQL = `
      SELECT
        column_name,
        data_type,
        data_type_owner,
        case
          when data_type in
            ('CHAR', 'NCHAR', 'VARCHAR2', 'NVARCHAR2', 'RAW')
            then data_length
          else 0
        end,
        case
          when data_precision is null and data_scale is null
            then 0
          when data_precision is null
            then 38
          else data_precision
        end,
        case
          when data_precision is null and data_scale is null
              and data_type = 'NUMBER'
            then -127
          when data_scale is null
            then 0
          else data_scale
        end
      from all_tab_cols
      where owner = :owner
        and table_name = :name
        and hidden_column != 'YES'
      order by column_id`;

    const bindVal = [
      {
        name: "owner",
        type: types.DB_TYPE_VARCHAR,
        maxSize: 128,
        dir: constants.BIND_IN,
        values: [result.outBinds.schema],
      },
      {
        name: "name",
        type: types.DB_TYPE_VARCHAR,
        maxSize: 128,
        dir: constants.BIND_IN,
        values: [info.name.substring(0, info.name.length - 8)]
      }
    ];
    const val = await this.execute(
      getColumnsSQL, 1, bindVal, options, false
    );
    try {
      const attrRows = await val.resultSet._getAllRows();
      info.attributes = [];
      for (const row of attrRows) {
        const metaData = {
          name: row[0],
          dataType: row[1],
          dataTypeOwner: row[2],
          maxSize: row[3],
          dataPrecision: row[4],
          dataScale: row[5],
        };
        if (!metaData.dataTypeOwner) {
          const startPos = row[1].indexOf('(');
          const endPos = row[1].indexOf(')');
          if (endPos > startPos) {
            metaData.dataType = metaData.dataType.substring(0, startPos) +
              metaData.dataType.substring(
                endPos + 1, metaData.dataType.length
              );
          }
        }
        this._addAttr(info.attributes, metaData);
      }
    } finally {
      val.resultSet.close();
    }
  }

  //---------------------------------------------------------------------------
  // _populateDbObjectTypeInfo()
  //
  // Poplates type information given the name of the type.
  //---------------------------------------------------------------------------
  async _populateDbObjectTypeInfo(name) {

    // get type information from the database
    const sql = `
      declare
          t_Instantiable              varchar2(3);
          t_SuperTypeOwner            varchar2(128);
          t_SuperTypeName             varchar2(128);
          t_SubTypeRefCursor          sys_refcursor;
          t_Pos                       pls_integer;
      begin
          :ret_val := dbms_pickler.get_type_shape(:full_name, :oid,
              :version, :tds, t_Instantiable, t_SuperTypeOwner,
              t_SuperTypeName, :attrs_rc, t_SubTypeRefCursor);
          :package_name := null;
          if substr(:full_name, length(:full_name) - 7) = '%ROWTYPE' then
              t_Pos := instr(:full_name, '.');
              :schema := substr(:full_name, 1, t_Pos - 1);
              :name := substr(:full_name, t_Pos + 1);
          else
              begin
                  select owner, type_name
                  into :schema, :name
                  from all_types
                  where type_oid = :oid;
              exception
              when no_data_found then
                  begin
                      select owner, package_name, type_name
                      into :schema, :package_name, :name
                      from all_plsql_types
                      where type_oid = :oid;
                  exception
                  when no_data_found then
                      null;
                  end;
              end;
          end if;
      end;`;

    const binds = [
      {
        name: "full_name",
        type: types.DB_TYPE_VARCHAR,
        dir: constants.BIND_INOUT,
        maxSize: 500,
        values: [name]
      },
      {
        name: "ret_val",
        type: types.DB_TYPE_BINARY_INTEGER,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "oid",
        type: types.DB_TYPE_RAW,
        maxSize: 16,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "version",
        type: types.DB_TYPE_BINARY_INTEGER,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "tds",
        type: types.DB_TYPE_RAW,
        maxSize: 2000,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "attrs_rc",
        type: types.DB_TYPE_CURSOR,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "package_name",
        type: types.DB_TYPE_VARCHAR,
        maxSize: 128,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "schema",
        type: types.DB_TYPE_VARCHAR,
        maxSize: 128,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "name",
        type: types.DB_TYPE_VARCHAR,
        maxSize: 128,
        dir: constants.BIND_OUT,
        values: []
      }
    ];
    const options = {
      connection: { _impl: this },
      nullifyInvalidCursor: true
    };
    const result = await this.execute(sql, 1, binds, options, false);
    if (result.outBinds.ret_val !== 0) {
      errors.throwErr(errors.ERR_INVALID_OBJECT_TYPE_NAME, name);
    }

    try {
      // check cache; if already present, nothing more to do!
      const info = this._getDbObjectType(result.outBinds.schema,
        result.outBinds.name, result.outBinds.package_name, result.outBinds.oid);
      if (!info.partial) {
        return info;
      }

      // process TDS and attributes cursor
      if (info.name.endsWith('%ROWTYPE')) {
        await this._populateRowTypeInfo(info, options, result);
      } else {
        info.version = result.outBinds.version;
        const attrRows = await result.outBinds.attrs_rc._getAllRows();
        if (attrRows.length > 0) {
        // Its an object not a collection.
          info.attributes = [];
          for (const row of attrRows) {
            const metaData = {
              name: row[1],
              dataType: row[3],
              dataTypeOwner: row[4],
              packageName: row[5],
              oid: row[6]
            };
            this._addAttr(info.attributes, metaData);
          }

        }
        await this._parseTDS(result.outBinds.tds, info);
      }
      info.partial = false;
      return info;
    } finally {
      result.outBinds.attrs_rc.close();
    }

  }

  //---------------------------------------------------------------------------
  // _addAttr()
  //
  // Populates "attributes" object present in "attrList".
  //---------------------------------------------------------------------------
  _addAttr(attributes, attrInfo) {
    const attr = { name: attrInfo.name };
    if (attrInfo.dataTypeOwner) {
      attr.type = types.DB_TYPE_OBJECT;
      attr.typeClass = this._getDbObjectType(
        attrInfo.dataTypeOwner,
        attrInfo.dataType,
        attrInfo.packageName,
        attrInfo.oid
      );

      if (attr.typeClass.isXmlType) {
        attr.type = types.DB_TYPE_XMLTYPE;
      }
      if (attr.typeClass.partial) {
        this._partialDbObjectTypes.push(attr.typeClass);
      }
    } else {
      if (attrInfo.dataType === 'INTEGER' || attrInfo.dataType === 'SMALLINT') {
        attr.type = types.DB_TYPE_NUMBER;
        attr.precision = 38;
        attr.scale = 0;
      } else if (attrInfo.dataType === 'REAL') {
        attr.type = types.DB_TYPE_NUMBER;
        attr.precision = 63;
        attr.scale = -127;
      } else if (attrInfo.dataType === 'DOUBLE PRECISION' || attrInfo.dataType === 'FLOAT') {
        attr.type = types.DB_TYPE_NUMBER;
        // the database sends type name "FLOAT" instead of type name "REAL"
        // when looking at table metadata but not when examining database
        // object attribute metadata so account for that here
        if (attrInfo.dataPrecision != null || attrInfo.dataPrecision != undefined)
          attr.precision = Number(attrInfo.dataPrecision);
        else
          attr.precision = 126;
        attr.scale = -127;
      } else {
        attr.type = types.getTypeByColumnTypeName(attrInfo.dataType);
        if (attrInfo.maxSize != null || attrInfo.maxSize != undefined) {
          const tempMaxSize = Number(attrInfo.maxSize);
          if (tempMaxSize)
            attr.maxSize = tempMaxSize;
        }
        if (attr.type === types.DB_TYPE_NUMBER) {
          attr.precision = Number(attrInfo.dataPrecision);
          attr.scale = Number(attrInfo.dataScale);
        }
      }
    }
    attributes.push(attr);
  }

  //---------------------------------------------------------------------------
  // _populatePartialDbObjectTypes()
  //
  // Populates partial types that were discovered earlier. Since populating an
  // object type might result in additional object types being discovered,
  // object types are popped from the partial types list until the list is
  // empty.
  //---------------------------------------------------------------------------
  async _populatePartialDbObjectTypes() {
    while (this._partialDbObjectTypes.length > 0) {
      const info = this._partialDbObjectTypes.pop();
      let suffix = "%ROWTYPE";
      let name = info.name;
      if (name.endsWith(suffix)) {
        name = name.substring(0, name.length - suffix.length);
      } else {
        suffix = "";
      }
      let fullName;
      if (info.packageName) {
        fullName = `"${info.schema}"."${info.packageName}"."${name}"${suffix}`;
      } else {
        fullName = `"${info.schema}"."${name}"${suffix}`;
      }
      await this._populateDbObjectTypeInfo(fullName);
    }
  }

  async commit() {
    const message = new messages.CommitMessage(this);
    await this._protocol._processMessage(message);
  }

  async breakExecution() {
    await this._protocol.breakMessage();
  }

  isCompressionEnabled() {
    return this.nscon.compressionEnabled;
  }
  isHealthy() {
    try {
      if (this.nscon.recvInbandNotif() === 0)
        return true;
      return false;
    } catch {
      return false;
    }
  }

  isPooled() {
    return (this._pool) ? true : false;
  }

  /**
   *
   * @param {object} params  Configuration of the connection
   *
   * @return {Promise}
   */
  async connect(params) {
    if (!params.connectString) {
      errors.throwErr(errors.ERR_EMPTY_CONNECT_STRING);
    }
    thinUtil.checkCredentials(params);

    this.sessionID = 0;
    this.serialNum = 0;
    this.autoCommit = false;
    this.serverVersion = "";
    this.statementCache = null;
    this.currentSchema = "";
    this.invokeSessionCallback = true;
    this.statementCacheSize = params.stmtCacheSize;
    this._currentSchemaModified = false;
    this._tempLobsToClose = [];
    this._tempLobsTotalSize = 0;
    this._drcpEstablishSession = false;
    this._cclass = null;
    this._clientIdentifier = "";
    this._clientIdentifierModified = false;
    this._action = "";
    this._actionModified = false;
    this._dbOp = "";
    this._dbOpModified = false;
    this._clientInfo = "";
    this._clientInfoModified = false;
    this._module = "";
    this._moduleModified = false;
    this._drcpEnabled = false;
    this.serviceName = '';
    this.remoteAddress = '';
    this.comboKey = null; // used in changePassword API
    this.tpcContext = null;
    this._sessionlessData = null;

    this.nscon = new nsi();
    finalizationRegistry.register(this, this.nscon);
    await this.nscon.connect(params);

    let serverType;
    if (this.isPooled()) {
      serverType = params._connInfo[0];
      this.serviceName = params._connInfo[2];
      this.purity = params._connInfo[3] | constants.PURITY_DEFAULT;
      this.sid = params._connInfo[4];
    } else {
      serverType = this.nscon.getOption(sqlNetConstants.SERVERTYPE);
      this.serviceName = this.nscon.getOption(sqlNetConstants.SVCNAME);
      this.sid = this.nscon.getOption(sqlNetConstants.SID);
      this.purity = this.nscon.getOption(sqlNetConstants.PURITY) | constants.PURITY_DEFAULT;
    }
    if (serverType) {
      this._drcpEnabled = serverType.toLowerCase() === 'pooled';
    }
    this.remoteAddress = this.nscon.getOption(sqlNetConstants.REMOTEADDR);
    this.connectionClass = params.connectionClass;

    /*
     * if drcp is used, use purity = NEW as the default purity for
     * standalone connections and purity = SELF for connections that belong
     * to a pool
     */
    if (this.purity === constants.PURITY_DEFAULT && this._drcpEnabled) {
      if (this.isPooled()) {
        this.purity = constants.PURITY_SELF;
      } else {
        this.purity = constants.PURITY_NEW;
      }
    }

    this._protocol = new Protocol(this);

    // check if the protocol version supported by the database is high
    // enough; if not, reject the connection immediately
    if (this._protocol.caps.protocolVersion < constants.TNS_VERSION_MIN_ACCEPTED) {
      errors.throwErr(errors.ERR_SERVER_VERSION_NOT_SUPPORTED);
    }

    try {
      const protocolMessage = new messages.ProtocolMessage(this);
      const dataTypeMessage = new messages.DataTypeMessage(this);
      const authMessage = new messages.AuthMessage(this, params);
      if (this.nscon.supportsFastAuth) {
        const fastAuthMessage = new messages.FastAuthMessage(this);
        fastAuthMessage.protocolMessage = protocolMessage;
        fastAuthMessage.dataTypeMessage = dataTypeMessage;
        fastAuthMessage.authMessage = authMessage;
        await this._protocol._processMessage(fastAuthMessage);
        if (fastAuthMessage.reNegotiate) {
          // Fast Authentication failed.
          await this._protocol._processMessage(dataTypeMessage);
          await this._protocol._processMessage(authMessage);
        }
      } else {
        // When Fast Auth is explicitly disabled on servers > 23ai,
        // we dont rely on message type TNS_MSG_TYPE_END_OF_REQUEST too
        // for protocolMessage and dataTypeMessage.
        const endOfRequestSupport = this.nscon.endOfRequestSupport;
        this.nscon.endOfRequestSupport = false;
        await this._protocol._processMessage(protocolMessage);
        await this._protocol._processMessage(dataTypeMessage);
        this.nscon.endOfRequestSupport = endOfRequestSupport;
        await this._protocol._processMessage(authMessage);
      }
      if (!params.externalAuth) { // non-token Authentication
        await this._protocol._processMessage(authMessage); // OAUTH
      }
    } catch (err) {
      this.nscon.disconnect();
      throw err;
    }

    this.statementCache = new StatementCache(this.statementCacheSize);
    // maintain a list of partially populated database object types
    this._partialDbObjectTypes = [];

    if (params.debugJDWP) {
      this.jdwpData = Buffer.from(params.debugJDWP);
    } else if (process.env.ORA_DEBUG_JDWP) {
      this.jdwpData = Buffer.from(process.env.ORA_DEBUG_JDWP);
    }
    this._protocol.connInProgress = false;
  }

  //---------------------------------------------------------------------------
  // Return the statement to the statement cache, if applicable
  //---------------------------------------------------------------------------
  _returnStatement(statement) {
    this.statementCache.returnStatement(statement);
  }

  //---------------------------------------------------------------------------
  // Parses the sql statement and puts it into cache if keepInStmtCache
  // option is true
  //---------------------------------------------------------------------------
  _prepare(sql, options) {
    const statement = this._getStatement(sql, options.keepInStmtCache);
    statement.bufferRowIndex = 0;
    statement.bufferRowCount = 0;
    statement.lastRowIndex = 0;
    statement.moreRowsToFetch = true;
    return statement;
  }

  //---------------------------------------------------------------------------
  // Binds the values by user to the statement object
  //---------------------------------------------------------------------------
  async _bind(stmt, variable, pos = 0) {
    const bindInfoDict = stmt.bindInfoDict;
    const bindInfoList = stmt.bindInfoList;

    /*
     * For PL/SQL blocks, if the size of a string or bytes object exceeds
     * 32,767 bytes it is converted to a BLOB/CLOB; and conversion
     * needs to be established as well to return the string in the way that
     * the user expects to get it
     */
    if (stmt.isPlSql && variable.maxSize > 32767) {
      if (variable.type === types.DB_TYPE_RAW ||
          variable.type === types.DB_TYPE_LONG_RAW) {
        variable.type = types.DB_TYPE_BLOB;
      } else if (variable.type._csfrm === constants.CSFRM_NCHAR)  {
        variable.type = types.DB_TYPE_NCLOB;
      } else {
        variable.type = types.DB_TYPE_CLOB;
      }
      const maxSize = variable.maxSize;
      delete variable.maxSize;
      variable.outConverter = async function(val) {
        if (val === null) {
          return null;
        }
        const data = await val.getData();
        const len = val._length;
        if (data && len > maxSize) {
          errors.throwErr(errors.ERR_INSUFFICIENT_BUFFER_FOR_BINDS);
        }
        return data;
      };
    }

    if (variable.type === types.DB_TYPE_CLOB ||
        variable.type === types.DB_TYPE_NCLOB ||
        variable.type === types.DB_TYPE_BLOB) {
      for (const [index, val] of variable.values.entries()) {
        if (!(val instanceof ThinLobImpl)) {
          if (val && val.length > 0) {
            const lobImpl = new ThinLobImpl();
            await lobImpl.create(this, variable.type);
            await lobImpl.write(1, val);
            variable.values[index] = lobImpl;
          } else {
            variable.values[index] = null;
          }
        }
      }
    }

    if (variable.name) {
      let normalizedName;
      if (variable.name.startsWith('"') && variable.name.endsWith('"')) {
        normalizedName = variable.name.substring(1, variable.name.length - 1);
      } else {
        normalizedName = variable.name.toUpperCase();
      }
      if (normalizedName.startsWith(':')) {
        normalizedName = variable.name.substring(1);
      }
      if (!bindInfoDict.has(normalizedName)) {
        errors.throwErr(errors.ERR_INVALID_BIND_NAME, normalizedName);
      }
      bindInfoDict.get(normalizedName).forEach((bindInfo) => {
        stmt._setVariable(bindInfo, variable);
      });
    } else {
      const bindInfo = bindInfoList[pos - 1];
      stmt._setVariable(bindInfo, variable);
    }
  }

  //---------------------------------------------------------------------------
  // _createResultSet()
  //
  // Creates a result set and performs any necessary initialization.
  //---------------------------------------------------------------------------
  _createResultSet(options, statement) {
    const resultSet = new ThinResultSetImpl();
    if (!statement) {
      statement = new Statement();
    }
    resultSet._resultSetNew(this, statement, options);
    if (statement.queryVars.length > 0) {
      const metadata = thinUtil.getMetadataMany(statement.queryVars);
      resultSet._setup(options, metadata);
    }
    return resultSet;
  }

  //---------------------------------------------------------------------------
  // getDbObjectClass()
  //
  // Returns a database object class given its name.
  //---------------------------------------------------------------------------
  async getDbObjectClass(name) {
    const info = await this._populateDbObjectTypeInfo(name);
    await this._populatePartialDbObjectTypes();
    return info;
  }

  //---------------------------------------------------------------------------
  // getStatementInfo()
  //
  // Parses the SQL statement and returns information about the statement.
  //---------------------------------------------------------------------------
  async getStatementInfo(sql) {
    const options = {};
    const result = {};
    const statement = this._prepare(sql, options);
    options.connection = this;
    try {
      if (!statement.isDdl) {
        const message = new messages.ExecuteMessage(this, statement, options);
        message.parseOnly = true;
        await this._protocol._processMessage(message);
      }
      if (statement.numQueryVars > 0) {
        result.metaData = thinUtil.getMetadataMany(statement.queryVars);
      }
      result.bindNames = Array.from(statement.bindInfoDict.keys());
      result.statementType = statement.statementType;
      return result;
    } finally {
      this._returnStatement(statement);
    }
  }

  //---------------------------------------------------------------------------
  // execute()
  //
  // Calls the RPC that executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  async execute(sql, numIters, binds, options, executeManyFlag) {
    const statement = this._prepare(sql, options);
    try {
      return await this._execute(statement, numIters, binds, options,
        executeManyFlag);
    } catch (err) {
      this._returnStatement(statement);
      throw err;
    }
  }

  //---------------------------------------------------------------------------
  // Get the statement object from the statement cache for the SQL if it exists
  // else prepare a new statement object for the SQL. If a statement is already
  // in use a copy will be made and returned (and will not be returned to the
  // cache). If a statement is being executed for the first time after releasing
  // a DRCP session, a copy will also be made (and will not be returned to the
  // cache) since it is unknown at this point whether the original session or a
  // new session is going to be used.
  //---------------------------------------------------------------------------
  _getStatement(sql, cacheStatement = false) {
    return this.statementCache.getStatement(sql, cacheStatement,
      this._drcpEstablishSession);
  }

  //---------------------------------------------------------------------------
  // Calls the ping RPC for Oracle Database
  //---------------------------------------------------------------------------
  async ping() {
    const message = new messages.PingMessage(this);
    await this._protocol._processMessage(message);
  }

  //---------------------------------------------------------------------------
  // Calls the Rollback RPC for Oracle Database
  //---------------------------------------------------------------------------
  async rollback() {
    const message = new messages.RollbackMessage(this);
    await this._protocol._processMessage(message);
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Server version
  //---------------------------------------------------------------------------
  getOracleServerVersion() {
    return this.serverVersion;
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Server version string
  //---------------------------------------------------------------------------
  getOracleServerVersionString() {
    return this.serverVersionString;
  }

  setCurrentSchema(schema) {
    this._currentSchemaModified = true;
    this.currentSchema = schema;
  }

  getCurrentSchema() {
    return this.currentSchema;
  }

  setClientId(clientId) {
    this._clientIdentifierModified = true;
    this._clientIdentifier = clientId;
  }

  setDbOp(dbOp) {
    this._dbOpModified = true;
    this._dbOp = dbOp;
  }

  setExternalName(value) {
    this.externalName = value;
  }

  setInternalName(value) {
    this.internalName = value;
  }

  setClientInfo(clientInfo) {
    this._clientInfoModified = true;
    this._clientInfo = clientInfo;
  }

  setModule(module) {
    this._moduleModified = true;
    this._module = module;

    /*
     * setting the module by itself results in an error so always force
     * action to be set as well (which eliminates this error)
     */
    this._actionModified = true;
  }

  setAction(action) {
    this._actionModified = true;
    this._action = action;
  }

  async changePassword(user, password, newPassword) {
    const config = {
      user: user,
      newPassword: newPassword,
      password: password,
      changePassword: true
    };
    const message = new messages.AuthMessage(this, config);
    await this._protocol._processMessage(message);    // OAUTH
  }

  async createLob(dbType) {
    const lobImpl = new ThinLobImpl();
    await lobImpl.create(this, dbType);
    return lobImpl;
  }

  // Check the state returned by the tpcCommit() call.
  checkTpcCommitState(state, onePhase) {
    if ((onePhase && state !== constants.TNS_TPC_TXN_STATE_READ_ONLY
      && state !== constants.TNS_TPC_TXN_STATE_COMMITTED) ||
      (!onePhase && state !== constants.TNS_TPC_TXN_STATE_FORGOTTEN)) {
      errors.throwErr(errors.ERR_UNKNOWN_TRANSACTION_STATE, state);
    }
  }

  // Creates a two-phase commit message suitable for committing a transaction.
  createTpcCommitMessage(xid, onePhase) {
    const message = new messages.TransactionChangeStateMessage(this);
    message.operation = constants.TNS_TPC_TXN_COMMIT;
    message.state = (onePhase == 0) ? constants.TNS_TPC_TXN_STATE_COMMITTED :
      constants.TNS_TPC_TXN_STATE_READ_ONLY;
    message.xid = xid;
    message.context = this.tpcContext;
    return message;
  }

  // Creates a two-phase commit rollback message suitable for use in both
  // the close() method and explicitly by the user.
  createTpcRollbackMessage(xid = null) {
    const message = new messages.TransactionChangeStateMessage(this);
    message.operation = constants.TNS_TPC_TXN_ABORT;
    message.state = constants.TNS_TPC_TXN_STATE_ABORTED;
    message.xid = xid;
    message.context = this.tpcContext;
    return message;
  }

  //---------------------------------------------------------------------------
  // tpcBegin()
  //---------------------------------------------------------------------------
  async tpcBegin(xid, flags, timeout) {
    const message = new messages.TransactionSwitchMessage(this);
    message.operation = constants.TNS_TPC_TXN_START;
    message.xid = xid;
    message.flags = flags;
    message.timeout = timeout;
    await this._protocol._processMessage(message);
    this.tpcContext = message.context;
  }

  //---------------------------------------------------------------------------
  // tpcCommit()
  //---------------------------------------------------------------------------
  async tpcCommit(xid, onePhase) {
    const message = this.createTpcCommitMessage(xid, onePhase);
    await this._protocol._processMessage(message);
    this.checkTpcCommitState(message.state, onePhase);
  }

  //---------------------------------------------------------------------------
  // tpcEnd()
  //---------------------------------------------------------------------------
  async tpcEnd(xid, flags) {
    const message = new messages.TransactionSwitchMessage(this);
    message.operation = constants.TNS_TPC_TXN_DETACH;
    message.xid = xid;
    message.context = this.tpcContext;
    message.flags = flags;
    await this._protocol._processMessage(message);
    this.tpcContext = null;
  }

  //---------------------------------------------------------------------------
  // tpcPrepare()
  //---------------------------------------------------------------------------
  async tpcPrepare(xid) {
    const message = new messages.TransactionChangeStateMessage(this);
    message.operation = constants.TNS_TPC_TXN_PREPARE;
    message.xid = xid;
    message.context = this.tpcContext;
    await this._protocol._processMessage(message);
    if (message.state === constants.TNS_TPC_TXN_STATE_REQUIRES_COMMIT) {
      return true;
    } else if (message.state === constants.TNS_TPC_TXN_STATE_READ_ONLY) {
      return false;
    }

    errors.throwErr(errors.ERR_UNKNOWN_TRANSACTION_STATE, message.state);
  }

  //---------------------------------------------------------------------------
  // tpcRollback()
  //---------------------------------------------------------------------------
  async tpcRollback(xid) {
    const message = this.createTpcRollbackMessage(xid);
    await this._protocol._processMessage(message);
    if (message.state !== constants.TNS_TPC_TXN_STATE_ABORTED) {
      errors.throwErr(errors.ERR_UNKNOWN_TRANSACTION_STATE, message.state);
    }
  }
  //---------------------------------------------------------------------------
  // Ensure no sessionless transaction was started through server procedure
  //---------------------------------------------------------------------------
  _validateSessionlessState() {
    if (this._sessionlessData?.startedOnServer) {
      errors.throwErr(errors.ERR_SESSIONLESS_DIFFERING_METHODS);
    }
  }

  //---------------------------------------------------------------------------
  // Begin/Resume a sessionless transaction with provided transactionId
  //---------------------------------------------------------------------------
  async startSessionlessTransaction(transactionId, timeout, flags,
    deferRoundTrip) {
    this._validateSessionlessState();
    if (this._sessionlessData)
      errors.throwErr(errors.ERR_SESSIONLESS_ALREADY_ACTIVE);
    const message = new messages.TransactionSwitchMessage(this);
    message.xid = {
      globalTransactionId: transactionId,
      branchQualifier: "",
      formatId: constants.TNS_TPC_TRANS_SESSIONLESS_FORMAT
    };
    message.timeout = timeout;
    message.operation = constants.TNS_TPC_TXN_START;
    message.flags = constants.TNS_TPC_TRANS_SESSIONLESS | flags;
    if (deferRoundTrip) {
      message.messageType = constants.TNS_MSG_TYPE_PIGGYBACK;
      this._sessionlessData = {
        piggyback: message,
        pending: true
      };
    } else {
      await this._protocol._processMessage(message);
    }
  }

  //---------------------------------------------------------------------------
  // Suspend the active sessionless transaction
  //---------------------------------------------------------------------------
  async suspendSessionlessTransaction() {
    this._validateSessionlessState();
    if (!this._sessionlessData)
      errors.throwErr(errors.ERR_SESSIONLESS_INACTIVE);
    const message = new messages.TransactionSwitchMessage(this);
    message.operation = constants.TNS_TPC_TXN_DETACH;
    message.flags = constants.TNS_TPC_TRANS_SESSIONLESS;
    await this._protocol._processMessage(message);
  }


  //---------------------------------------------------------------------------
  // Returns the statement cache size for the statement cache maintained by
  // the connection object
  //---------------------------------------------------------------------------
  getStmtCacheSize() {
    return this.statementCache._maxSize;
  }

  setCallTimeout(timeout) {
    this._protocol.callTimeout = timeout;
  }

  getCallTimeout() {
    return this._protocol.callTimeout;
  }

  //---------------------------------------------------------------------------
  // Returns getTag. Actual tag returned by db must be a string.
  //---------------------------------------------------------------------------
  getTag() {
    return '';
  }

  getExternalName() {
    return this.externalName;
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Database instance name associated with the connection.
  //---------------------------------------------------------------------------
  getInstanceName() {
    return this.instanceName;
  }

  getInternalName() {
    return this.internalName;
  }

  //---------------------------------------------------------------------------
  // Returns the Logical Transaction ID (ltxid) associated with the connection.
  // Used with Oracle Database Transaction Guard feature.
  //---------------------------------------------------------------------------
  getLTXID() {
    return this._ltxid;
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Database domain name associated with the connection.
  //---------------------------------------------------------------------------
  getDbDomain() {
    return this.dbDomain;
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Database host name associated with the connection.
  //---------------------------------------------------------------------------
  getHostName() {
    return this.nscon.ntAdapter.hostName;
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Database port number associated with the connection.
  //---------------------------------------------------------------------------
  getPort() {
    return this.nscon.ntAdapter.port;
  }

  //---------------------------------------------------------------------------
  // Returns the protocol associated with the connection.
  //---------------------------------------------------------------------------
  getProtocol() {
    return (this.nscon.ntAdapter.secure) ? 'TCPS' : 'TCP';
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Database name associated with the connection.
  //---------------------------------------------------------------------------
  getDbName() {
    return this.dbName;
  }

  //---------------------------------------------------------------------------
  // Returns maximum number of cursors that can be opened in one session.
  //---------------------------------------------------------------------------
  getMaxOpenCursors() {
    return this.maxOpenCursors;
  }

  //---------------------------------------------------------------------------
  // Returns the maximum length of identifiers supported by the database to
  // which this connection has been established.
  //---------------------------------------------------------------------------
  getMaxIdentifierLength() {
    return this.maxIdentifierLength;
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Database service name associated with the connection.
  //---------------------------------------------------------------------------
  getServiceName() {
    return this.serviceName;
  }

  //---------------------------------------------------------------------------
  // Returns boolean based on this._protocol.txnInProgress value.
  //---------------------------------------------------------------------------
  getTransactionInProgress() {
    return this._protocol.txnInProgress;
  }

  //---------------------------------------------------------------------------
  // Returns the warning object.
  //---------------------------------------------------------------------------
  getWarning() {
    return this.warning;
  }
}
module.exports = ThinConnectionImpl;
