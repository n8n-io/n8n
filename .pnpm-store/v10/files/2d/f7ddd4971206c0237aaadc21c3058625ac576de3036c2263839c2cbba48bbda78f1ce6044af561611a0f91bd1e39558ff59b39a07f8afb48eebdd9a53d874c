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

class SodaCollectionImpl extends BaseImpl {

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this._database._connection;
  }

  //---------------------------------------------------------------------------
  // createIndex()
  //
  // Creates an index on a SODA collection.
  //---------------------------------------------------------------------------
  createIndex() {
    errors.throwNotImplemented("creating an index on a SODA collection");
  }

  //---------------------------------------------------------------------------
  // drop()
  //
  // Drops a SODA collection.
  //---------------------------------------------------------------------------
  drop() {
    errors.throwNotImplemented("dropping a SODA collection");
  }

  //---------------------------------------------------------------------------
  // dropIndex()
  //
  // Drops a SODA collection.
  //---------------------------------------------------------------------------
  dropIndex() {
    errors.throwNotImplemented("dropping an index on a SODA collection");
  }

  //---------------------------------------------------------------------------
  // find()
  //
  // Returns a SODA operation object associated with the collection.
  //---------------------------------------------------------------------------
  find() {
    errors.throwNotImplemented("creating a SODA operation");
  }

  //---------------------------------------------------------------------------
  // getDataGuide()
  //
  // Returns a SODA operation object associated with the collection.
  //---------------------------------------------------------------------------
  getDataGuide() {
    errors.throwNotImplemented("getting the data guide for the collection");
  }

  //---------------------------------------------------------------------------
  // getMetaData()
  //
  // Returns the metadata for the collection.
  //---------------------------------------------------------------------------
  getMetaData() {
    errors.throwNotImplemented("getting the metadata for the collection");
  }

  //---------------------------------------------------------------------------
  // getName()
  //
  // Returns the name of the collection.
  //---------------------------------------------------------------------------
  getName() {
    errors.throwNotImplemented("getting the name of the collection");
  }

  //---------------------------------------------------------------------------
  // insertMany()
  //
  // Inserts multiple documents into the collection at the same time.
  //---------------------------------------------------------------------------
  insertMany() {
    errors.throwNotImplemented("inserting multiple docs into a collection");
  }

  //---------------------------------------------------------------------------
  // insertManyAndGet()
  //
  // Inserts multiple documents into the collection at the same time and
  // returns an array of documents containing metadata.
  //---------------------------------------------------------------------------
  insertManyAndGet() {
    errors.throwNotImplemented("insert/return many docs in a collection");
  }

  //---------------------------------------------------------------------------
  // insertOne()
  //
  // Inserts a single document into the collection.
  //---------------------------------------------------------------------------
  insertOne() {
    errors.throwNotImplemented("inserting a single doc into a collection");
  }

  //---------------------------------------------------------------------------
  // insertOneAndGet()
  //
  // Inserts a single document into the collection and returns a document
  // containing metadata.
  //---------------------------------------------------------------------------
  insertOneAndGet() {
    errors.throwNotImplemented("insert/return a single doc in a collection");
  }

  //---------------------------------------------------------------------------
  // save()
  //
  // Saves a single document into the collection.
  //---------------------------------------------------------------------------
  save() {
    errors.throwNotImplemented("saving a single doc in a collection");
  }

  //---------------------------------------------------------------------------
  // saveAndGet()
  //
  // Saves a single document into the collection and returns a document
  // containing metadata.
  //---------------------------------------------------------------------------
  saveAndGet() {
    errors.throwNotImplemented("saving a single doc in a collection");
  }

  //---------------------------------------------------------------------------
  // truncate()
  //
  // Removes all of the documents from a collection.
  //---------------------------------------------------------------------------
  truncate() {
    errors.throwNotImplemented("removing all docs from a collection");
  }

}

module.exports = SodaCollectionImpl;
