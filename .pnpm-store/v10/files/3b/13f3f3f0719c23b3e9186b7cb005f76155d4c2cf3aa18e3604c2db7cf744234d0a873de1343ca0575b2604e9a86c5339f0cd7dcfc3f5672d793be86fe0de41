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

const errors = require('../errors.js');
const BaseImpl = require('./base.js');

class SodaDatabaseImpl extends BaseImpl {

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this._connection;
  }

  //---------------------------------------------------------------------------
  // createCollection()
  //
  // Creates and returns a SODA collection.
  //---------------------------------------------------------------------------
  createCollection() {
    errors.throwNotImplemented("creating a SODA collection");
  }

  //---------------------------------------------------------------------------
  // createDocument()
  //
  // Creates and returns a SODA document.
  //---------------------------------------------------------------------------
  createDocument() {
    errors.throwNotImplemented("creating a SODA document");
  }

  //---------------------------------------------------------------------------
  // getCollectionNames()
  //
  // Returns a list of the collection names available in the database.
  //---------------------------------------------------------------------------
  getCollectionNames() {
    errors.throwNotImplemented("getting a list of SODA collection names");
  }

  //---------------------------------------------------------------------------
  // openCollection()
  //
  // Opens a SODA collection and returns it.
  //---------------------------------------------------------------------------
  openCollection() {
    errors.throwNotImplemented("getting a list of SODA collection names");
  }

}

module.exports = SodaDatabaseImpl;
