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
const LobImpl = require('../impl/lob.js');
const constants = require('./protocol/constants.js');
const LobOpMessage = require('./protocol/messages/lobOp.js');
const errors = require('../errors.js');
const types = require('../types.js');

class ThinLobImpl extends LobImpl {

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this.conn;
  }

  //---------------------------------------------------------------------------
  // _sendMessage()
  //
  // Sends a LOB operation message to the server and processes the response.
  //---------------------------------------------------------------------------
  async _sendMessage(options) {
    const message = new LobOpMessage(this.conn, options);
    await this.conn._protocol._processMessage(message);
    if (options.operation === constants.TNS_LOB_OP_READ) {
      return (message.data) ? message.data : null;
    } else if (
      options.operation === constants.TNS_LOB_OP_FILE_EXISTS ||
      options.operation === constants.TNS_LOB_OP_FILE_ISOPEN
    ) {
      return message.boolFlag;
    } else {
      return message.amount;
    }
  }

  //---------------------------------------------------------------------------
  // getChunkSize()
  //
  // Internal method for returning the chunk size of the LOB.
  //---------------------------------------------------------------------------
  getChunkSize() {
    return this._chunkSize;
  }

  //---------------------------------------------------------------------------
  // _getChunkSizeAsync()
  //
  // Internal method for returning the chunk size of the LOB fetched from
  // the database.
  //---------------------------------------------------------------------------
  async _getChunkSizeAsync() {
    this.checkConn();
    const options = {
      operation: constants.TNS_LOB_OP_GET_CHUNK_SIZE,
      sourceLobImpl: this,
      sendAmount: true
    };
    this._chunkSize = this._pieceSize = await this._sendMessage(options);
  }

  //---------------------------------------------------------------------------
  // getLength()
  //
  // Internal method for returning the length of a LOB.
  //---------------------------------------------------------------------------
  getLength() {
    return this._length;
  }

  //---------------------------------------------------------------------------
  // getPieceSize()
  //
  // Internal method returning the size to use for each piece that is
  // transferred when reading from the LOB.
  //---------------------------------------------------------------------------
  getPieceSize() {
    return this._pieceSize;
  }

  //---------------------------------------------------------------------------
  // setPieceSize()
  //
  // Internal method to set the pieceSize for LOBs.
  //---------------------------------------------------------------------------
  setPieceSize(value) {
    this._pieceSize = value;
  }

  //---------------------------------------------------------------------------
  // getType()
  //
  // Internal method returning the datatype of LOBs.
  //---------------------------------------------------------------------------
  getType() {
    return this.dbType;
  }

  //---------------------------------------------------------------------------
  // getData()
  //
  // Internal method returning the data obtained from the database.
  //---------------------------------------------------------------------------
  async getData(offset = 1, len = this._length) {
    let shouldClose = false;
    if (!len) {
      len = this._length;
    }
    if (this.dbType === types.DB_TYPE_BFILE) {
      if (!await this.isFileOpen()) {
        shouldClose = true;
        await this.openFile();
      }
    }
    let data;
    // if read fails and BFILE was opened by application, we close it.
    try {
      data = await this.read(offset, len);
    } finally {
      if (shouldClose) {
        await this.closeFile();
      }
    }
    return data;
  }

  //---------------------------------------------------------------------------
  // read()
  //
  // Internal method for reading a portion (or all) of the data in the LOB.
  //---------------------------------------------------------------------------
  async read(offset, length) {
    this.checkConn();
    const options = {
      operation: constants.TNS_LOB_OP_READ,
      sourceLobImpl: this,
      sourceOffset: offset,
      sendAmount: true,
      amount: length || this._pieceSize
    };
    return await this._sendMessage(options);
  }

  //---------------------------------------------------------------------------
  // write()
  //
  // Internal method for writing data to the LOB object.
  //---------------------------------------------------------------------------
  async write(offset, data) {
    this.checkConn();
    const options = {
      operation: constants.TNS_LOB_OP_WRITE,
      sourceLobImpl: this,
      sourceOffset: offset,
      data: data
    };
    await this._sendMessage(options);
    this._length += data.length;
  }

  //---------------------------------------------------------------------------
  // getCsfrm()
  //
  // Return the character set encoding used by the LOB.
  //---------------------------------------------------------------------------
  getCsfrm() {
    if (this.dbType._csfrm !== constants.CSFRM_NCHAR) {
      if (this._locator[constants.TNS_LOB_LOC_OFFSET_FLAG_3] &
          constants.TNS_LOB_LOC_FLAGS_VAR_LENGTH_CHARSET) {
        return constants.CSFRM_NCHAR;
      }
    }
    return this.dbType._csfrm;
  }

  /**
   * Creates a temporary LOB.
   *
   * @param {object} conn Connection Impl object
   * @param {number} dbType indicates BLOB/CLOB DB type
   */
  async create(conn, dbType) {
    this.dirtyLength = false;
    this.conn = conn;
    this.dbType = dbType;
    this._locator = Buffer.alloc(40);
    this._isTempLob = true;
    this._length = 0;
    const options = {
      operation: constants.TNS_LOB_OP_CREATE_TEMP,
      sourceLobImpl: this,
      destOffset: dbType._oraTypeNum,
      sourceOffset: dbType._csfrm,
      destLength: constants.TNS_DURATION_SESSION
    };
    await this._sendMessage(options);
    await this._getChunkSizeAsync();
  }

  //---------------------------------------------------------------------------
  // fileExists()
  //
  // Internal method for returning whether the file referenced by a BFILE
  // exists.
  //---------------------------------------------------------------------------
  async fileExists() {
    this.checkConn();
    const options = {
      operation: constants.TNS_LOB_OP_FILE_EXISTS,
      sourceLobImpl: this,
    };
    return await this._sendMessage(options);
  }

  //---------------------------------------------------------------------------
  // getDirFileName()
  //
  // Internal method for returning the directory alias and name of the file
  // referenced by a BFILE
  //---------------------------------------------------------------------------
  getDirFileName() {
    const dirNameOffset = constants.TNS_LOB_LOC_FIXED_OFFSET + 2;
    const dirNameLen = this._locator.readUInt16BE(
      constants.TNS_LOB_LOC_FIXED_OFFSET
    );
    const fileNameOffset = constants.TNS_LOB_LOC_FIXED_OFFSET + dirNameLen + 4;
    const fileNameLen = this._locator.readUInt16BE(
      dirNameOffset + dirNameLen
    );
    const dirName = this._locator.slice(
      dirNameOffset, dirNameOffset + dirNameLen
    ).toString();
    const fileName = this._locator.slice(
      fileNameOffset, fileNameOffset + fileNameLen
    ).toString();
    return { dirName: dirName, fileName: fileName };
  }

  //---------------------------------------------------------------------------
  // checkConn()
  //
  // Internal method to check the connection.
  //---------------------------------------------------------------------------
  checkConn() {
    if (!this.conn.nscon.connected)
      errors.throwErr(errors.ERR_INVALID_CONNECTION);
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Internal method to close the LOBs using piggyback mechanism.
  //---------------------------------------------------------------------------
  close() {
    this.checkConn();
    if (this._isTempLob) {
      // Add to freelist which will be sent in piggyback fashion
      this.conn._tempLobsToClose.push(this._locator);
      this.conn._tempLobsTotalSize += this._locator.length;
    }
  }

  //---------------------------------------------------------------------------
  // closeFile()
  //
  // Internal method to close the opened file for BFILE LOBs.
  //---------------------------------------------------------------------------
  async closeFile() {
    this.checkConn();
    const options = {
      operation: constants.TNS_LOB_OP_FILE_CLOSE,
      sourceLobImpl: this,
    };
    await this._sendMessage(options);
  }

  //---------------------------------------------------------------------------
  // init()
  //
  // Internal method to initialize LOBs.
  //---------------------------------------------------------------------------
  init(conn, locator, dbType, len, chunkSize) {
    this.dirtyLength = false;
    this.conn = conn;
    this._locator = locator;
    this._isTempLob = false;
    if (this._locator[constants.TNS_LOB_LOC_OFFSET_FLAG_4] & constants.TNS_LOB_LOC_FLAGS_TEMP === constants.TNS_LOB_LOC_FLAGS_TEMP
      || this._locator[constants.TNS_LOB_LOC_OFFSET_FLAG_1] & constants.TNS_LOB_LOC_FLAGS_ABSTRACT === constants.TNS_LOB_LOC_FLAGS_ABSTRACT) {
      this._isTempLob = true;
    }
    this.dbType = dbType;
    this._length = len;
    this._chunkSize = chunkSize;
    this._pieceSize = chunkSize;
  }

  //---------------------------------------------------------------------------
  // isFileOpen()
  //
  // Internal method to check if the file is already open.
  //---------------------------------------------------------------------------
  async isFileOpen() {
    const options = {
      operation: constants.TNS_LOB_OP_FILE_ISOPEN,
      sourceLobImpl: this
    };
    await this._sendMessage(options);
  }

  //---------------------------------------------------------------------------
  // openFile()
  //
  // Internal method for opening file (BFILE).
  //---------------------------------------------------------------------------
  async openFile() {
    this.checkConn();
    const options =  {
      operation: constants.TNS_LOB_OP_FILE_OPEN,
      sourceLobImpl: this,
      amount: constants.TNS_LOB_OPEN_READ_ONLY,
      sendAmount: true
    };
    return await this._sendMessage(options);
  }

  //---------------------------------------------------------------------------
  // setDirFileName()
  //
  // Internal method for setting the directory alias and name of the file
  // referenced by a BFILE
  //---------------------------------------------------------------------------
  setDirFileName(dirObject) {
    const dirNameLen = Buffer.byteLength(dirObject.dirName);
    const dirNameOffset = constants.TNS_LOB_LOC_FIXED_OFFSET + 2;
    const fileNameOffset = dirNameOffset + dirNameLen + 2;
    const fileNameLen = Buffer.byteLength(dirObject.fileName);
    const newLocLen = fileNameOffset + fileNameLen;
    const newLocator = Buffer.allocUnsafe(newLocLen);
    this._locator.copy(newLocator, 0, 0, constants.TNS_LOB_LOC_FIXED_OFFSET + 1);
    newLocator.writeUInt16BE(dirNameLen, constants.TNS_LOB_LOC_FIXED_OFFSET);
    newLocator.write(dirObject.dirName, dirNameOffset);
    newLocator.writeInt16BE(fileNameLen, dirNameOffset + dirNameLen);
    newLocator.write(dirObject.fileName, fileNameOffset);
    this._locator = newLocator;
  }

}

module.exports = ThinLobImpl;
