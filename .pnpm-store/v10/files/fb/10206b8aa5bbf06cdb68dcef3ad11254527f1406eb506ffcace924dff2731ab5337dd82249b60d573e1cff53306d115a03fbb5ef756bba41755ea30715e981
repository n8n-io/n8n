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

const { Buffer } = require('buffer');
const { Duplex } = require('stream');
const constants = require('./constants.js');
const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const types = require('./types.js');

class Lob extends Duplex {

  constructor() {
    super({ decodeStrings: false });
    this.offset = 1;
    this._isActive = false;
    this.once('finish', function() {
      if (this._autoCloseLob) {
        this.destroy();
      }
    });
  }

  // called by BFILE specific functions to throw errors for other
  // datatypes.
  _checkIsBfile() {
    if (this.type !== types.DB_TYPE_BFILE) {
      errors.throwErr(errors.ERR_OPERATION_ONLY_SUPPORTED_ON_BFILE);
    }
  }

  // called by functions not allowed for BFILE and throw errors if
  // such operations are performed on BFILE.
  _checkNotBfile() {
    if (this.type === types.DB_TYPE_BFILE) {
      errors.throwErr(errors.ERR_OPERATION_NOT_SUPPORTED_ON_BFILE);
    }
  }

  // called by stream.destroy() and ensures that the LOB is closed if it has
  // not already been closed (never called directly)
  async _destroy(err, cb) {
    // if LOB was already closed, nothing to do!
    if (err && err.message.startsWith("NJS-003:"))
      delete this._impl;
    if (this._impl) {
      const lobImpl = this._impl;
      delete this._impl;
      try {
        await lobImpl.close();
      } catch (closeErr) {
        cb(closeErr);
        return;
      }
    }
    cb(err);
  }

  // implementation of streaming read; if LOB is set to auto-close, the lob is
  // automatically closed when an error occurs or when there are no more bytes
  // to transfer; all that needs to be done here is to destroy the streaming
  // LOB
  async _read() {
    try {
      const data = await this._serializedRead(this.offset);
      if (data) {
        this.offset += data.length;
        this.push(data);
      } else {
        this.push(null);
        if (this._autoCloseLob) {
          this.destroy();
        }
      }
    } catch (err) {
      if (this._autoCloseLob)
        this.destroy(err);
      throw err;
    }
  }

  // simple wrapper so that serialization can take place on a JavaScript fn
  async _readData(offset) {
    errors.assert(this._impl, errors.ERR_INVALID_LOB);
    try {
      return await this._impl.read(offset);
    } catch (err) {
      throw errors.transformErr(err, this._readData);
    }
  }

  // called to associate a LOB implementation with this user facing object
  _setup(lobImpl, autoCloseLob) {
    this._impl = lobImpl;
    // chunk size is not defined for BFILE LOBs
    if (this.type !== types.DB_TYPE_BFILE) {
      this._chunkSize = lobImpl.getChunkSize();
    }
    this._pieceSize = lobImpl.getPieceSize();
    this._length = lobImpl.getLength();
    this._type = lobImpl.getType();
    if (typeof this._type === 'number') {
      this._type = types.getTypeByNum(this._type);
    }
    this._autoCloseLob = autoCloseLob;
  }

  // implementation of streaming write; if LOB is set to auto-close, the lob is
  // automatically closed in the "finish" event; all that needs to be done here
  // is to destroy the streaming LOB
  async _write(data, encoding, cb) {

    // convert data if needed
    if (this.type == constants.DB_TYPE_BLOB && !Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    } else if (this.type == constants.DB_TYPE_CLOB &&
        Buffer.isBuffer(data)) {
      data = data.toString();
    }

    try {
      await this._serializedWrite(this.offset, data);
    } catch (err) {
      if (this._autoCloseLob)
        this.destroy(err);
      cb(err);
      return;
    }
    this.offset += data.length;
    cb(null);

  }

  // simple wrapper so that serialization can take place on a JavaScript fn
  async _writeData(offset, data) {
    errors.assert(this._impl, errors.ERR_INVALID_LOB);
    try {
      await this._impl.write(offset, data);
    } catch (err) {
      throw errors.transformErr(err, this._writeData);
    }
  }

  //---------------------------------------------------------------------------
  // chunkSize
  //
  // Property for the chunk size of the LOB.
  //---------------------------------------------------------------------------
  get chunkSize() {
    this._checkNotBfile();
    return this._chunkSize;
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the LOB and make it unusable for further operations. If the LOB is
  // already closed, nothing is done in order to support multiple close()
  // calls.
  //
  // This method is deprecated and will be removed in a future version of the
  // node-oracledb driver. Use lob.destroy() instead. NOTE: this method will
  // emit a duplicate "close" event in order to be compatible with previous
  // versions of node-oracledb.
  //---------------------------------------------------------------------------
  async close() {
    errors.assertArgCount(arguments, 0, 0);
    if (this._impl) {
      const lobImpl = this._impl;
      delete this._impl;
      try {
        await lobImpl.close();
        this.emit('close');
      } catch (err) {
        this.destroy(err);
      }
    }
  }

  //---------------------------------------------------------------------------
  // getData()
  //
  // Return a portion (or all) of the data in the LOB. Note that the amount
  // and offset are in bytes for BLOB and BFILE type LOBs and in UCS - 2 code
  // points for CLOB and NCLOB type LOBs.UCS-2 code points are equivalent
  // to characters for all but supplemental characters.If supplemental
  // characters are in the LOB, the offset and amount will have to be chosen
  // carefully to avoid splitting a character.
  // Returns data in the LOB as a single string or buffer.
  //---------------------------------------------------------------------------
  async getData(offset, amount) {
    errors.assertArgCount(arguments, 0, 2);
    if (offset === undefined) {
      offset = 1;
    } else {
      errors.assertParamValue(Number.isInteger(offset) && offset > 0, 1);
    }
    if (amount === undefined) {
      amount = 0;
    } else {
      errors.assertParamValue(Number.isInteger(amount) && amount > 0, 2);
    }
    errors.assert(this._impl, errors.ERR_INVALID_LOB);
    return await this._impl.getData(offset, amount);
  }

  //---------------------------------------------------------------------------
  // getDirFileName()
  //  To obtain the BFILE Lob object properties dirName & fileName
  //---------------------------------------------------------------------------
  getDirFileName() {
    this._checkIsBfile();
    return this._impl.getDirFileName();
  }

  //--------------------------------------------------------------------------
  // setDirFileName()
  //  To set the BFILE Lob object properties dirName & fileName
  //--------------------------------------------------------------------------
  setDirFileName(a1) {
    this._checkIsBfile();
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(a1), 1);
    errors.assertParamValue(Object.hasOwn(a1, "dirName"), 1);
    errors.assertParamValue(Object.hasOwn(a1, "fileName"), 1);
    errors.assertPropValue(
      a1.dirName != "" && a1.dirName != null, "dirName"
    );
    errors.assertPropValue(
      a1.fileName != "" && a1.fileName != null, "fileName"
    );
    this._impl.setDirFileName(a1);
  }

  //---------------------------------------------------------------------------
  // fileExists
  //
  //   To obtain file existence status of BFILE file
  //---------------------------------------------------------------------------
  async fileExists() {
    this._checkIsBfile();
    return await this._impl.fileExists();
  }

  //---------------------------------------------------------------------------
  // length
  //
  // Property for the length of the LOB.
  //---------------------------------------------------------------------------
  get length() {
    return this._length;
  }

  //---------------------------------------------------------------------------
  // pieceSize
  //
  // Property for the size to use for each piece that is transferred when
  // reading from the LOB.
  //---------------------------------------------------------------------------
  get pieceSize() {
    return this._pieceSize;
  }

  set pieceSize(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0, "pieceSize");
    errors.assert(this._impl, errors.ERR_INVALID_LOB);
    this._impl.setPieceSize(value);
    this._pieceSize = value;
  }

  //---------------------------------------------------------------------------
  // type
  //
  // Property for the type of the LOB.
  //---------------------------------------------------------------------------
  get type() {
    return this._type;
  }

}

nodbUtil.wrapFns(Lob.prototype, errors.ERR_BUSY_LOB,
  "close",
  "fileExists",
  "getData");
Lob.prototype._serializedRead = nodbUtil.wrapFn(Lob.prototype._readData, true);
Lob.prototype._serializedWrite =
  nodbUtil.wrapFn(Lob.prototype._writeData, true);

module.exports = Lob;
