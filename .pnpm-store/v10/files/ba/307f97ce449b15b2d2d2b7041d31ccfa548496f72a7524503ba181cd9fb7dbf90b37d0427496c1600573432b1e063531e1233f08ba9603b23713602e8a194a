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
const util = require('util');

const dbTypeByNum = new Map();
const dbTypeByOraTypeNum = new Map();
const dbTypeByColumnTypeName = new Map();
const MAX_UINT32 = Math.pow(2, 32) - 1;

// define class used for database types
class DbType {

  constructor(num, name, columnTypeName, options) {
    this.num = num;
    this.name = name;
    this.columnTypeName = columnTypeName;
    this._bufferSizeFactor = options.bufferSizeFactor || 0;
    this._oraTypeNum = options.oraTypeNum || 0;
    this._csfrm = options.csfrm || 0;
    dbTypeByNum.set(num, this);
    const key = (options.csfrm || 0) * 256 + options.oraTypeNum;
    dbTypeByOraTypeNum.set(key, this);
    dbTypeByColumnTypeName.set(columnTypeName, this);
  }

  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case 'number':
        return this.num;
      default:
        return this.toString();
    }
  }

  [util.inspect.custom]() {
    return this.toString();
  }

  toString() {
    return `[DbType ${this.name}]`;
  }

}

//-----------------------------------------------------------------------------
// getTypeByColumnTypeName()
//
// Return the type given a column type name. If the column type name cannot be
// found an exception is thrown.
//-----------------------------------------------------------------------------
function getTypeByColumnTypeName(name) {
  const dbType = dbTypeByColumnTypeName.get(name);
  if (!dbType)
    errors.throwErr(errors.ERR_UNKNOWN_COLUMN_TYPE_NAME, name);
  return dbType;
}

//-----------------------------------------------------------------------------
// getTypeByNum()
//
// Return the type given the type number. If the type number is incorrect an
// exception is thrown.
//-----------------------------------------------------------------------------
function getTypeByNum(num) {
  const dbType = dbTypeByNum.get(num);
  if (!dbType)
    errors.throwErr(errors.ERR_INVALID_TYPE_NUM, num);
  return dbType;
}

//-----------------------------------------------------------------------------
// getTypeByOraTypeNum()
//
// Return the type given the Oracle type number and character set form. If the
// Oracle type number and character set form are incorrect an exception is
// thrown.
//-----------------------------------------------------------------------------
function getTypeByOraTypeNum(oraTypeNum, csfrm) {
  const key = (csfrm || 0) * 256 + oraTypeNum;
  const dbType = dbTypeByOraTypeNum.get(key);
  if (!dbType)
    errors.throwErr(errors.ERR_INVALID_ORACLE_TYPE_NUM, oraTypeNum, csfrm);
  return dbType;
}

const DB_TYPE_BFILE = new DbType(2020,
  "DB_TYPE_BFILE", "BFILE",
  { oraTypeNum: 114, bufferSizeFactor: 4000 });
const DB_TYPE_BINARY_DOUBLE = new DbType(2008,
  "DB_TYPE_BINARY_DOUBLE", "BINARY_DOUBLE",
  { oraTypeNum: 101, bufferSizeFactor: 8 });
const DB_TYPE_BINARY_FLOAT = new DbType(2007,
  "DB_TYPE_BINARY_FLOAT", "BINARY_FLOAT",
  { oraTypeNum: 100, bufferSizeFactor: 4 });
const DB_TYPE_BINARY_INTEGER = new DbType(2009,
  "DB_TYPE_BINARY_INTEGER", "BINARY_INTEGER",
  { oraTypeNum: 3, bufferSizeFactor: 22 });
const DB_TYPE_BLOB = new DbType(2019,
  "DB_TYPE_BLOB", "BLOB",
  { oraTypeNum: 113, bufferSizeFactor: 112 });
const DB_TYPE_BOOLEAN = new DbType(2022,
  "DB_TYPE_BOOLEAN", "BOOLEAN",
  { oraTypeNum: 252, bufferSizeFactor: 4 });
const DB_TYPE_CHAR = new DbType(2003,
  "DB_TYPE_CHAR", "CHAR",
  { oraTypeNum: 96, csfrm: constants.CSFRM_IMPLICIT, bufferSizeFactor: 4 });
const DB_TYPE_CLOB = new DbType(2017,
  "DB_TYPE_CLOB", "CLOB",
  { oraTypeNum: 112, csfrm: constants.CSFRM_IMPLICIT, bufferSizeFactor: 112 });
const DB_TYPE_CURSOR = new DbType(2021,
  "DB_TYPE_CURSOR", "CURSOR",
  { oraTypeNum: 102, bufferSizeFactor: 4 });
const DB_TYPE_DATE = new DbType(2011,
  "DB_TYPE_DATE", "DATE",
  { oraTypeNum: 12, bufferSizeFactor: 7 });
const DB_TYPE_INTERVAL_DS = new DbType(2015,
  "DB_TYPE_INTERVAL_DS", "INTERVAL DAY TO SECOND",
  { oraTypeNum: 183, bufferSizeFactor: 11 });
const DB_TYPE_INTERVAL_YM = new DbType(2016,
  "DB_TYPE_INTERVAL_YM", "INTERVAL YEAR TO MONTH",
  { oraTypeNum: 182, bufferSizeFactor: 5 });
const DB_TYPE_JSON = new DbType(2027,
  "DB_TYPE_JSON", "JSON",
  { oraTypeNum: 119 });
const DB_TYPE_LONG = new DbType(2024,
  "DB_TYPE_LONG", "LONG",
  { oraTypeNum: 8, csfrm: constants.CSFRM_IMPLICIT,
    bufferSizeFactor: 2 ** 31 - 1 });
const DB_TYPE_LONG_NVARCHAR = new DbType(2031,
  "DB_TYPE_LONG_NVARCHAR", "LONG",
  { oraTypeNum: 8, csfrm: constants.CSFRM_NCHAR,
    bufferSizeFactor: 2 ** 31 - 1 });
const DB_TYPE_LONG_RAW = new DbType(2025,
  "DB_TYPE_LONG_RAW", "LONG RAW",
  { oraTypeNum: 24, bufferSizeFactor: 2 ** 31 - 1 });
const DB_TYPE_NCHAR = new DbType(2004,
  "DB_TYPE_NCHAR", "NCHAR",
  { oraTypeNum: 96, csfrm: constants.CSFRM_NCHAR, bufferSizeFactor: 4 });
const DB_TYPE_NCLOB = new DbType(2018,
  "DB_TYPE_NCLOB", "NCLOB",
  { oraTypeNum: 112, csfrm: constants.CSFRM_NCHAR, bufferSizeFactor: 112 });
const DB_TYPE_NUMBER = new DbType(2010,
  "DB_TYPE_NUMBER", "NUMBER",
  { oraTypeNum: 2, bufferSizeFactor: 22 });
const DB_TYPE_NVARCHAR = new DbType(2002,
  "DB_TYPE_NVARCHAR", "NVARCHAR2",
  { oraTypeNum: 1, csfrm: constants.CSFRM_NCHAR, bufferSizeFactor: 4 });
const DB_TYPE_OBJECT = new DbType(2023,
  "DB_TYPE_OBJECT", "OBJECT",
  { oraTypeNum: 109 });
const DB_TYPE_RAW = new DbType(2006,
  "DB_TYPE_RAW", "RAW",
  { oraTypeNum: 23, bufferSizeFactor: 1 });
const DB_TYPE_ROWID = new DbType(2005,
  "DB_TYPE_ROWID", "ROWID",
  { oraTypeNum: 11, bufferSizeFactor: 18 });
const DB_TYPE_TIMESTAMP = new DbType(2012,
  "DB_TYPE_TIMESTAMP", "TIMESTAMP",
  { oraTypeNum: 180, bufferSizeFactor: 11 });
const DB_TYPE_TIMESTAMP_LTZ = new DbType(2014,
  "DB_TYPE_TIMESTAMP_LTZ", "TIMESTAMP WITH LOCAL TIME ZONE",
  { oraTypeNum: 231, bufferSizeFactor: 11 });
const DB_TYPE_TIMESTAMP_TZ = new DbType(2013,
  "DB_TYPE_TIMESTAMP_TZ", "TIMESTAMP WITH TIME ZONE",
  { oraTypeNum: 181, bufferSizeFactor: 13 });
const DB_TYPE_UROWID = new DbType(2030,
  "DB_TYPE_UROWID", "UROWID",
  { oraTypeNum: 208 });
const DB_TYPE_VARCHAR = new DbType(2001,
  "DB_TYPE_VARCHAR", "VARCHAR2",
  { oraTypeNum: 1, csfrm: constants.CSFRM_IMPLICIT, bufferSizeFactor: 4 });
const DB_TYPE_XMLTYPE = new DbType(2032,
  "DB_TYPE_XMLTYPE", "XMLTYPE",
  { oraTypeNum: 109, csfrm: constants.CSFRM_IMPLICIT, bufferSizeFactor: 2147483647 });
const DB_TYPE_VECTOR = new DbType(2033,
  "DB_TYPE_VECTOR", "VECTOR",
  { oraTypeNum: 127 });

// database type conversion map: the top level key refers to the database
// type being fetched and the value is another map; this map's key is the
// type requested by the user and its value is the actual type that will be
// used in the define call; only entries are included where the database type
// and the requested fetch type are different
const DB_TYPE_CONVERSION_MAP = new Map([
  [DB_TYPE_BINARY_DOUBLE, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_BINARY_FLOAT, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_BLOB, new Map([
    [DB_TYPE_RAW, DB_TYPE_LONG_RAW],
    [DB_TYPE_LONG_RAW, DB_TYPE_LONG_RAW]
  ])],
  [DB_TYPE_CHAR, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_CLOB, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_LONG],
    [DB_TYPE_LONG, DB_TYPE_LONG]
  ])],
  [DB_TYPE_DATE, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
    [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_LTZ]
  ])],
  [DB_TYPE_JSON, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_LONG, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_LONG]
  ])],
  [DB_TYPE_LONG_RAW, new Map([
    [DB_TYPE_RAW, DB_TYPE_LONG_RAW]
  ])],
  [DB_TYPE_NCHAR, new Map([
    [DB_TYPE_CHAR, DB_TYPE_NCHAR],
    [DB_TYPE_VARCHAR, DB_TYPE_NVARCHAR],
    [DB_TYPE_NVARCHAR, DB_TYPE_NVARCHAR]
  ])],
  [DB_TYPE_NCLOB, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_LONG_NVARCHAR],
    [DB_TYPE_NVARCHAR, DB_TYPE_LONG_NVARCHAR],
    [DB_TYPE_LONG, DB_TYPE_LONG_NVARCHAR],
    [DB_TYPE_LONG_NVARCHAR, DB_TYPE_LONG_NVARCHAR]
  ])],
  [DB_TYPE_NUMBER, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_NVARCHAR, new Map([
    [DB_TYPE_CHAR, DB_TYPE_NCHAR],
    [DB_TYPE_NCHAR, DB_TYPE_NCHAR],
    [DB_TYPE_VARCHAR, DB_TYPE_NVARCHAR]
  ])],
  [DB_TYPE_RAW, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_ROWID, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_ROWID]
  ])],
  [DB_TYPE_TIMESTAMP, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
    [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_LTZ]
  ])],
  [DB_TYPE_TIMESTAMP_LTZ, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
    [DB_TYPE_TIMESTAMP_TZ, DB_TYPE_TIMESTAMP_TZ]
  ])],
  [DB_TYPE_TIMESTAMP_TZ, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
    [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_LTZ]
  ])],
  [DB_TYPE_UROWID, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_ROWID]
  ])],
  [DB_TYPE_VECTOR, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_LONG],
    [DB_TYPE_LONG, DB_TYPE_LONG],
    [DB_TYPE_CLOB, DB_TYPE_CLOB]
  ])],
]);

// default fetch type map
const DB_TYPE_FETCH_TYPE_MAP = new Map([
  [DB_TYPE_BFILE, DB_TYPE_BFILE],
  [DB_TYPE_BINARY_DOUBLE, DB_TYPE_BINARY_DOUBLE],
  [DB_TYPE_BINARY_FLOAT, DB_TYPE_BINARY_FLOAT],
  [DB_TYPE_BINARY_INTEGER, DB_TYPE_BINARY_INTEGER],
  [DB_TYPE_BLOB, DB_TYPE_BLOB],
  [DB_TYPE_BOOLEAN, DB_TYPE_BOOLEAN],
  [DB_TYPE_CHAR, DB_TYPE_CHAR],
  [DB_TYPE_CLOB, DB_TYPE_CLOB],
  [DB_TYPE_CURSOR, DB_TYPE_CURSOR],
  [DB_TYPE_DATE, DB_TYPE_DATE],
  [DB_TYPE_INTERVAL_DS, DB_TYPE_INTERVAL_DS],
  [DB_TYPE_INTERVAL_YM, DB_TYPE_INTERVAL_YM],
  [DB_TYPE_JSON, DB_TYPE_JSON],
  [DB_TYPE_LONG, DB_TYPE_LONG],
  [DB_TYPE_LONG_NVARCHAR, DB_TYPE_LONG_NVARCHAR],
  [DB_TYPE_LONG_RAW, DB_TYPE_LONG_RAW],
  [DB_TYPE_NCHAR, DB_TYPE_NCHAR],
  [DB_TYPE_NCLOB, DB_TYPE_NCLOB],
  [DB_TYPE_NUMBER, DB_TYPE_NUMBER],
  [DB_TYPE_NVARCHAR, DB_TYPE_NVARCHAR],
  [DB_TYPE_OBJECT, DB_TYPE_OBJECT],
  [DB_TYPE_RAW, DB_TYPE_RAW],
  [DB_TYPE_ROWID, DB_TYPE_ROWID],
  [DB_TYPE_TIMESTAMP, DB_TYPE_TIMESTAMP],
  [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_TZ],
  [DB_TYPE_TIMESTAMP_TZ, DB_TYPE_TIMESTAMP_TZ],
  [DB_TYPE_UROWID, DB_TYPE_UROWID],
  [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
  [DB_TYPE_XMLTYPE, DB_TYPE_XMLTYPE],
  [DB_TYPE_VECTOR, DB_TYPE_VECTOR]
]);

// additional aliases for types by column type name
dbTypeByColumnTypeName.set("PL/SQL BOOLEAN", DB_TYPE_BOOLEAN);
dbTypeByColumnTypeName.set("PL/SQL BINARY INTEGER", DB_TYPE_BINARY_INTEGER);
dbTypeByColumnTypeName.set("PL/SQL PLS INTEGER", DB_TYPE_BINARY_INTEGER);
dbTypeByColumnTypeName.set("TIMESTAMP WITH LOCAL TZ", DB_TYPE_TIMESTAMP_LTZ);
dbTypeByColumnTypeName.set("TIMESTAMP WITH TZ", DB_TYPE_TIMESTAMP_TZ);

// It abstracts the autogenerated SODA Document key.
class JsonId extends Uint8Array {
  toJSON() {
    return (Buffer.from(this.buffer).toString('hex'));
  }
}

// Represents the SparseVector.
// indices must be an regular Array
// values can be regular or typedArray.
class SparseVector {
  constructor(input) {
    this._indices = new Uint32Array(0);
    this._values = new Float64Array(0);
    this._numDimensions = 0;

    if (!input) {
      return;
    }
    if (typeof input === 'object' &&
      "numDimensions" in input &&
      "indices" in input &&
      "values" in input
    ) {
      // Object has valid properties for Sparse.
      this._fromObject(input);
    } else if (typeof input === 'string') {
      // initialize from string.
      this._fromString(input);
    } else if (this._validDenseArray(input)) {
      // dense array
      this._fromDense(input);
    } else {
      errors.throwErr(errors.ERR_VECTOR_SPARSE_INVALID_INPUT);
    }
  }

  _validDenseArray(value) {
    return (value instanceof Float32Array ||
      value instanceof Float64Array ||
      value instanceof Int8Array || (Object.getPrototypeOf(value)
        === Uint8Array.prototype) || Array.isArray(value));
  }

  // Check if indexArray and valuesArray have the same length
  static _validateLengths(indices, values) {
    if (indices.length !== values.length) {
      if (!(values instanceof Uint8Array)) {
      // Skip for binary vector format
        errors.throwErr(errors.ERR_VECTOR_SPARSE_INDICES_VALUES_NOT_EQUAL);
      }
    }
  }

  _updateProperties(dims, indices, values) {
    if (!this._validDenseArray(values)) {
      errors.throwErr(errors.ERR_VECTOR_SPARSE_VALUES_IS_NOT_ARRAY);
    }
    if (!(indices instanceof Uint32Array) && !Array.isArray(indices)) {
      errors.throwErr(errors.ERR_VECTOR_SPARSE_INDICES_IS_NOT_ARRAY);
    }
    SparseVector._validateLengths(indices, values);
    if (!(typeof dims === 'number' && Number.isInteger(dims) && dims > 0)) {
      errors.throwErr(errors.ERR_VECTOR_SPARSE_DIMS_IS_NOT_INTEGER);
    }

    this._numDimensions = dims;
    this._indices = indices;
    this._values = values;
    this._convertToTypedArrays();
  }

  _fromObject(input) {
    this._updateProperties(input.numDimensions, input.indices, input.values);
  }

  _convertToTypedArrays() {
    // convert to typed arrays.
    if (!(this._indices instanceof Uint32Array)) {
      // validate elements are valid uint32 type.
      const indices = new Uint32Array(this._indices.map((x, index) => {
        if (typeof x !== 'number' || !Number.isInteger(x)) {
          errors.throwErr(errors.ERR_VECTOR_SPARSE_INDICES_ELEM_IS_NOT_VALID, index);
        }
        if (x < 0 || x > MAX_UINT32 || x > (this.numDimensions - 1)) {
          errors.throwErr(errors.ERR_VECTOR_SPARSE_INDICES_ELEM_IS_NOT_VALID,
            index);
        }
        return x;
      }));
      this._indices = indices;
    }

    this._values = Array.isArray(this._values) ? new Float64Array(this._values)
      : this._values;
  }

  // Initialize the state using the dense array.
  // The length of input is assumed to be same as
  // dimensions of sparse Vector column.
  // values will be an array even if input is a typedArray.
  _fromDense(input) {
    this._indices = [];
    this._values = [];

    for (let i = 0; i < input.length; i++) {
      if (input[i] !== 0) {
        this._indices.push(i);
        this._values.push(input[i]);
      }
    }
    this._numDimensions = input.length;
    this._convertToTypedArrays();
  }

  // parse a string input into a sparse vector
  _fromString(str) {
    let data;

    // verify it is a valid JSON
    try {
      // use simple tokenizer?
      data = JSON.parse(str);
    } catch (e) {
      errors.throwErr(errors.ERR_VECTOR_SPARSE_INVALID_JSON);
    }

    // Check if data is an array with exactly 3 elements
    if (!Array.isArray(data) || data.length !== 3) {
      errors.throwErr(errors.ERR_VECTOR_SPARSE_INVALID_STRING);
    }

    const [dims, indices, values] = data;
    this._updateProperties(dims, indices, values);
  }

  // Internal method to create an instance
  static create(sparseValue) {
    SparseVector._validateLengths(sparseValue.indices, sparseValue.values);
    const instance = Object.create(this.prototype);
    instance._numDimensions = sparseValue.numDimensions;
    instance._indices = sparseValue.indices;
    instance._values = sparseValue.values;
    return instance;
  }

  get indices() {
    return this._indices;
  }

  get values() {
    return this._values;
  }

  get numDimensions() {
    return this._numDimensions;
  }

  toJSON() {
    return {
      numDimensions: this._numDimensions,
      indices: this._indices,
      values: this._values,
    };
  }

  // It always constructs a typedArray.
  _createEmptyArray(input, len) {
    if (Array.isArray(input)) {
      return new Float64Array(len);
    } else {
      // same typedArray of input type.
      return new input.constructor(len);
    }
  }

  // Convert sparse vector to a dense vector
  // It returns typed array.
  dense() {
    if (this._numDimensions === 0) {
      return null;
    }
    const dense = this._createEmptyArray(this._values, this._numDimensions);
    this._indices.forEach((index, i) => {
      dense[index] = this._values[i];
    });
    return dense;
  }
}

// Interval Year-to-Month Class
class IntervalYM {
  constructor(obj) {
    if (obj) {
      errors.assertParamPropInt(obj, 1, "years");
      errors.assertParamPropInt(obj, 1, "months");
    }
    this.years = obj?.years || 0;
    this.months = obj?.months || 0;
  }
}

// Interval Day-to-Second Class
class IntervalDS {
  constructor(obj) {
    if (obj) {
      errors.assertParamPropInt(obj, 1, "days");
      errors.assertParamPropInt(obj, 1, "hours");
      errors.assertParamPropInt(obj, 1, "minutes");
      errors.assertParamPropInt(obj, 1, "seconds");
      errors.assertParamPropInt(obj, 1, "fseconds");
    }
    this.days = obj?.days || 0;
    this.hours = obj?.hours || 0;
    this.minutes = obj?.minutes || 0;
    this.seconds = obj?.seconds || 0;
    this.fseconds = obj?.fseconds || 0;
  }
}

module.exports = {
  DbType,
  DB_TYPE_BFILE,
  DB_TYPE_BINARY_DOUBLE,
  DB_TYPE_BINARY_FLOAT,
  DB_TYPE_BINARY_INTEGER,
  DB_TYPE_BLOB,
  DB_TYPE_BOOLEAN,
  DB_TYPE_CHAR,
  DB_TYPE_CLOB,
  DB_TYPE_CURSOR,
  DB_TYPE_DATE,
  DB_TYPE_INTERVAL_DS,
  DB_TYPE_INTERVAL_YM,
  DB_TYPE_JSON,
  DB_TYPE_LONG,
  DB_TYPE_LONG_NVARCHAR,
  DB_TYPE_LONG_RAW,
  DB_TYPE_NCHAR,
  DB_TYPE_NCLOB,
  DB_TYPE_NUMBER,
  DB_TYPE_NVARCHAR,
  DB_TYPE_OBJECT,
  DB_TYPE_RAW,
  DB_TYPE_ROWID,
  DB_TYPE_TIMESTAMP,
  DB_TYPE_TIMESTAMP_LTZ,
  DB_TYPE_TIMESTAMP_TZ,
  DB_TYPE_UROWID,
  DB_TYPE_VARCHAR,
  DB_TYPE_VECTOR,
  DB_TYPE_CONVERSION_MAP,
  DB_TYPE_FETCH_TYPE_MAP,
  DB_TYPE_XMLTYPE,
  getTypeByColumnTypeName,
  getTypeByNum,
  getTypeByOraTypeNum,
  JsonId,
  SparseVector,
  IntervalYM,
  IntervalDS
};
