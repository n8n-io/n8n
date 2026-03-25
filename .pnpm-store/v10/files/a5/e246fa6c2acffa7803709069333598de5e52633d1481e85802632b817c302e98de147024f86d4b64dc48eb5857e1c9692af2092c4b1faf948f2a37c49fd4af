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

const constants = require('./constants.js');
const errors = require('./errors.js');
const types = require('./types.js');
const nodbUtil = require("./util.js");
const vector = require('./impl/datahandlers/vector.js');

class Settings {

  constructor() {
    this.autoCommit = false;
    this.connectionClass = '';
    this.dbObjectAsPojo = false;
    this.edition = '';
    this.errorOnConcurrentExecute = false;
    this.events = false;
    this.externalAuth = false;
    this.fetchArraySize = 100;
    this.fetchAsBuffer = [];
    this.fetchAsString = [];
    this.lobPrefetchSize = 16384;
    this.maxRows = 0;
    this.outFormat = constants.OUT_FORMAT_ARRAY;
    this.poolIncrement = 1;
    this.poolMax = 4;
    this.poolMaxPerShard = 0;
    this.poolMin = 0;
    this.poolPingInterval = 60;
    this.poolPingTimeout = 5000;
    this.poolTimeout = 60;
    this.prefetchRows = 2;
    this.queueTimeout = 60000;
    this.queueMax = 500;
    this.stmtCacheSize = 30;
    this.configProviderCacheTimeout = 86400;
    this.thin = true;
    this.thinDriverInitialized = false;
    this.createFetchTypeMap(this.fetchAsString, this.fetchAsBuffer);
    this.fetchTypeHandler = undefined;
    this.dbObjectTypeHandler = undefined;
    this._JsonId = types.JsonId;
    this._SparseVector = types.SparseVector;
    this._IntervalYM = types.IntervalYM;
    this._IntervalDS = types.IntervalDS;
  }

  //---------------------------------------------------------------------------
  // _getDateComponents()
  //
  // Returns the components of a date. DATE and TIMESTAMP data from the
  // database are returned as though they used the JavaScript time zone
  // setting. TIMESTAMP WITH TIME ZONE and TIMESTAMP WITH LOCAL TIME ZONE data
  // are returned in native JavaScript format (since they contain time zone
  // information). This is used only in Thick mode (from node-oracledb 6.0.0).
  //---------------------------------------------------------------------------
  _getDateComponents(useLocal, date) {
    if (useLocal) {
      return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds() * 1000 * 1000
      ];
    } else {
      return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds() * 1000 * 1000
      ];
    }
  }

  //---------------------------------------------------------------------------
  // _makeDate()
  //
  // Returns a date from the given components. DATE and TIMESTAMP data from the
  // database are returned as though they used the JavaScript time zone
  // setting. TIMESTAMP WITH TIME ZONE and TIMESTAMP WITH LOCAL TIME ZONE data
  // are returned in native JavaScript format (since they contain time zone
  // information).
  //---------------------------------------------------------------------------
  _makeDate(useLocal, year, month, day, hour, minute, second, fseconds, offset) {
    return nodbUtil.makeDate(useLocal, year, month, day, hour, minute, second, fseconds, offset);
  }

  //---------------------------------------------------------------------------
  // _decodeVector()
  //
  // Returns a typed array by decoding buffer.
  //
  //---------------------------------------------------------------------------
  _decodeVector(buffer) {
    const decoder = new vector.VectorDecoder(buffer);
    return decoder.decode();
  }

  //---------------------------------------------------------------------------
  // _encodeVector()
  //
  // Create a Vector image from typedarray
  //
  //---------------------------------------------------------------------------
  _encodeVector(value) {
    const encoder = new vector.VectorEncoder();
    return encoder.encode(value);
  }

  //---------------------------------------------------------------------------
  // addToOptions()
  //
  // Adds the named settingsto the options, if no option has already been
  // specified.
  //---------------------------------------------------------------------------
  addToOptions(options) {
    for (let i = 1; i < arguments.length; i++) {
      const key = arguments[i];
      if (options[key] === undefined)
        options[key] = this[key];
    }
  }

  //---------------------------------------------------------------------------
  // createFetchTypeMap()
  //
  // Creates the fetch type map. This overrides the default fetch type mapping
  // used by the driver with the contents of the fetchAsString and
  // fetchAsBuffer arrays. The error checking is performed here as well in
  // order to eliminate repeated code.
  // ---------------------------------------------------------------------------
  createFetchTypeMap(fetchAsString, fetchAsBuffer) {

    // create a copy of the default fetch type map
    const map = new Map(types.DB_TYPE_FETCH_TYPE_MAP);

    // adjust map for fetchAsString settings
    for (const element of fetchAsString) {
      switch (element) {
        case types.DB_TYPE_NUMBER:
          map.set(types.DB_TYPE_BINARY_DOUBLE, types.DB_TYPE_VARCHAR);
          map.set(types.DB_TYPE_BINARY_FLOAT, types.DB_TYPE_VARCHAR);
          map.set(types.DB_TYPE_BINARY_INTEGER, types.DB_TYPE_VARCHAR);
          map.set(types.DB_TYPE_NUMBER, types.DB_TYPE_VARCHAR);
          break;
        case types.DB_TYPE_TIMESTAMP:
          map.set(types.DB_TYPE_DATE, types.DB_TYPE_VARCHAR);
          map.set(types.DB_TYPE_TIMESTAMP, types.DB_TYPE_VARCHAR);
          map.set(types.DB_TYPE_TIMESTAMP_TZ, types.DB_TYPE_VARCHAR);
          map.set(types.DB_TYPE_TIMESTAMP_LTZ, types.DB_TYPE_VARCHAR);
          break;
        case types.DB_TYPE_CLOB:
        case types.DB_TYPE_NCLOB:
          map.set(types.DB_TYPE_CLOB, types.DB_TYPE_LONG);
          map.set(types.DB_TYPE_NCLOB, types.DB_TYPE_LONG_NVARCHAR);
          break;
        case types.DB_TYPE_VECTOR:
          map.set(types.DB_TYPE_VECTOR, types.DB_TYPE_LONG);
          break;
        case types.DB_TYPE_RAW:
          map.set(types.DB_TYPE_RAW, types.DB_TYPE_VARCHAR);
          break;
        case types.DB_TYPE_JSON:
          map.set(types.DB_TYPE_JSON, types.DB_TYPE_VARCHAR);
          break;
        default:
          errors.throwErr(errors.ERR_INVALID_TYPE_FOR_CONVERSION);
      }
    }

    // adjust map for fetchAsBuffer settings
    for (const element of fetchAsBuffer) {
      switch (element) {
        case types.DB_TYPE_BLOB:
          map.set(types.DB_TYPE_BLOB, types.DB_TYPE_LONG_RAW);
          break;
        default:
          errors.throwErr(errors.ERR_INVALID_TYPE_FOR_CONVERSION);
      }
    }

    // assign calculated fetchTypeMap for later use
    this.fetchTypeMap = map;

  }

}

module.exports = new Settings();
