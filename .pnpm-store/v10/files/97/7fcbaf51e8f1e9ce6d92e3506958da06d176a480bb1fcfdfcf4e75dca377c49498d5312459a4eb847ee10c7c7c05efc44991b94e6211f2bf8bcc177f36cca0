// Copyright (c) 2022, Oracle and/or its affiliates.

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

const ConnectionImpl = require('./connection.js');
const errors = require('../errors.js');
const BaseImpl = require('./base.js');

class LobImpl extends BaseImpl {

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    let parentObj = this._parentObj;
    while (!(parentObj instanceof ConnectionImpl))
      parentObj = parentObj._parentObj;
    return parentObj;
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the LOB.
  //---------------------------------------------------------------------------
  close() {
    errors.throwNotImplemented("closing a LOB");
  }

  //---------------------------------------------------------------------------
  // fileExists()
  //
  // Checks if BFILE present or not.
  //---------------------------------------------------------------------------
  fileExists() {
    errors.throwNotImplemented("check if BFILE exists");
  }

  //---------------------------------------------------------------------------
  // getData()
  //
  // Returns all of the data in the LOB.
  //---------------------------------------------------------------------------
  getData() {
    errors.throwNotImplemented("getting all of the data from a LOB");
  }

  //---------------------------------------------------------------------------
  // getDirFileName()
  //
  // returns directory and filename of LOB (BFILE).
  //----------------------------------------------------------------------------
  getDirFileName() {
    errors.throwNotImplemented("getting directory and filename of LOB(BFILE)");
  }

  //---------------------------------------------------------------------------
  // read()
  //
  // Reads data from the LOB at the specified offset.
  //---------------------------------------------------------------------------
  read() {
    errors.throwNotImplemented("reading from a LOB");
  }

  //---------------------------------------------------------------------------
  // setDirFileName()
  //
  // sets directory and filename for LOB (BFILE)
  //---------------------------------------------------------------------------
  setDirFileName() {
    errors.throwNotImplemented("setting directory and filename of LOB(BFILE)");
  }

  //---------------------------------------------------------------------------
  // write()
  //
  // Writes data to the LOB at the specified offset.
  //---------------------------------------------------------------------------
  write() {
    errors.throwNotImplemented("writing to a LOB");
  }

}

module.exports = LobImpl;
