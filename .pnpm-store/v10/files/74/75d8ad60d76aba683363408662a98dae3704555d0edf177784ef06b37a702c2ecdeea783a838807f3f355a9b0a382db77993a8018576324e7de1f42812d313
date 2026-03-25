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

const constants = require('../constants.js');
const errors = require('../errors.js');
const nodbUtil = require('../util.js');
const settings = require('../settings.js');
const future = require('../future.js');
const types = require('../types.js');
const Lob = require('../lob.js');
const oson = require('./datahandlers/oson.js');
const BaseImpl = require('./base.js');

// define implementation class
class ResultSetImpl extends BaseImpl {

  //---------------------------------------------------------------------------
  // _determineFetchType()
  //
  // Determine the fetch type to use for the specified metadata.
  // Param rowsetMetaData includes metadata of all the columns fetched.
  //---------------------------------------------------------------------------
  _determineFetchType(metadata, options, rowsetMetaData) {

    // clear any previous fetch type and converter functions that may have been
    // retained
    delete metadata.fetchType;
    delete metadata.converter;

    // if a fetch type handler is specified, call it; if no value (undefined)
    // is returned, the normal processing takes place
    if (options.fetchTypeHandler) {
      const result = options.fetchTypeHandler(metadata, rowsetMetaData);
      if (result !== undefined) {
        errors.assert(typeof result === 'object',
          errors.ERR_FETCH_TYPE_HANDLER_RETURN_VALUE);
        if (result.type !== undefined) {
          errors.assert(result.type instanceof types.DbType,
            errors.ERR_FETCH_TYPE_HANDLER_TYPE);
        }
        if (result.converter !== undefined) {
          errors.assert(typeof result.converter === 'function',
            errors.ERR_FETCH_TYPE_HANDLER_CONVERTER);
        }
        metadata.fetchType = result.type;
        metadata.converter = result.converter;
      }
    }

    // continue processing if no fetch type was specified or no fetch type
    // handler was supplied
    if (!metadata.fetchType) {

      // if the fetchTypeMap exists (calculated from the fetchInfo argument),
      // use it to determine the fetch type
      if (options.fetchTypeMap && options.fetchTypeMap.has(metadata.name)) {
        metadata.fetchType = options.fetchTypeMap.get(metadata.name);
        if (metadata.fetchType === constants.DEFAULT) {
          metadata.fetchType =
            types.DB_TYPE_FETCH_TYPE_MAP.get(metadata.dbType);
        }

      // otherwise, use the default fetch type map (calculated from the
      // fetchAsString and fetchAsBuffer settings
      } else {
        metadata.fetchType = settings.fetchTypeMap.get(metadata.dbType);
      }

    }

    // if the types do not match, verify that the conversion is supported and
    // adjust the final fetch type to match what the database expects
    if (metadata.fetchType !== metadata.dbType) {
      const map = types.DB_TYPE_CONVERSION_MAP.get(metadata.dbType);
      const actualFetchType = map && map.get(metadata.fetchType);
      if (!actualFetchType) {
        errors.throwErr(errors.ERR_UNSUPPORTED_CONVERSION,
          metadata.dbType.name, metadata.fetchType.name);
      }
      metadata.fetchType = actualFetchType;
    }

    let converter;
    const userConverter = metadata.converter;

    // If IsJson or IsOson is set, convert to JSON objects unless
    // user defined output type handler overwrites it.
    if (metadata.dbType !== types.DB_TYPE_JSON && future.oldJsonColumnAsObj
      && userConverter === undefined) {
      let outConverter;
      if (metadata.isOson) {
        outConverter = async function(val) {
          if (!val) {
            return val;
          }
          let result = val;
          if (val instanceof Lob) {
            result = await val.getData();
          }
          const decoder = new oson.OsonDecoder(result);
          return decoder.decode();
        };
        converter = outConverter;
      } else if (metadata.isJson) {
        outConverter = async function(val) {
          if (!val) {
            return val;
          }

          let result = val;
          if (val instanceof Lob) {
            result = await val.getData();
          }
          if (result instanceof Buffer) {
            result = result.toString();
          }
          result = JSON.parse(result);
          return result;
        };
        converter = outConverter;
      }
    }

    // in thin mode, Oracle NUMBER values are internally fetched as string in
    // order to preserve precision so must be converted to JavaScript Number
    // when needed; other numeric and date types are fetched natively as
    // JavaScript Number and Date values and are converted to string using
    // toString() when desired
    if (settings.thin) {
      if (metadata.dbType === types.DB_TYPE_NUMBER &&
        metadata.fetchType === types.DB_TYPE_NUMBER) {
        converter = (v) => (v === null) ? null : parseFloat(v);
      } else if (metadata.fetchType === types.DB_TYPE_VARCHAR) {
        if (metadata.dbType === types.DB_TYPE_BINARY_DOUBLE ||
          metadata.dbType === types.DB_TYPE_BINARY_FLOAT ||
          metadata.dbType === types.DB_TYPE_DATE ||
          metadata.dbType === types.DB_TYPE_TIMESTAMP ||
          metadata.dbType === types.DB_TYPE_TIMESTAMP_LTZ ||
          metadata.dbType === types.DB_TYPE_TIMESTAMP_TZ) {
          converter = (v) => (v === null) ? null : v.toString();
        } else if (metadata.dbType === types.DB_TYPE_RAW) {
          converter = (v) => (v === null) ? null : v.toString('hex').toUpperCase();
        }
      } else if (metadata.dbType === types.DB_TYPE_XMLTYPE) {
        const xmlConverter = async function(val) {
          if (!val) {
            return val;
          }
          if (typeof val === 'string') {
            return val;
          }
          return await val.getData();
        };
        converter = xmlConverter;
      }
      if (userConverter && converter) {
        const internalConverter = converter;
        converter = (v) => userConverter(internalConverter(v));
      }
    }

    if (converter) {
      metadata.converter = converter;
    }

  }

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this._parentObj;
  }

  //---------------------------------------------------------------------------
  // _setup()
  //
  // Setup a result set. The metadata is examined to to determine if any
  // columns need to be manipulated before being returned to the caller. If the
  // rows fetched from the result set are expected to be objects, a unique set
  // of attribute names are also determined.
  //---------------------------------------------------------------------------
  _setup(options, metaData) {
    this._parentObj = options.connection._impl;
    this.metaData = metaData;
    this.lobIndices = [];
    this.dbObjectIndices = [];
    this.nestedCursorIndices = [];
    this.converterIndices = [];
    this.outFormat = options.outFormat;
    this.fetchArraySize = options.fetchArraySize;
    this.dbObjectAsPojo = options.dbObjectAsPojo;
    this.maxRows = options.maxRows;
    const names = new Map();
    for (let i = 0; i < metaData.length; i++) {
      const name = metaData[i].name;
      if (!names.has(name)) {
        names.set(name, i);
      }
    }
    for (let i = 0; i < metaData.length; i++) {
      const info = metaData[i];
      if (info.dbTypeClass) {
        const cls = options.connection._getDbObjectClass(info.dbTypeClass);
        info.dbTypeClass = cls;
      }
      nodbUtil.addTypeProperties(info, "dbType");
      this._determineFetchType(info, options, metaData);
      if (info.fetchType === types.DB_TYPE_CURSOR) {
        this.nestedCursorIndices.push(i);
      } else if (info.fetchType === types.DB_TYPE_CLOB ||
          info.fetchType === types.DB_TYPE_NCLOB ||
          info.fetchType === types.DB_TYPE_BLOB ||
          info.fetchType === types.DB_TYPE_BFILE) {
        this.lobIndices.push(i);
      } else if (info.fetchType === types.DB_TYPE_OBJECT) {
        this.dbObjectIndices.push(i);
      }
      if (info.converter) {
        this.converterIndices.push(i);
      }
      let name = info.name;
      if (names.get(name) !== i) {
        let seqNum = 0;
        while (names.has(name)) {
          seqNum = seqNum + 1;
          name = `${info.name}_${seqNum}`;
        }
        names.set(name, i);
        info.name = name;
      }
    }
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Closes the result set.
  //---------------------------------------------------------------------------
  close() {
    errors.throwNotImplemented("closing a result set");
  }

  //---------------------------------------------------------------------------
  // getRows()
  //
  // Returns rows from a result set.
  //---------------------------------------------------------------------------
  getRows() {
    errors.throwNotImplemented("getting rows");
  }

  //---------------------------------------------------------------------------
  // _getAllRows() [INTERNAL]
  //
  // Fetches all the rows from the database to use internally.
  //---------------------------------------------------------------------------
  async _getAllRows() {
    const fetchArraySize = 100;
    // fetch all rows
    let rowsFetched = [];
    while (true) {    // eslint-disable-line
      // constant default value for fetchArraySize
      const rows = await this.getRows(fetchArraySize, {});
      if (rows) {
        await this._processRows(rows, false);
        rowsFetched = rowsFetched.concat(rows);
      }
      if (rows.length < fetchArraySize) {
        break;
      }
    }

    return rowsFetched;
  }

}

module.exports = ResultSetImpl;
