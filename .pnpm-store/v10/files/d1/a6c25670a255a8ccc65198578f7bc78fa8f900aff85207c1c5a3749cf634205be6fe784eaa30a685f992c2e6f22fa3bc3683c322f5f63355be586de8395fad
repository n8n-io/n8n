// Copyright (c) 2016, 2025, Oracle and/or its affiliates.

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

const AqQueue = require('./aqQueue.js');
const BaseDbObject = require('./dbObject.js');
const { Buffer } = require('buffer');
const Lob = require('./lob.js');
const ResultSet = require('./resultset.js');
const SodaDatabase = require('./sodaDatabase.js');
const EventEmitter = require('events');
const QueryStream = require('./queryStream.js');
const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const impl = require('./impl');
const process = require('process');
const util = require('util');
const constants = require('./constants.js');
const settings = require('./settings.js');
const transformer = require('./transformer.js');
const types = require('./types.js');
const oson = require('./impl/datahandlers/oson.js');

// global mapping of subscriptions; these cannot be tied to a particular
// connection or pool since subscriptions can be created with one connection
// and destroyed with another!
const _subscriptions = new Map();

// default closure for NUMBER type.
const defaultNumberConverter = (v) => (v === null) ? null : parseFloat(v);

//---------------------------------------------------------------------------
// _determineDbObjTypeConverter()
//
// Determines the converter associated with each DB type and its metadata.
// This function is called once during metadata construction and the
// converters are invoked when retriving DBObject values.
//---------------------------------------------------------------------------
function _determineDbObjTypeConverter(metadata, options) {
  // clear any previous converter functions that may have been
  // retained
  delete metadata.converter;

  // If a DBfetch type handler is specified, update converter,
  // if available.
  if (options.dbObjectTypeHandler) {
    const result = options.dbObjectTypeHandler(metadata);
    if (result !== undefined) {
      errors.assert(typeof result === 'object',
        errors.ERR_DB_FETCH_TYPE_HANDLER_RETURN_VALUE);
      if (result.converter !== undefined) {
        errors.assert(typeof result.converter === 'function',
          errors.ERR_DB_FETCH_TYPE_HANDLER_CONVERTER);
      }
      if ([types.DB_TYPE_CLOB, types.DB_TYPE_NCLOB, types.DB_TYPE_BLOB,
        types.DB_TYPE_BFILE].includes(metadata.type)) {
        // converters for LOB's are not supported.
        return errors.throwErr(errors.ERR_NOT_IMPLEMENTED,
          'DbObjConverter for LOBs');
      }
      metadata.converter = result.converter;
    }
  }
  if (metadata.type === types.DB_TYPE_NUMBER && !metadata.converter) {
    // set default converter for NUMBER type as they are returned as strings
    // from DB.
    metadata.converter = defaultNumberConverter;
  }
}

// define class
class Connection extends EventEmitter {

  constructor() {
    super();
    this._dbObjectClasses = new Map();
    this._closing = false;
  }

  //---------------------------------------------------------------------------
  // _addDefaultsToExecOpts()
  //
  // Add values to the execute options from the global settings, if needed.
  //---------------------------------------------------------------------------
  _addDefaultsToExecOpts(options) {
    options.connection = this;
    if (options.keepInStmtCache === undefined)
      options.keepInStmtCache = true;
    if (options.suspendOnSuccess === undefined)
      options.suspendOnSuccess = false;
    settings.addToOptions(options,
      "autoCommit",
      "dbObjectAsPojo",
      "fetchArraySize",
      "fetchTypeHandler",
      "maxRows",
      "outFormat",
      "prefetchRows");
  }

  //---------------------------------------------------------------------------
  // _buildDbObjectClass()
  //
  // Builds and returns a database object class given the object type
  // information supplied by the implementation.
  //---------------------------------------------------------------------------
  _buildDbObjectClass(objType) {
    const DbObject = function(initialValue) {
      this._impl = new impl.DbObjectImpl(objType);
      if (this.isCollection) {
        const proxy = new Proxy(this, BaseDbObject._collectionProxyHandler);
        if (initialValue !== undefined) {
          for (let i = 0; i < initialValue.length; i++) {
            this.append(initialValue[i]);
          }
        }
        return (proxy);
      } else if (initialValue !== undefined) {
        for (const attr of objType.attributes) {
          const value = initialValue[attr.name];
          if (value !== undefined) {
            this._setAttrValue(attr, value);
          }
        }
      }
    };
    DbObject.prototype = Object.create(BaseDbObject.prototype);
    DbObject.prototype.constructor = DbObject;
    DbObject.prototype._objType = objType;
    if (objType.elementTypeClass) {
      const cls = this._getDbObjectClass(objType.elementTypeClass);
      objType.elementTypeClass = cls;
    }
    const options = {dbObjectTypeHandler: settings.dbObjectTypeHandler};
    if (objType.isCollection) {
      nodbUtil.addTypeProperties(objType, "elementType");
      objType.elementTypeInfo.type = objType.elementType;
      _determineDbObjTypeConverter(objType.elementTypeInfo, options);
    }
    if (objType.attributes) {
      const props = {};
      for (const attr of objType.attributes) {
        if (attr.typeClass) {
          attr.typeClass = this._getDbObjectClass(attr.typeClass);
        }
        nodbUtil.addTypeProperties(attr, "type");
        const prop = {
          get() {
            return this._getAttrValue(attr);
          },
          set(value) {
            this._setAttrValue(attr, value);
          }
        };
        props[attr.name] = prop;

        // calculate for each attribute metadata as converters might change
        // based on precision, scale, maxSize,..
        _determineDbObjTypeConverter(attr, options);
      }
      Object.defineProperties(DbObject.prototype, props);
    }
    DbObject.toString = function() {
      return ('DbObjectClass [' + objType.fqn + ']');
    };
    return (DbObject);
  }

  //---------------------------------------------------------------------------
  // _getDbObjectClass()
  //
  // Returns the database object class given the object type information
  // supplied by the implementation. The cache is searched first to see if an
  // object class has already been built.
  //---------------------------------------------------------------------------
  _getDbObjectClass(objType) {
    if (objType.prototype instanceof BaseDbObject)
      return objType;
    let cls = this._dbObjectClasses.get(objType);
    if (!cls) {
      cls = this._buildDbObjectClass(objType);
      cls._connection = this;
      cls._objType = objType;
      objType._connection = this._impl;
      this._dbObjectClasses.set(objType, cls);
    }
    return (cls);
  }

  //---------------------------------------------------------------------------
  // _getDbObjectClassForName()
  //
  // Returns the database object class given the name of the database object
  // type. The cache is searched first to see if an object class has already
  // been built.
  //---------------------------------------------------------------------------
  async _getDbObjectClassForName(name) {
    let cls = this._dbObjectClasses.get(name);
    if (!cls) {
      const objType = await this._impl.getDbObjectClass(name);
      cls = this._getDbObjectClass(objType);
      this._dbObjectClasses.set(name, cls);
    }
    return cls;
  }

  //---------------------------------------------------------------------------
  // _isBindDir()
  //
  // Returns a boolean indicating if the supplied value is a valid bind
  // direction.
  //---------------------------------------------------------------------------
  _isBindDir(value) {
    return (
      value === constants.BIND_IN ||
      value === constants.BIND_OUT ||
      value === constants.BIND_INOUT
    );
  }

  //---------------------------------------------------------------------------
  // _isBindValue()
  //
  // Returns a boolean indicating if the supplied value is one that can be
  // bound.
  //---------------------------------------------------------------------------
  _isBindValue(value) {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'number' ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      Array.isArray(value) ||
      nodbUtil.isVectorValue(value) ||
      Buffer.isBuffer(value) ||
      util.types.isDate(value) ||
      value instanceof Lob ||
      value instanceof ResultSet ||
      value instanceof BaseDbObject
    );
  }

  //---------------------------------------------------------------------------
  // _processBindUnit()
  //
  // Processes a bind unit (object) supplied by the user and returns the value
  // stored in it (if one is).
  //---------------------------------------------------------------------------
  async _processBindUnit(bindInfo, bindUnit, inExecuteMany) {
    let okBindUnit = false;

    // get and validate bind direction; if not specified, IN is assumed
    if (bindUnit.dir === undefined) {
      bindInfo.dir = constants.BIND_IN;
    } else {
      errors.assert(this._isBindDir(bindUnit.dir),
        errors.ERR_INVALID_BIND_DIRECTION);
      bindInfo.dir = bindUnit.dir;
      okBindUnit = true;
    }

    // get and validate bind type; it must be one of the integer constants
    // identifying types, a string identifying an object type or a constructor
    // function identifying an object type
    if (bindUnit.type !== undefined) {
      if (typeof bindUnit.type === 'string') {
        bindInfo.type = types.DB_TYPE_OBJECT;
        bindInfo.typeClass = await this._getDbObjectClassForName(bindUnit.type);
        bindInfo.objType = bindInfo.typeClass._objType;
      } else if (bindUnit.type.prototype instanceof BaseDbObject) {
        bindInfo.type = types.DB_TYPE_OBJECT;
        bindInfo.typeClass = bindUnit.type;
        bindInfo.objType = bindInfo.typeClass._objType;
      } else {
        errors.assert(bindUnit.type instanceof types.DbType,
          errors.ERR_INVALID_BIND_DATA_TYPE, 2);
        bindInfo.type = bindUnit.type;
      }
      okBindUnit = true;

    // when calling executeMany(), bind type is mandatory
    } else if (inExecuteMany) {
      if (bindInfo.name)
        errors.throwErr(errors.ERR_MISSING_TYPE_BY_NAME, bindInfo.name);
      errors.throwErr(errors.ERR_MISSING_TYPE_BY_POS, bindInfo.pos);
    }

    // get and validate the maximum size for strings/buffers; this value is
    // used for IN/OUT and OUT binds in execute() and at all times for
    // executeMany()
    if (bindInfo.dir !== constants.BIND_IN || inExecuteMany) {
      if (bindUnit.maxSize !== undefined) {
        errors.assertParamPropValue(Number.isInteger(bindUnit.maxSize) &&
          bindUnit.maxSize > 0, 2, "maxSize");
        bindInfo.maxSize = bindUnit.maxSize;
        bindInfo.checkSize = true;
        okBindUnit = true;
      } else if (inExecuteMany) {
        if (bindInfo.type === types.DB_TYPE_VARCHAR ||
            bindInfo.type === types.DB_TYPE_RAW) {
          if (bindInfo.name)
            errors.throwErr(errors.ERR_MISSING_MAX_SIZE_BY_NAME, bindInfo.name);
          errors.throwErr(errors.ERR_MISSING_MAX_SIZE_BY_POS, bindInfo.pos);
        }
      } else {
        bindInfo.maxSize = constants.DEFAULT_MAX_SIZE_FOR_OUT_BINDS;
      }
    }

    // get max array size (for array binds, not possible in executeMany())
    bindInfo.isArray = false;
    if (!inExecuteMany) {
      if (bindUnit.maxArraySize !== undefined) {
        errors.assertParamPropValue(Number.isInteger(bindUnit.maxArraySize) &&
          bindUnit.maxArraySize > 0, 2, "maxArraySize");
        bindInfo.maxArraySize = bindUnit.maxArraySize;
        bindInfo.isArray = true;
      }
    }

    // get the value, if specified (not used in executeMany())
    if (!inExecuteMany && bindUnit.val !== undefined) {
      return bindUnit.val;
    }

    if (!okBindUnit)
      errors.throwErr(errors.ERR_INVALID_BIND_UNIT);
  }

  //---------------------------------------------------------------------------
  // _processBindValue()
  //
  // Processes the bind value supplied by the caller. This performs all checks
  // on the value and normalizes it for use by the implementation class. If no
  // bind info has been defined yet, the value defines that.
  //---------------------------------------------------------------------------
  async _processBindValue(bindInfo, value, options) {
    const transformed = transformer.transformValueIn(bindInfo, value, options);
    if (bindInfo.isArray) {
      bindInfo.values = transformed.concat(bindInfo.values.slice(transformed.length));
    } else {
      bindInfo.values[options.pos] = transformed;
    }
    if (bindInfo.type === types.DB_TYPE_OBJECT &&
        bindInfo.typeClass === undefined) {
      bindInfo.typeClass = await this._getDbObjectClass(value._objType);
      bindInfo.objType = bindInfo.typeClass._objType;
    }
  }

  //---------------------------------------------------------------------------
  // _processExecuteBind()
  //
  // Processes a single execute bind supplied by the caller. This performs all
  // checks on the bind and normalizes it for use by the implementation class.
  //---------------------------------------------------------------------------
  async _processExecuteBind(bindInfo, bindData) {

    // setup defaults
    bindInfo.isArray = false;

    // if bind data is a value that can be bound directly, use it; otherwise,
    // scan the bind unit for bind information and its value
    let bindValue;
    if (this._isBindValue(bindData)) {
      bindInfo.dir = constants.BIND_IN;
      bindValue = bindData;
    } else {
      bindValue = await this._processBindUnit(bindInfo, bindData, false);
    }

    // for IN and IN/OUT binds, process the value
    if (bindInfo.dir !== constants.BIND_OUT) {
      const options = {pos: 0, allowArray: true};
      await this._processBindValue(bindInfo, bindValue, options);
    }

    // if only null values were found (or an OUT bind was specified), type
    // information may not be set, so complete bind information as a string
    // and set the maxSize to 1 if it has not already been set
    if (bindInfo.type === undefined) {
      bindInfo.type = types.DB_TYPE_VARCHAR;
      if (bindInfo.maxSize === undefined)
        bindInfo.maxSize = 1;
    }

    // check valid bind type for array binds
    if (bindInfo.isArray &&
        bindInfo.type !== types.DB_TYPE_VARCHAR &&
        bindInfo.type !== types.DB_TYPE_NVARCHAR &&
        bindInfo.type !== types.DB_TYPE_CHAR &&
        bindInfo.type !== types.DB_TYPE_NCHAR &&
        bindInfo.type !== types.DB_TYPE_NUMBER &&
        bindInfo.type !== types.DB_TYPE_BINARY_FLOAT &&
        bindInfo.type !== types.DB_TYPE_BINARY_DOUBLE &&
        bindInfo.type !== types.DB_TYPE_DATE &&
        bindInfo.type !== types.DB_TYPE_TIMESTAMP &&
        bindInfo.type !== types.DB_TYPE_TIMESTAMP_LTZ &&
        bindInfo.type !== types.DB_TYPE_TIMESTAMP_TZ &&
        bindInfo.type !== types.DB_TYPE_RAW &&
        bindInfo.type !== types.DB_TYPE_INTERVAL_YM &&
        bindInfo.type !== types.DB_TYPE_INTERVAL_DS) {
      errors.throwErr(errors.ERR_INVALID_TYPE_FOR_ARRAY_BIND);
    }

  }

  //---------------------------------------------------------------------------
  // _processExecuteBinds()
  //
  // Processes the binds supplied by the caller. This performs all checks on
  // the binds and normalizes them for use by the implementation class.
  //---------------------------------------------------------------------------
  async _processExecuteBinds(binds) {
    const normBinds = [];
    if (Array.isArray(binds)) {
      for (let i = 0; i < binds.length; i++) {
        const bindInfo = normBinds[i] = {pos: i + 1, values: []};
        await this._processExecuteBind(bindInfo, binds[i]);
      }
    } else {
      errors.assertParamValue(nodbUtil.isObject(binds), 2);
      const bindNames = Object.getOwnPropertyNames(binds);
      for (let i = 0; i < bindNames.length; i++) {
        const bindInfo = normBinds[i] = {name: bindNames[i], values: []};
        await this._processExecuteBind(bindInfo, binds[bindNames[i]]);
      }
    }
    return normBinds;
  }

  //---------------------------------------------------------------------------
  // _processExecuteManyBinds()
  //
  // Processes the binds supplied by the caller. This performs all checks on
  // the binds and normalizes them for use by the implementation class.
  //---------------------------------------------------------------------------
  async _processExecuteManyBinds(binds, bindDefs) {
    const normBinds = [];
    let byPosition;

    // transform bindDefs into normalized binds, if available
    if (bindDefs !== undefined) {
      if (Array.isArray(bindDefs)) {
        byPosition = true;
        for (let i = 0; i < bindDefs.length; i++) {
          const bindInfo = normBinds[i] = {pos: i + 1, values: []};
          await this._processBindUnit(bindInfo, bindDefs[i], true);
        }
      } else {
        byPosition = false;
        const bindNames = Object.getOwnPropertyNames(bindDefs);
        for (let i = 0; i < bindNames.length; i++) {
          const bindInfo = normBinds[i] = {name: bindNames[i], values: []};
          await this._processBindUnit(bindInfo, bindDefs[bindNames[i]], true);
        }
      }

    // otherwise, use the first row to determine the binds to use
    } else {
      const row = binds[0];
      errors.assertParamValue(nodbUtil.isObjectOrArray(row), 2);
      if (Array.isArray(row)) {
        byPosition = true;
        for (let i = 0; i < row.length; i++) {
          normBinds[i] = {pos: i + 1};
        }
      } else {
        byPosition = false;
        const bindNames = Object.getOwnPropertyNames(row);
        for (let i = 0; i < bindNames.length; i++) {
          normBinds[i] = {name: bindNames[i]};
        }
      }
      for (let i = 0; i < normBinds.length; i++) {
        normBinds[i].dir = constants.BIND_IN;
        normBinds[i].isArray = false;
        normBinds[i].values = [];
      }
    }

    // process each of the rows
    for (let i = 0; i < binds.length; i++) {
      const row = binds[i];
      const options = {pos: i, allowArray: false};
      errors.assert((byPosition && Array.isArray(row)) ||
        (!byPosition && nodbUtil.isObject(row)), errors.ERR_MIXED_BIND);
      for (let j = 0; j < normBinds.length; j++) {
        const bindInfo = normBinds[j];
        const value = (byPosition) ? row[j] : row[bindInfo.name];
        await this._processBindValue(bindInfo, value, options);
      }
    }

    // set bind type and size to a string of size 1 if no bind type was
    // specified (and all values are null)
    for (let i = 0; i < normBinds.length; i++) {
      const bindInfo = normBinds[i];
      if (bindInfo.type === undefined) {
        bindInfo.type = types.DB_TYPE_VARCHAR;
        bindInfo.maxSize = 1;
      }
    }

    return normBinds;
  }

  //---------------------------------------------------------------------------
  // _transformOutBind()
  //
  // Transform an output bind value from an implementation value to a user
  // facing value (for result sets and LOBs). DML returning output variables
  // are always an array of values.
  //---------------------------------------------------------------------------
  _transformOutBind(val, options) {
    let outVal = val;
    if (Array.isArray(val)) {
      outVal = [];
      for (let i = 0; i < val.length; i++)
        outVal.push(this._transformOutBind(val[i], options));
    } else if (val instanceof impl.ResultSetImpl) {
      outVal = new ResultSet();
      outVal._setup(this, val);
    } else if (val instanceof impl.LobImpl) {
      outVal = new Lob();
      outVal._setup(val, true);
    } else if (val instanceof impl.DbObjectImpl) {
      const cls = this._dbObjectClasses.get(val._objType);
      outVal = Object.create(cls.prototype);
      outVal._impl = val;
      if (options.dbObjectAsPojo) {
        outVal = outVal._toPojo();
      } else if (outVal.isCollection) {
        outVal = new Proxy(outVal, BaseDbObject._collectionProxyHandler);
      }
    }
    return outVal;
  }

  //---------------------------------------------------------------------------
  // _verifyExecOpts
  //
  // Verify that the value passed by the user for binds is acceptable. Perform
  // any transformations necessary.
  //---------------------------------------------------------------------------
  _verifyExecOpts(options, inExecuteMany) {

    // define normalized options (value returned to caller)
    const outOptions = {};

    // handle common options
    errors.assertParamValue(nodbUtil.isObject(options), 3);

    // autoCommit must be a boolean value
    if (options.autoCommit !== undefined) {
      errors.assertParamPropValue(typeof options.autoCommit === 'boolean', 3,
        "autoCommit");
      outOptions.autoCommit = options.autoCommit;
    }

    // dbObjectAsPojo must be a boolean value
    if (options.dbObjectAsPojo !== undefined) {
      errors.assertParamPropValue(typeof options.dbObjectAsPojo === 'boolean',
        3, "dbObjectAsPojo");
      outOptions.dbObjectAsPojo = options.dbObjectAsPojo;
    }

    // keepInStmtCache must be a boolean value
    if (options.keepInStmtCache !== undefined) {
      errors.assertParamPropValue(typeof options.keepInStmtCache === 'boolean',
        3, "keepInStmtCache");
      outOptions.keepInStmtCache = options.keepInStmtCache;
    }

    if (options.suspendOnSuccess !== undefined) {
      errors.assertParamPropBool(options, 2, "suspendOnSucess");
      outOptions.suspendOnSuccess = options.suspendOnSuccess;
    }

    // handle options specific to executeMany()
    if (inExecuteMany) {

      // bindDefs must be an object or array
      if (options.bindDefs !== undefined) {
        errors.assertParamPropValue(nodbUtil.isObjectOrArray(options.bindDefs),
          3, "bindDefs");
        outOptions.bindDefs = options.bindDefs;
      }

      // batchErrors must be a boolean value
      if (options.batchErrors !== undefined) {
        errors.assertParamPropValue(typeof options.batchErrors === 'boolean',
          3, "batchErrors");
        outOptions.batchErrors = options.batchErrors;
      }

      // dmlRowCounts must be a boolean value
      if (options.dmlRowCounts !== undefined) {
        errors.assertParamPropValue(typeof options.dmlRowCounts === 'boolean',
          3, "dmlRowCounts");
        outOptions.dmlRowCounts = options.dmlRowCounts;
      }

    // handle options specific to execute()
    } else {

      // fetchArraySize must be a positive integer
      errors.assertParamPropUnsignedIntNonZero(options, 3, "fetchArraySize");
      outOptions.fetchArraySize = options.fetchArraySize;

      // fetchInfo must be an object with keys containing an object with a
      // "type" property; these are converted to an array of objects for ease
      // of processing by the implementation
      if (options.fetchInfo !== undefined) {
        errors.assertParamPropValue(nodbUtil.isObject(options.fetchInfo), 3,
          "fetchInfo");
        const names = Object.getOwnPropertyNames(options.fetchInfo);
        const map = new Map(settings.fetchTypeMap);
        for (const name of names) {
          const info = options.fetchInfo[name];
          if (info.type === undefined)
            errors.throwErr(errors.ERR_NO_TYPE_FOR_CONVERSION);
          if (info.type !== constants.DEFAULT &&
              info.type !== types.DB_TYPE_VARCHAR &&
              info.type !== types.DB_TYPE_RAW) {
            errors.throwErr(errors.ERR_INVALID_TYPE_FOR_CONVERSION);
          }
          map.set(name, info.type);
        }
        outOptions.fetchTypeMap = map;
      }

      // fetchTypeHandler must be a function which is called for each column to
      // be fetched and accepts the metadata for a column
      if (options.fetchTypeHandler !== undefined) {
        const type = (typeof options.fetchTypeHandler);
        errors.assertParamPropValue(type === 'function', 3, "fetchTypeHandler");
        outOptions.fetchTypeHandler = options.fetchTypeHandler;
      }

      // maxRows must be a positive integer (or 0)
      if (options.maxRows !== undefined) {
        errors.assertParamPropValue(Number.isInteger(options.maxRows) &&
          options.maxRows >= 0, 3, "maxRows");
        outOptions.maxRows = options.maxRows;
      }

      // outFormat must be one of the two possible constants
      if (options.outFormat !== undefined) {
        errors.assertParamPropValue(
          options.outFormat === constants.OUT_FORMAT_ARRAY ||
          options.outFormat === constants.OUT_FORMAT_OBJECT, 3, "outFormat");
        outOptions.outFormat = options.outFormat;
      }

      // prefetchRows must be a positive integer (or 0)
      if (options.prefetchRows !== undefined) {
        errors.assertParamPropValue(Number.isInteger(options.prefetchRows) &&
          options.prefetchRows >= 0, 3, "prefetchRows");
        outOptions.prefetchRows = options.prefetchRows;
      }

      // resultSet must be a boolean value
      if (options.resultSet !== undefined) {
        errors.assertParamPropValue(typeof options.resultSet === 'boolean', 3,
          "resultSet");
        outOptions.resultSet = options.resultSet;
      }

    }

    return outOptions;
  }

  //---------------------------------------------------------------------------
  // action
  //
  // Property for end-to-end tracing attribute.
  //---------------------------------------------------------------------------
  get action() {
    return null;
  }

  set action(value) {
    errors.assertPropValue(typeof value === 'string', "action");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setAction(value);
  }

  //---------------------------------------------------------------------------
  // beginSessionlessTransaction()
  //
  // Begin a new sessionless transaction with provided transactionId.
  // If transactionId wasn't provided a random-generated transactionId will be
  // used and returned.
  //---------------------------------------------------------------------------
  async beginSessionlessTransaction(options = {}) {
    errors.assertArgCount(arguments, 0, 1);
    errors.assertParamValue(nodbUtil.isObject(options), 1);
    if (options.transactionId !== undefined)
      errors.assertParamPropValue(
        nodbUtil.isTransactionId(options.transactionId), 1, 'transactionId');
    errors.assertParamPropUnsignedIntNonZero(options, 1, 'timeout');
    errors.assertParamPropBool(options, 1, 'deferRoundTrip');
    const normalizedTransactionId =
      nodbUtil.normalizeTransactionId(options.transactionId);
    const {timeout = 60, deferRoundTrip = false} = options;
    await this._impl.startSessionlessTransaction(normalizedTransactionId,
      timeout, constants.TPC_BEGIN_NEW, deferRoundTrip);
    return normalizedTransactionId;
  }

  //---------------------------------------------------------------------------
  // breakExecution()
  //
  // Breaks execution of a running statement.
  //---------------------------------------------------------------------------
  async breakExecution() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    await this._impl.breakExecution();
  }

  //---------------------------------------------------------------------------
  // callTimeout
  //
  // Property for round-trip timeouts.
  //---------------------------------------------------------------------------
  get callTimeout() {
    if (this._impl)
      return this._impl.getCallTimeout();
    return undefined;
  }

  set callTimeout(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "callTimeout");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setCallTimeout(value);
  }

  //---------------------------------------------------------------------------
  // changePassword()
  //
  // Changes the password of the specified user.
  //---------------------------------------------------------------------------
  async changePassword(user, password, newPassword) {
    errors.assertArgCount(arguments, 3, 3);
    errors.assertParamValue(typeof user === 'string', 1);
    errors.assertParamValue(typeof password === 'string', 2);
    errors.assertParamValue(typeof newPassword === 'string', 3);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    await this._impl.changePassword(user, password, newPassword);
  }

  //---------------------------------------------------------------------------
  // clientId
  //
  // Property for end-to-end tracing attribute.
  //---------------------------------------------------------------------------
  get clientId() {
    return null;
  }

  set clientId(value) {
    errors.assertPropValue(typeof value === 'string', "clientId");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setClientId(value);
  }

  //---------------------------------------------------------------------------
  // clientInfo
  //
  // Property for end-to-end tracing attribute.
  //---------------------------------------------------------------------------
  get clientInfo() {
    return null;
  }

  set clientInfo(value) {
    errors.assertPropValue(typeof value === 'string', "clientInfo");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setClientInfo(value);
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Closes the connection and makes it unusable for further work.
  //---------------------------------------------------------------------------
  async close(a1) {
    let options = {};

    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      errors.assertParamValue(nodbUtil.isObject(a1), 1);
      options = a1;
      errors.assertParamPropBool(options, 1, "drop");
    }
    errors.assert(this._impl && !this._closing, errors.ERR_INVALID_CONNECTION);

    this._closing = true;
    try {
      await this._impl.close(options);
    } finally {
      this._closing = false;
    }

    delete this._impl;
    if (!this.thin) {
      for (const cls of this._dbObjectClasses.values()) {
        cls._objType.refCleanup();
      }
    }
    this._dbObjectClasses.clear();
    this.emit('_afterConnClose');
  }

  //---------------------------------------------------------------------------
  // commit()
  //
  // Commits the current transaction.
  //---------------------------------------------------------------------------
  async commit() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    await this._impl.commit();
  }

  //---------------------------------------------------------------------------
  // createLob()
  //
  // Creates a temporary LOB and returns it to the caller.
  //---------------------------------------------------------------------------
  async createLob(type) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(type === types.DB_TYPE_CLOB ||
      type === types.DB_TYPE_BLOB ||
      type === types.DB_TYPE_NCLOB, 1);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    const lob = new Lob();
    lob._setup(await this._impl.createLob(type), false);
    return lob;
  }

  //---------------------------------------------------------------------------
  // currentSchema
  //
  // Property for identifying the current schema to use in the database.
  //---------------------------------------------------------------------------
  get currentSchema() {
    if (this._impl)
      return this._impl.getCurrentSchema();
    return undefined;
  }

  set currentSchema(value) {
    errors.assertPropValue(typeof value === 'string', "currentSchema");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setCurrentSchema(value);
  }

  //---------------------------------------------------------------------------
  // dbOp
  //
  // Property for end-to-end tracing attribute.
  //---------------------------------------------------------------------------
  get dbOp() {
    return null;
  }

  set dbOp(value) {
    errors.assertPropValue(typeof value === 'string', "dbOp");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setDbOp(value);
  }

  //---------------------------------------------------------------------------
  // thin()
  //
  // return true, if driver mode is thin while acquiring connection
  // return false, if driver mode is thick while acquiring connection
  //---------------------------------------------------------------------------
  get thin() {
    return settings.thin;
  }

  //---------------------------------------------------------------------------
  // ecid
  //
  // Property for end-to-end tracing attribute.
  //---------------------------------------------------------------------------
  get ecid() {
    return null;
  }

  set ecid(value) {
    errors.assertPropValue(typeof value === 'string', "ecid");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setECID(value);
  }

  //---------------------------------------------------------------------------
  // decode()
  //
  // Decodes OSON Buffer to JS data type.
  //---------------------------------------------------------------------------
  decodeOSON(buf) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Buffer.isBuffer(buf), 1);
    const decoder = new oson.OsonDecoder(buf);
    return decoder.decode();
  }


  //---------------------------------------------------------------------------
  // encode()
  //
  // Encodes the JS value into OSON bytes.
  //---------------------------------------------------------------------------
  encodeOSON(value) {
    const encoder = new oson.OsonEncoder();
    return encoder.encode(transformer.transformJsonValue(value), this._impl._osonMaxFieldNameSize);
  }

  //---------------------------------------------------------------------------
  // execute()
  //
  // Executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  async execute(sql, a2, a3) {
    const numIters = 1;
    let binds = [];
    let options = {};

    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    // process arguments
    if (nodbUtil.isObject(sql) && typeof sql.statement === 'string') {
      errors.assertArgCount(arguments, 1, 2);
      if (sql.values) {
        if (this._impl._callLevelTraceData) {
          this._impl._callLevelTraceData.values = sql.values;
        }
        binds = await this._processExecuteBinds(sql.values);
      }
      sql = sql.statement;
      if (arguments.length == 2) {
        options = this._verifyExecOpts(a2, false);
      }
    } else {
      errors.assertArgCount(arguments, 1, 3);
      errors.assertParamValue(typeof sql === 'string', 1);
      if (arguments.length >= 2) {
        if (this._impl._callLevelTraceData) {
          this._impl._callLevelTraceData.values = a2;
        }
        binds = await this._processExecuteBinds(a2);
      }
      if (arguments.length == 3) {
        options = this._verifyExecOpts(a3, false);
      }
    }
    this._addDefaultsToExecOpts(options);

    // perform actual execute
    let result;
    try {
      if (this._impl._callLevelTraceData) {
        this._impl._callLevelTraceData.statement = sql;
      }
      result = await this._impl.execute(sql, numIters, binds, options, false);
    } catch (err) {
      if (err.errorNum === 1406)
        errors.throwErr(errors.ERR_INSUFFICIENT_BUFFER_FOR_BINDS);
      throw err;
    }

    // convert ORA errors to NJS
    if (result.warning) {
      result.warning = errors.transformErr(result.warning);
    }

    // process queries; if a result set is not desired, fetch all of the rows
    // from the result set and then destroy the result set
    if (result.resultSet !== undefined) {
      const resultSet = new ResultSet();
      resultSet._setup(this, result.resultSet);
      result.metaData = resultSet._impl.metaData;
      if (options.resultSet) {
        result.resultSet = resultSet;
      } else {
        result.rows = await resultSet._getAllRows();
        delete result.resultSet;
      }
    }

    // process output binds
    if (result.outBinds !== undefined) {
      for (const [key, value] of Object.entries(result.outBinds)) {
        const val = this._transformOutBind(value, options);
        result.outBinds[key] = val;
      }
    }

    // process implicit results; ensure all implicit results have their fetch
    // array size fixed, or, if a result set is not requested, that all rows
    // are fetched
    if (result.implicitResults) {
      for (const [key, impl] of Object.entries(result.implicitResults)) {
        const resultSet = new ResultSet();
        resultSet._setup(this, impl);
        if (options.resultSet) {
          result.implicitResults[key] = resultSet;
        } else {
          result.implicitResults[key] = await resultSet._getAllRows();
        }
      }
    }

    return (result);
  }

  //---------------------------------------------------------------------------
  // executeMany()
  //
  // Executes a SQL statement multiple times and returns the results.
  //---------------------------------------------------------------------------
  async executeMany(sql, bindsOrNumIters, a3) {
    let options = {};
    let binds = [];
    let numIters;

    errors.assertArgCount(arguments, 2, 3);
    errors.assertParamValue(typeof sql === 'string', 1);
    if (arguments.length == 3) {
      options = this._verifyExecOpts(a3, true);
    }
    this._addDefaultsToExecOpts(options);
    if (typeof bindsOrNumIters === 'number') {
      errors.assertParamValue(Number.isInteger(bindsOrNumIters) &&
        bindsOrNumIters > 0, 2);
      numIters = bindsOrNumIters;
      if (options.bindDefs !== undefined) {
        binds = await this._processExecuteManyBinds([], options.bindDefs);
      }
    } else {
      errors.assertParamValue(Array.isArray(bindsOrNumIters) &&
        bindsOrNumIters.length > 0, 2);
      numIters = bindsOrNumIters.length;
      binds = await this._processExecuteManyBinds(bindsOrNumIters,
        options.bindDefs);
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    const result = await this._impl.execute(sql, numIters, binds, options,
      true);

    // convert ORA warnings to NJS
    if (result.warning) {
      result.warning = errors.transformErr(result.warning);
    }

    // process output binds
    if (result.outBinds !== undefined) {
      for (let i = 0; i < result.outBinds.length; i++) {
        const outBind = result.outBinds[i];
        for (const [key, value] of Object.entries(outBind)) {
          outBind[key] = this._transformOutBind(value, options);
        }
      }
    }

    return result;
  }

  //---------------------------------------------------------------------------
  // externalName
  //
  // Property for identifying the external name to use in TPC logging.
  //---------------------------------------------------------------------------
  get externalName() {
    if (this._impl)
      return this._impl.getExternalName();
    return undefined;
  }

  set externalName(value) {
    errors.assertPropValue(typeof value === 'string', "externalName");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setExternalName(value);
  }

  //---------------------------------------------------------------------------
  // dbDomain (READONLY)
  //
  // Property for identifying the dbDomain of the Oracle Database.
  //---------------------------------------------------------------------------
  get dbDomain() {
    return this._impl && this._impl.getDbDomain();
  }

  //---------------------------------------------------------------------------
  // dbName (READONLY)
  //
  // Property for identifying the dbName of the Oracle Database.
  //---------------------------------------------------------------------------
  get dbName() {
    return this._impl && this._impl.getDbName();
  }

  //---------------------------------------------------------------------------
  // hostName (READONLY)
  //
  // Property for identifying the hostName of the Oracle Database.
  //---------------------------------------------------------------------------
  get hostName() {
    return this._impl && this._impl.getHostName();
  }

  //---------------------------------------------------------------------------
  // port (READONLY)
  //
  // Property for identifying the port to which client is connected.
  //---------------------------------------------------------------------------
  get port() {
    return this._impl && this._impl.getPort();
  }

  //---------------------------------------------------------------------------
  // protocol (READONLY)
  //
  // Property for identifying the protocol used to connect to Oracle Database.
  //---------------------------------------------------------------------------
  get protocol() {
    return this._impl && this._impl.getProtocol();
  }

  //---------------------------------------------------------------------------
  // connectString (READONLY)
  //
  // User provided connectString to connect to Oracle Database.
  //---------------------------------------------------------------------------
  get connectString() {
    return this._impl && this._impl._connectString;
  }

  //---------------------------------------------------------------------------
  // user
  //
  // User property provided to connect to Oracle Database.
  //---------------------------------------------------------------------------
  get user() {
    if (this.currentSchema.length) {
      return this.currentSchema;
    }
    return this._impl && this._impl._user;
  }

  //---------------------------------------------------------------------------
  // connectTraceConfig
  //
  // Property for getting the connection related config.
  //---------------------------------------------------------------------------
  get connectTraceConfig() {
    return this._impl && this._impl._getConnectTraceConfig();
  }

  //---------------------------------------------------------------------------
  // getDbObjectClass()
  //
  // Returns a database object class given its name. The cache is searched
  // first, but if not found, the database is queried and the result is cached
  // using the type information (as well as the name for easier lookup later).
  //---------------------------------------------------------------------------
  async getDbObjectClass(name) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof name === 'string', 1);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    return await this._getDbObjectClassForName(name);
  }

  //---------------------------------------------------------------------------
  // getQueue()
  //
  // Returns a queue with the specified name.
  //---------------------------------------------------------------------------
  async getQueue(name, a2) {
    let options = {};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(typeof name === 'string', 1);
    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      options = {...a2};
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    const queue = new AqQueue();
    await queue.create(this, name, options);
    return queue;
  }

  //---------------------------------------------------------------------------
  // getSodaDatabase()
  //
  // Returns a SodaDatabase object (high-level SODA object associated with
  // the current connection).
  //---------------------------------------------------------------------------
  getSodaDatabase() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    const sodaDb = new SodaDatabase();
    sodaDb._impl = this._impl.getSodaDatabase();
    return sodaDb;
  }

  //---------------------------------------------------------------------------
  // getStatementInfo()
  //
  // Returns information about the statement.
  //---------------------------------------------------------------------------
  async getStatementInfo(sql) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof sql === 'string', 1);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    const info = await this._impl.getStatementInfo(sql);
    if (info.metaData) {
      for (let i = 0; i < info.metaData.length; i++) {
        const m = info.metaData[i];
        nodbUtil.addTypeProperties(m, "dbType");
        m.fetchType = types.DB_TYPE_FETCH_TYPE_MAP.get(m.dbType);
      }
    }
    return info;
  }

  //---------------------------------------------------------------------------
  // instanceName
  //
  // Returns the Oracle Database instance name associated with the connection.
  // This is the equivalent of the SQL expression:
  // sys_context('userenv', 'instance_name')
  //---------------------------------------------------------------------------
  get instanceName() {
    if (this._impl)
      return this._impl.getInstanceName();
    return undefined;
  }

  //---------------------------------------------------------------------------
  // internalName
  //
  // Property for identifying the internal name to use in TPC logging.
  //---------------------------------------------------------------------------
  get internalName() {
    if (this._impl)
      return this._impl.getInternalName();
    return undefined;
  }

  set internalName(value) {
    errors.assertPropValue(typeof value === 'string', "internalName");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setInternalName(value);
  }

  //---------------------------------------------------------------------------
  // ltxid
  //
  // Property for identifying the logical transaction ID to avoid duplicate
  // transactions. Used with Oracle Transaction Guard.
  //---------------------------------------------------------------------------
  get ltxid() {
    if (this._impl)
      return this._impl.getLTXID();
    return undefined;
  }

  //--------------------------------------------------------------------------
  // isHealthy()
  //
  // Returns the health status of the connection. If this function returns
  // false, the caller should close the connection.
  //---------------------------------------------------------------------------
  isHealthy() {
    return (this._impl !== undefined && !this._closing &&
      this._impl.isHealthy());
  }

  isCompressionEnabled() {
    return (this._impl && this._impl.isCompressionEnabled());
  }

  //---------------------------------------------------------------------------
  // maxIdentifierLength
  //
  // Returns the maximum length of identifiers supported by the database to
  // which this connection has been established.
  //---------------------------------------------------------------------------
  get maxIdentifierLength() {
    return this._impl && this._impl.getMaxIdentifierLength();
  }

  //---------------------------------------------------------------------------
  // maxOpenCursors
  //
  // Returns maximum number of cursors that can be opened in one session.
  //---------------------------------------------------------------------------
  get maxOpenCursors() {
    return this._impl && this._impl.getMaxOpenCursors();
  }

  //---------------------------------------------------------------------------
  // warning
  //
  // Returns warningInfo.
  //---------------------------------------------------------------------------
  get warning() {
    let warning = this._impl.getWarning();
    if (warning) {
      // Make sure that warning code attribute is populated and ORA error
      // is converted to NJS, if required
      warning = errors.transformErr(warning);
    }
    return this._impl && warning;
  }

  //---------------------------------------------------------------------------
  // module
  //
  // Property for end-to-end tracing attribute.
  //---------------------------------------------------------------------------
  get module() {
    return null;
  }

  set module(value) {
    errors.assertPropValue(typeof value === 'string', "module");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setModule(value);
  }

  //---------------------------------------------------------------------------
  // oracleServerVersion
  //
  // Returns an integer identifying the Oracle Server version.
  //---------------------------------------------------------------------------
  get oracleServerVersion() {
    if (this._impl)
      return this._impl.getOracleServerVersion();
    return undefined;
  }

  //---------------------------------------------------------------------------
  // oracleServerVersionString
  //
  // Returns a string identifying the Oracle Server version.
  //---------------------------------------------------------------------------
  get oracleServerVersionString() {
    if (this._impl)
      return this._impl.getOracleServerVersionString();
    return undefined;
  }

  //---------------------------------------------------------------------------
  // serviceName
  //
  // Returns the Oracle Database service name associated with the connection.
  //---------------------------------------------------------------------------
  get serviceName() {
    return this._impl && this._impl.getServiceName();
  }

  //---------------------------------------------------------------------------
  // transactionInProgress
  //
  // Returns a boolean value based on the presence of an active transaction
  // on the connection
  //---------------------------------------------------------------------------
  get transactionInProgress() {
    return this._impl && this._impl.getTransactionInProgress();
  }

  //---------------------------------------------------------------------------
  // ping()
  //
  // Sends a "ping" to the database to see if it is "alive".
  //---------------------------------------------------------------------------
  async ping() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    await this._impl.ping();
  }

  //--------------------------------------------------------------------------
  // queryStream()
  //
  // Similar to execute() except that it immediately returns a QueryStream
  // object.
  // ---------------------------------------------------------------------------
  queryStream(sql, binds, options) {
    errors.assertArgCount(arguments, 1, 3);
    errors.assertParamValue(typeof sql === 'string', 1);
    if (arguments.length == 3) {
      errors.assertParamValue(nodbUtil.isObject(options), 3);
      options = {...options};
    } else {
      options = {};
    }
    options.resultSet = true;

    const stream = new QueryStream();

    // calling execute() via nextTick to ensure that handlers are registered
    // prior to the events being emitted
    process.nextTick(async () => {
      try {
        const result = await this.execute(sql, binds || [], options);
        if (!result.resultSet)
          errors.throwErr(errors.ERR_NOT_A_QUERY);
        stream._open(result.resultSet);
      } catch (err) {
        stream.destroy(err);
        return;
      }
    });

    return (stream);
  }

  //---------------------------------------------------------------------------
  // resumeSessionlessTransaction()
  //
  // Resume an existing sessionlesss transaction using given transactionId
  //---------------------------------------------------------------------------
  async resumeSessionlessTransaction(transactionId, options = {}) {
    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(nodbUtil.isTransactionId(transactionId), 1);
    errors.assertParamValue(nodbUtil.isObject(options), 2);
    errors.assertParamPropUnsignedInt(options, 2, 'timeout');
    errors.assertParamPropBool(options, 2, 'deferRoundTrip');
    const normalizedTransactionId =
      nodbUtil.normalizeTransactionId(transactionId);
    const {timeout = 60, deferRoundTrip = false} = options;
    await this._impl.startSessionlessTransaction(normalizedTransactionId,
      timeout, constants.TPC_BEGIN_RESUME, deferRoundTrip);
    return normalizedTransactionId;
  }

  //---------------------------------------------------------------------------
  // rollback()
  //
  // Rolls back the current transaction.
  //---------------------------------------------------------------------------
  async rollback() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    await this._impl.rollback();
  }

  //---------------------------------------------------------------------------
  // shutdown()
  //   Shuts down the database instance.
  //---------------------------------------------------------------------------
  async shutdown(a1) {
    let mode = constants.SHUTDOWN_MODE_DEFAULT;

    errors.assertArgCount(arguments, 0, 1);
    if (a1 !== undefined) {
      errors.assertParamValue(typeof mode === 'number', 1);
      mode = a1;
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    await this._impl.shutdown(mode);
  }

  //---------------------------------------------------------------------------
  // startup()
  //   Starts up the database instance.
  //---------------------------------------------------------------------------
  async startup(a1) {
    let options = {};

    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      errors.assertParamValue(typeof options === 'object', 1);
      options = a1;
      errors.assertParamPropBool(options, 1, "force");
      errors.assertParamPropBool(options, 1, "restrict");
      errors.assertParamPropString(options, 1, "pfile");
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    await this._impl.startup(options);
  }

  //---------------------------------------------------------------------------
  // stmtCacheSize
  //
  // Property for statement cache size.
  //---------------------------------------------------------------------------
  get stmtCacheSize() {
    if (this._impl)
      return this._impl.getStmtCacheSize();
    return undefined;
  }

  set stmtCacheSize(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "stmtCacheSize");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setStmtCacheSize(value);
  }

  //---------------------------------------------------------------------------
  // subscribe()
  //
  // Creates a subscription which can be used to get notifications of database
  // changes or of AQ messages available to dequeue.
  //---------------------------------------------------------------------------
  async subscribe(name, options) {
    errors.assertArgCount(arguments, 2, 2);
    errors.assertParamValue(typeof name === 'string', 1);
    errors.assertParamValue(nodbUtil.isObject(options), 2);
    options = {name: name, ...options};
    errors.assertParamPropUnsignedInt(options, 2, "namespace");
    if (options.namespace === undefined)
      options.namespace = constants.SUBSCR_NAMESPACE_DBCHANGE;
    errors.assertParamPropString(options, 2, "ipAddress");
    errors.assertParamPropUnsignedInt(options, 2, "port");
    errors.assertParamPropUnsignedInt(options, 2, "timeout");
    errors.assertParamPropUnsignedInt(options, 2, "operations");
    errors.assertParamPropUnsignedInt(options, 2, "qos");
    errors.assertParamPropUnsignedInt(options, 2, "groupingClass");
    errors.assertParamPropUnsignedInt(options, 2, "groupingValue");
    errors.assertParamPropUnsignedInt(options, 2, "groupingType");
    errors.assertParamPropBool(options, 2, "clientInitiated");
    errors.assertParamPropFunction(options, 2, "callback");
    errors.assert(options.callback, errors.ERR_MISSING_SUBSCR_CALLBACK);
    if (options.namespace === constants.SUBSCR_NAMESPACE_DBCHANGE) {
      errors.assertParamPropString(options, 2, "sql");
      errors.assert(options.sql && options.sql.length > 0,
        errors.ERR_MISSING_SUBSCR_SQL);
      if (options.binds !== undefined) {
        options.binds = await this._processExecuteBinds(options.binds);
      }
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    const inSubscr = _subscriptions.get(name);
    const outValue = await this._impl.subscribe(inSubscr, options);
    let subscription;
    if (options.namespace === constants.SUBSCR_NAMESPACE_DBCHANGE) {
      subscription = outValue.subscription;
      delete outValue.subscription;
    } else {
      subscription = outValue;
    }
    _subscriptions.set(name, subscription);
    return outValue;
  }

  //---------------------------------------------------------------------------
  // suspendSessionlessTransaction()
  //
  // Suspend any active sessionless transaction immediately
  //---------------------------------------------------------------------------
  async suspendSessionlessTransaction() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    await this._impl.suspendSessionlessTransaction();
  }

  //---------------------------------------------------------------------------
  // tag
  //
  // Property for tag to associate with the connection.
  //---------------------------------------------------------------------------
  get tag() {
    if (this._impl)
      return this._impl.getTag();
    return undefined;
  }

  set tag(value) {
    errors.assertPropValue(typeof value === 'string', "tag");
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    this._impl.setTag(value);
  }

  //---------------------------------------------------------------------------
  // tpcBegin()
  //
  // Starts a two-phase-commit transaction.
  //--------------------------------------------------------------------------
  async tpcBegin(xid, flag, timeout) {
    errors.assertArgCount(arguments, 1, 3);
    errors.assertParamValue(nodbUtil.isXid(xid), 1);
    const normalizedXid = nodbUtil.normalizeXid(xid);
    if (arguments.length < 3) {
      timeout = 60;   // seconds
    } else {
      errors.assertParamValue(typeof timeout === 'number', 3);
    }

    if (arguments.length < 2) {
      flag = constants.TPC_BEGIN_NEW;
    } else {
      errors.assertParamValue(typeof flag === 'number', 2);
      const options = [constants.TPC_BEGIN_NEW, constants.TPC_BEGIN_JOIN,
        constants.TPC_BEGIN_RESUME, constants.TPC_BEGIN_PROMOTE];
      if (options.indexOf(flag) < 0) {
        errors.throwErr(errors.ERR_INVALID_TPC_BEGIN_FLAGS);
      }
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    await this._impl.tpcBegin(normalizedXid, flag, timeout);
  }

  //---------------------------------------------------------------------------
  // tpcCommit()
  //
  // Commits a two-phase-commit transaction.
  //---------------------------------------------------------------------------
  async tpcCommit(xid, onePhase) {
    errors.assertArgCount(arguments, 0, 2);

    if (arguments.length < 2) {
      onePhase = false;
    } else {
      errors.assertParamValue(typeof onePhase === 'boolean', 2);
    }
    let normalizedXid;
    if (arguments.length >= 1) {
      errors.assertParamValue(nodbUtil.isXid(xid), 1);
      normalizedXid = nodbUtil.normalizeXid(xid);
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    await this._impl.tpcCommit(normalizedXid, onePhase);
  }

  //---------------------------------------------------------------------------
  // tpcEnd()
  //
  // Ends a two-phase-commit transaction.
  //---------------------------------------------------------------------------
  async tpcEnd(xid, flag) {
    errors.assertArgCount(arguments, 0, 2);

    if (arguments.length < 2) {
      flag = constants.TPC_END_NORMAL;
    } else {
      errors.assertParamValue(typeof flag === 'number', 2);
      const options = [constants.TPC_END_NORMAL, constants.TPC_END_SUSPEND];
      if (!options.includes(flag)) {
        errors.throwErr(errors.ERR_INVALID_TPC_END_FLAGS);
      }
    }
    let normalizedXid;
    if (arguments.length >= 1) {
      errors.assertParamValue(nodbUtil.isXid(xid), 1);
      normalizedXid = nodbUtil.normalizeXid(xid);
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    await this._impl.tpcEnd(normalizedXid, flag);
  }

  //---------------------------------------------------------------------------
  // tpcForget()
  //
  // Causes the server to forget a heuristically completed two-phase-commit
  // transaction.
  // ---------------------------------------------------------------------------
  async tpcForget(xid) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isXid(xid), 1);
    const normalizedXid = nodbUtil.normalizeXid(xid);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    await this._impl.tpcForget(normalizedXid);
  }

  //---------------------------------------------------------------------------
  // tpcPrepare()
  //
  // Prepares a two-phase-commit transaction for commit.
  //---------------------------------------------------------------------------
  async tpcPrepare(xid) {
    errors.assertArgCount(arguments, 0, 1);
    let normalizedXid;
    if (arguments.length >= 1) {
      errors.assertParamValue(nodbUtil.isXid(xid), 1);
      normalizedXid = nodbUtil.normalizeXid(xid);
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    return await this._impl.tpcPrepare(normalizedXid);
  }

  //---------------------------------------------------------------------------
  // tpcRecover()
  //
  // Returns a list of pending two-phase-commit transactions.
  //---------------------------------------------------------------------------
  async tpcRecover(asString) {
    errors.assertArgCount(arguments, 0, 1);

    if (arguments.length == 1) {
      errors.assertParamValue(typeof asString === 'boolean', 1);
    } else {
      asString = true;
    }

    const sqlStr = `
      SELECT
          formatid as "formatId",
          UTL_RAW.CAST_TO_VARCHAR2(globalid) as "globalTransactionId",
          UTL_RAW.CAST_TO_VARCHAR2(branchid) as "branchQualifier"
      FROM DBA_PENDING_TRANSACTIONS`;
    const sqlBuf = `
      SELECT
          formatid as "formatId",
          globalid as "globalTransactionId",
          branchid as "branchQualifier"
      FROM DBA_PENDING_TRANSACTIONS`;
    const options = {
      outFormat: constants.OUT_FORMAT_OBJECT,
      resultSet: false
    };

    const result = await this.execute(asString ? sqlStr : sqlBuf, {}, options);
    return result.rows;
  }

  //---------------------------------------------------------------------------
  // tpcRollback()
  //
  // Rolls back the current changes in a two-phase-commit transaction.
  //---------------------------------------------------------------------------
  async tpcRollback(xid) {
    errors.assertArgCount(arguments, 0, 1);
    let normalizedXid;
    if (arguments.length == 1) {
      errors.assertParamValue(nodbUtil.isXid(xid), 1);
      normalizedXid = nodbUtil.normalizeXid(xid);
    }
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);

    await this._impl.tpcRollback(normalizedXid);
  }

  //---------------------------------------------------------------------------
  // unsubscribe()
  //
  // Destroy a subscription which was earlier created using subscribe().
  //---------------------------------------------------------------------------
  async unsubscribe(name) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof name === 'string', 1);
    errors.assert(this._impl, errors.ERR_INVALID_CONNECTION);
    errors.assert(_subscriptions.has(name), errors.ERR_INVALID_SUBSCR);
    await this._impl.unsubscribe(_subscriptions.get(name));

    // Delay decreasing the reference count
    // as NJS layer starts cleanup (uv_close) of async handle asynchronously.
    setTimeout(() => {
      _subscriptions.delete(name);
    }, 0);
  }

}

// adjust functions to support the old callback style and to serialize calls
// that cannot take place concurrently
// NOTE: breakExecution() should not be serialized
Connection.prototype.break =
    nodbUtil.callbackify(nodbUtil.wrapFn(Connection.prototype.breakExecution));
Connection.prototype.tpcRecover =
    nodbUtil.callbackify(nodbUtil.wrapFn(Connection.prototype.tpcRecover));
nodbUtil.wrapFns(Connection.prototype,
  "beginSessionlessTransaction",
  "changePassword",
  "close",
  "commit",
  "createLob",
  "execute",
  "executeMany",
  "getDbObjectClass",
  "getQueue",
  "getStatementInfo",
  "ping",
  "resumeSessionlessTransaction",
  "rollback",
  "shutdown",
  "startup",
  "subscribe",
  "suspendSessionlessTransaction",
  "tpcBegin",
  "tpcCommit",
  "tpcEnd",
  "tpcForget",
  "tpcPrepare",
  "tpcRollback",
  "unsubscribe");

// add alias for release()
Connection.prototype.release = Connection.prototype.close;

// export just the Connection class
module.exports = Connection;
