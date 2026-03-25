// Copyright (c) 2024, 2025, Oracle and/or its affiliates.

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

const { BaseBuffer, GrowableBuffer } = require('./buffer.js');
const { Buffer } = require('buffer');
const constants = require("./constants.js");
const errors = require("../../errors.js");
const types = require("../../types.js");

/**
 * Class used for decoding
 */
class VectorDecoder extends BaseBuffer {

  //---------------------------------------------------------------------------
  // decode()
  //
  // Decodes the VECTOR image and returns a JavaScript array corresponding to
  // its contents.
  //---------------------------------------------------------------------------
  decode() {

    // parse header
    const magicByte = this.readUInt8();
    if (magicByte != constants.TNS_VECTOR_MAGIC_BYTE)
      errors.throwErr(errors.ERR_UNEXPECTED_DATA,
        Buffer.from([magicByte]).toString('hex'));
    const version = this.readUInt8();
    if (version > constants.TNS_VECTOR_VERSION_WITH_SPARSE)
      errors.throwErr(errors.ERR_VECTOR_VERSION_NOT_SUPPORTED, version);
    const flags = this.readUInt16BE();
    const vectorFormat = this.readUInt8();
    let numElements = this.readUInt32BE();
    let elementSize, value, sparseValue;

    // For binary vector, NORM will never be present but space for NORM is reserved to keep
    // same header lengh across the different vector formats.
    if (vectorFormat === constants.VECTOR_FORMAT_BINARY || flags & constants.TNS_VECTOR_FLAG_NORM)
      this.skipBytes(8);

    let sparseFormat;
    if (flags & constants.TNS_VECTOR_FLAG_SPARSE) {
      sparseFormat = true;
      sparseValue = {};
      sparseValue.numDimensions = numElements; // vector dimensions.
      numElements = this.readUInt16BE(); // actual elements.
      sparseValue.indices = new Uint32Array(numElements);
      for (let i = 0; i < numElements; i++) {
        sparseValue.indices[i] = this.readUInt32BE();
      }
    }

    if (vectorFormat === constants.VECTOR_FORMAT_FLOAT32) {
      elementSize = 4;
      value = new Float32Array(numElements);
    } else if (vectorFormat === constants.VECTOR_FORMAT_FLOAT64) {
      elementSize = 8;
      value = new Float64Array(numElements);
    } else if (vectorFormat === constants.VECTOR_FORMAT_INT8) {
      elementSize = 1;
      value = new Int8Array(numElements);
    } else if (vectorFormat === constants.VECTOR_FORMAT_BINARY) {
      elementSize = 1;
      // The number of dimensions are assumed to be multiple of 8.
      numElements = numElements / 8;
      value = new Uint8Array(numElements);
    } else {
      errors.throwErr(errors.ERR_VECTOR_FORMAT_NOT_SUPPORTED, vectorFormat);
    }

    if (sparseFormat) {
      sparseValue.values = value;
    }

    // parse data
    let res;
    for (let i = 0; i < numElements; i++) {
      const buf = this.readBytes(elementSize);
      if (vectorFormat === constants.VECTOR_FORMAT_FLOAT32) {
        res = this.parseBinaryFloat(buf);
      } else if (vectorFormat === constants.VECTOR_FORMAT_FLOAT64)  {
        res = this.parseBinaryDouble(buf);
      } else {
        res = buf[0];
      }
      value[i] = res;
    }

    return sparseFormat ? types.SparseVector.create(sparseValue) : value;
  }

}

class VectorEncoder extends GrowableBuffer {

  // Writes Header from value.
  // It returns function to serialize the value.
  // sparseVal is provided for SparseVector.
  _updateVectorHeader(value, sparseVal) {
    let flags = constants.TNS_VECTOR_FLAG_NORMSRC
    | constants.TNS_VECTOR_FLAG_NORM; // NORM is present and reserve space.
    let numElements = value.length;
    let vectorVersion = constants.TNS_VECTOR_VERSION_BASE;
    let vectorFormat = constants.VECTOR_FORMAT_FLOAT32;
    let writeFn = this.writeBinaryFloat.bind(this);

    if (Array.isArray(value) || value instanceof Float64Array) {
      vectorFormat = constants.VECTOR_FORMAT_FLOAT64;
      writeFn = this.writeBinaryDouble.bind(this);
    } else if (value instanceof Int8Array) {
      vectorFormat = constants.VECTOR_FORMAT_INT8;
      writeFn = this.writeSB1.bind(this);
    } else if (value.constructor.name === 'Uint8Array') {
      vectorFormat = constants.VECTOR_FORMAT_BINARY;
      // The number of dimensions are assumed to be multiple of 8.
      numElements = numElements * 8;
      vectorVersion = constants.TNS_VECTOR_VERSION_WITH_BINARY;
      flags = constants.TNS_VECTOR_FLAG_NORMSRC; // only space is reserved.
      writeFn = this.writeUInt8.bind(this);
    }
    if (sparseVal && sparseVal instanceof types.SparseVector) {
      vectorVersion = constants.TNS_VECTOR_VERSION_WITH_SPARSE;
      numElements = sparseVal.numDimensions;
      flags |= constants.TNS_VECTOR_FLAG_SPARSE;
    }

    // write header
    this.writeUInt8(constants.TNS_VECTOR_MAGIC_BYTE);
    this.writeUInt8(vectorVersion);
    this.writeUInt16BE(flags);
    this.writeUInt8(vectorFormat);
    this.writeUInt32BE(numElements);
    this.reserveBytes(8);
    return writeFn;
  }

  //---------------------------------------------------------------------------
  // encode()
  //
  // Encodes the value as OSON and returns a buffer containing the OSON bytes.
  //---------------------------------------------------------------------------
  encode(value) {
    let writeFn;

    if (value instanceof types.SparseVector) {
      writeFn = this._updateVectorHeader(value.values, value);
      const numElements = value.indices.length;
      this.writeUInt16BE(numElements);

      // Write indices
      value.indices.forEach((element) => {
        this.writeUInt32BE(element);
      });
      value = value.values;
    } else {
      writeFn = this._updateVectorHeader(value);
    }

    // write data
    value.forEach((element) => {
      writeFn(element);
    });

    return this.buf.subarray(0, this.pos);
  }

}

module.exports = {
  VectorDecoder,
  VectorEncoder
};
