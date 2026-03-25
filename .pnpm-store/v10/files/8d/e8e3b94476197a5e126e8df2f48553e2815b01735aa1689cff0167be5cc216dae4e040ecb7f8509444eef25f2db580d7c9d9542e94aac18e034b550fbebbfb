// Copyright (c) 2016, 2023, Oracle and/or its affiliates.

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

const QueryStream = require('./queryStream.js');
const BaseDbObject = require('./dbObject.js');
const nodbUtil = require('./util.js');
const constants = require('./constants.js');
const Lob = require('./lob.js');
const errors = require('./errors.js');

class ResultSet {

  constructor() {
    this._rowCache = [];
    this._processingStarted = false;
    this._convertedToStream = false;
    this._allowGetRowCall = false;
    this._isActive = false;
  }

  //---------------------------------------------------------------------------
  // _getAllRows()
  //
  // Return all of the rows in the result set.
  //---------------------------------------------------------------------------
  async _getAllRows() {

    try {

      // retain initial values of the maximum number of rows to fetch and the
      // number of rows to fetch from the database at a single time
      let maxRows = this._impl.maxRows;
      let fetchArraySize = this._impl.fetchArraySize;

      // fetch all rows
      let rowsFetched = [];
      while (true) {    // eslint-disable-line
        if (maxRows > 0 && fetchArraySize >= maxRows) {
          fetchArraySize = maxRows;
        }
        const rows = await this._getRows(fetchArraySize);
        if (rows) {
          await this._processRows(rows, true);
          rowsFetched = rowsFetched.concat(rows);
        }
        if (rows.length == maxRows || rows.length < fetchArraySize) {
          break;
        }
        if (maxRows > 0) {
          maxRows -= rows.length;
        }
      }

      return rowsFetched;

    } finally {
      await this._impl.close();
      delete this._impl;
    }

  }

  //---------------------------------------------------------------------------
  // _getRows()
  //
  // Return up to the specified number of rows from the result set. If nested
  // cursors are possible, setup the execute options so that they can be
  // examined within the implementation's setup routine.
  //---------------------------------------------------------------------------
  async _getRows(numRows) {
    let options = {};
    if (this._impl.nestedCursorIndices.length > 0) {
      options = {
        connection: this._connection,
        outFormat: this._impl.outFormat,
        fetchArraySize: this._impl.fetchArraySize,
        dbObjectAsPojo: this._impl.dbObjectAsPojo,
        maxRows: this._impl.maxRows,
        fetchTypeMap: this._impl.fetchTypeMap
      };
    }
    return await this._impl.getRows(numRows, options);
  }

  //---------------------------------------------------------------------------
  // _processRows()
  //
  // Process rows returned by the implementation. This will transform result
  // set and LOB implementations into user facing objects. It will also perform
  // any fetched that are needed (if a result set is undesirable)
  //---------------------------------------------------------------------------
  async _processRows(rows, expandNestedCursors) {

    // transform any nested cursors into user facing objects
    for (const i of this._impl.nestedCursorIndices) {
      for (let j = 0; j < rows.length; j++) {
        const val = rows[j][i];
        if (val) {
          const resultSet = new ResultSet();
          resultSet._setup(this._connection, val);
          this._impl.metaData[i].metaData = val.metaData;
          if (expandNestedCursors) {
            rows[j][i] = await resultSet._getAllRows();
          } else {
            rows[j][i] = resultSet;
          }
        }
      }
    }

    // transform any LOBs into user facing objects
    for (const i of this._impl.lobIndices) {
      for (let j = 0; j < rows.length; j++) {
        const val = rows[j][i];
        if (val) {
          const lob = rows[j][i] = new Lob();
          lob._setup(val, true);
        }
      }
    }

    // transform any database objects into user facing objects
    for (const i of this._impl.dbObjectIndices) {
      const dbObjectClass = this._impl.metaData[i].dbTypeClass;
      for (let j = 0; j < rows.length; j++) {
        const val = rows[j][i];
        if (val) {
          const obj = rows[j][i] = Object.create(dbObjectClass.prototype);
          obj._impl = val;
          if (this._impl.dbObjectAsPojo) {
            rows[j][i] = obj._toPojo();
          } else if (obj.isCollection) {
            rows[j][i] = new Proxy(obj, BaseDbObject._collectionProxyHandler);
          }
        }
      }
    }

    // run any conversion functions, if applicable
    // NOTE: we mark the connection as no longer in progress before making
    // calls to the converter function; this is needed to allow calls against
    // the database (like getting LOB data) to succeed, as this code is running
    // in the middle of a call to connection.execute() or resultSet.getRows()
    for (const i of this._impl.converterIndices) {
      const fn = this._impl.metaData[i].converter;
      this._connection._impl._inProgress = false;
      try {
        for (let j = 0; j < rows.length; j++) {
          let result = fn(rows[j][i]);
          if (result instanceof Promise) {
            result = await result;
          }
          rows[j][i] = result;
        }
      } finally {
        this._connection._impl._inProgress = true;
      }
    }

    // create objects, if desired
    if (this._impl.outFormat === constants.OUT_FORMAT_OBJECT) {
      for (let i = 0; i < rows.length; i++) {
        const origRow = rows[i];
        const newRow = rows[i] = {};
        const metaData = this._impl.metaData;
        for (let j = 0; j < metaData.length; j++) {
          newRow[metaData[j].name] = origRow[j];
        }
      }
    }

  }

  //---------------------------------------------------------------------------
  // _setup()
  //
  // Setup a result set.
  // ---------------------------------------------------------------------------
  _setup(connection, resultSetImpl) {
    this._connection = connection;
    this._impl = resultSetImpl;
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the result set and make it unusable for further operations.
  //---------------------------------------------------------------------------
  async close() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl && this._connection._impl, errors.ERR_INVALID_RS);

    if (this._convertedToStream) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._processingStarted = true;
    const resultSetImpl = this._impl;
    delete this._impl;
    await resultSetImpl.close();
  }

  //---------------------------------------------------------------------------
  // getRow()
  //
  // Returns a single row to the caller from the result set, if one is
  // available. Rows are buffered in a JavaScript array in order to avoid trips
  // through the thread pool that would be required if implemented in C.
  //---------------------------------------------------------------------------
  async getRow() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl && this._connection._impl, errors.ERR_INVALID_RS);

    if (this._convertedToStream && !this._allowGetRowCall) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._allowGetRowCall = false;
    this._processingStarted = true;

    if (this._rowCache.length == 0) {
      const rows = await this._getRows(this._impl.fetchArraySize);
      await this._processRows(rows, false);
      this._rowCache = rows;
    }
    return this._rowCache.shift();
  }

  //---------------------------------------------------------------------------
  // getRows()
  //
  // Check to see if any rows are in the JS buffer (which could result from
  // interspersed calls to getRow() and getRows()). If no rows are in the
  // buffer, the call is just proxied to the implementation layer. Otherwise,
  // rows are pulled from the buffer and potentially concatenated with rows
  // from calls to the implementation's getRows().
  //---------------------------------------------------------------------------
  async getRows(numRows) {
    let rowsNeeded;

    errors.assertArgCount(arguments, 0, 1);
    errors.assert(this._impl && this._connection._impl, errors.ERR_INVALID_RS);

    if (arguments.length == 0) {
      numRows = 0;
    } else {
      errors.assertParamValue(Number.isInteger(numRows) && numRows >= 0, 1);
    }

    if (this._convertedToStream) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._processingStarted = true;

    let requestedRows;
    if (numRows == 0) {
      requestedRows = this._rowCache;
      const fetchArraySize = this._impl.fetchArraySize;
      while (true) {  // eslint-disable-line
        const rows = await this._getRows(fetchArraySize);
        if (rows) {
          await this._processRows(rows, false);
          requestedRows = requestedRows.concat(rows);
        }
        if (rows.length < fetchArraySize)
          break;
      }
      return requestedRows;
    }

    if (this._rowCache.length === 0) {
      requestedRows = await this._getRows(numRows);
      await this._processRows(requestedRows, false);
    } else {
      rowsNeeded = numRows - this._rowCache.length;
      if (rowsNeeded <= 0) {
        requestedRows = this._rowCache.splice(0, numRows);
      } else {
        const rows = await this._getRows(rowsNeeded);
        await this._processRows(rows, false);
        requestedRows = this._rowCache.concat(rows);
        this._rowCache = [];
      }
    }

    return requestedRows;
  }

  //---------------------------------------------------------------------------
  // metaData()
  //
  // Property returning the metadata associated with the result set.
  //---------------------------------------------------------------------------
  get metaData() {
    if (this._impl) {
      return this._impl.metaData;
    }
    return undefined;
  }

  //---------------------------------------------------------------------------
  // toQueryStream()
  //
  // Converts a result set to a QueryStream object.
  //---------------------------------------------------------------------------
  toQueryStream() {
    errors.assertArgCount(arguments, 0, 0);

    if (this._processingStarted) {
      errors.throwErr(errors.ERR_CANNOT_CONVERT_RS_TO_STREAM);
    }

    if (this._convertedToStream) {
      errors.throwErr(errors.ERR_RS_ALREADY_CONVERTED);
    }

    this._convertedToStream = true;

    return new QueryStream(this);
  }

  [Symbol.asyncIterator]() {
    const resultSet = this;
    return {
      async next() {
        const row = await resultSet.getRow();
        return {value: row, done: row === undefined};
      },
      return() {
        return {done: true};
      }
    };
  }

}

nodbUtil.wrapFns(ResultSet.prototype, errors.ERR_BUSY_RS,
  "close",
  "getRow",
  "getRows");

module.exports = ResultSet;
