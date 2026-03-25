// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

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

class SodaOperationImpl extends BaseImpl {

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this._collection._database._connection;
  }

  //---------------------------------------------------------------------------
  // count()
  //
  // Returns the number of documents matching the criteria.
  //---------------------------------------------------------------------------
  count() {
    errors.throwNotImplemented("getting a count of documents");
  }

  //---------------------------------------------------------------------------
  // getCursor()
  //
  // Returns a cursor for documents matching the criteria.
  //---------------------------------------------------------------------------
  getCursor() {
    errors.throwNotImplemented("getting a cursor for documents");
  }

  //---------------------------------------------------------------------------
  // getDocuments()
  //
  // Returns an array of documents matching the criteria.
  //---------------------------------------------------------------------------
  getDocuments() {
    errors.throwNotImplemented("getting a cursor for documents");
  }

  //---------------------------------------------------------------------------
  // getOne()
  //
  // Returns a single document matching the criteria.
  //---------------------------------------------------------------------------
  getOne() {
    errors.throwNotImplemented("getting a single document");
  }

  //---------------------------------------------------------------------------
  // remove()
  //
  // Removes all of the documents matching the criteria.
  //---------------------------------------------------------------------------
  remove() {
    errors.throwNotImplemented("removing documents from a collection");
  }

  //---------------------------------------------------------------------------
  // replaceOne()
  //
  // Replaces a single document matching the criteria.
  //---------------------------------------------------------------------------
  replaceOne() {
    errors.throwNotImplemented("replacing a single document");
  }

  //---------------------------------------------------------------------------
  // replaceOneAndGet()
  //
  // Replaces a single document matching the criteria and returns a document
  // containing metadata.
  //---------------------------------------------------------------------------
  replaceOneAndGet() {
    errors.throwNotImplemented("replacing/returning a single document");
  }

}

module.exports = SodaOperationImpl;
