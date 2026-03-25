// Copyright (c) 2018, 2023, Oracle and/or its affiliates.

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

const SodaDocument = require('./sodaDocument.js');
const SodaOperation = require('./sodaOperation.js');
const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const settings = require('./settings.js');

class SodaCollection {

  //---------------------------------------------------------------------------
  // createIndex()
  //
  // Create an index on the collection.
  //---------------------------------------------------------------------------
  async createIndex(spec) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(spec), 1);
    const options = {autoCommit: settings.autoCommit};
    return await this._impl.createIndex(JSON.stringify(spec), options);
  }

  //---------------------------------------------------------------------------
  // drop()
  //
  // Drop the collection.
  //---------------------------------------------------------------------------
  async drop() {
    errors.assertArgCount(arguments, 0, 0);
    const options = {autoCommit: settings.autoCommit};
    return await this._impl.drop(options);
  }

  //---------------------------------------------------------------------------
  // dropIndex()
  //
  // Drop an index on the collection.
  //---------------------------------------------------------------------------
  async dropIndex(indexName, a2) {
    const options = {autoCommit: settings.autoCommit};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(typeof indexName === 'string', 1);
    if (arguments.length == 2) {
      errors.assertParamValue(typeof a2 === 'object', 2);
      if (a2.force !== undefined) {
        errors.assertParamPropValue(typeof a2.force === 'boolean', 2, "force");
        options.force = a2.force;
      }
    }
    return await this._impl.dropIndex(indexName, options);
  }

  //---------------------------------------------------------------------------
  // find()
  //
  // Returns a SODA operation associated with the collection.
  //---------------------------------------------------------------------------
  find() {
    errors.assertArgCount(arguments, 0, 0);
    const op = new SodaOperation();
    op._impl = this._impl.find();
    return op;
  }

  //---------------------------------------------------------------------------
  // getDataGuide()
  //   Return the data guide for the collection.
  //---------------------------------------------------------------------------
  async getDataGuide() {
    errors.assertArgCount(arguments, 0, 0);
    const doc = new SodaDocument();
    doc._impl = await this._impl.getDataGuide();
    return doc;
  }

  //---------------------------------------------------------------------------
  // insertMany()
  //
  // Insert an array of documents into the collection in a single round-trip.
  //---------------------------------------------------------------------------
  async insertMany(docs) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Array.isArray(docs) && docs.length > 0, 1);

    const actualDocs = Array(docs.length);
    for (let i = 0; i < docs.length; i++) {
      actualDocs[i] = nodbUtil.verifySodaDoc(docs[i]);
    }

    const options = {autoCommit: settings.autoCommit};
    await this._impl.insertMany(actualDocs, options);
  }

  //---------------------------------------------------------------------------
  // insertManyAndGet()
  //
  // Insert an array of documents into the collection in a single round-trip
  // and return a set of result documents containing metadata.
  //---------------------------------------------------------------------------
  async insertManyAndGet(docs, a2) {
    const options = {autoCommit: settings.autoCommit};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(Array.isArray(docs) && docs.length > 0, 1);

    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      if (a2.hint !== undefined) {
        errors.assertParamPropValue(typeof a2.hint === 'string', 2, "hint");
        options.hint = a2.hint;
      }
    }

    const actualDocs = Array(docs.length);
    for (let i = 0; i < docs.length; i++) {
      actualDocs[i] = nodbUtil.verifySodaDoc(docs[i]);
    }

    const docImpls = await this._impl.insertManyAndGet(actualDocs, options);
    for (let i = 0; i < docs.length; i++) {
      const doc = actualDocs[i] = new SodaDocument();
      doc._impl = docImpls[i];
    }

    return actualDocs;
  }

  //---------------------------------------------------------------------------
  // insertOne()
  //
  // Inserts a single document into the collection.
  //---------------------------------------------------------------------------
  async insertOne(content) {
    errors.assertArgCount(arguments, 1, 1);
    content = nodbUtil.verifySodaDoc(content);
    const options = {autoCommit: settings.autoCommit};
    await this._impl.insertOne(content, options);
  }

  //---------------------------------------------------------------------------
  // insertOneAndGet()
  //
  // Inserts a single document into the collection and returns a result
  // document containing metadata.
  //---------------------------------------------------------------------------
  async insertOneAndGet(content, a2) {
    const options = {autoCommit: settings.autoCommit};

    errors.assertArgCount(arguments, 1, 2);
    content = nodbUtil.verifySodaDoc(content);
    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      if (a2.hint !== undefined) {
        errors.assertParamPropValue(typeof a2.hint === 'string', 2, "hint");
        options.hint = a2.hint;
      }
    }

    const doc = new SodaDocument();
    doc._impl = await this._impl.insertOneAndGet(content, options);
    return doc;
  }

  //---------------------------------------------------------------------------
  // listIndexes()
  //
  //   To obtain all indices from the collection
  //---------------------------------------------------------------------------
  async listIndexes() {
    const arr = await this._impl.listIndexes();
    return arr.map(i => JSON.parse(i));
  }

  //---------------------------------------------------------------------------
  // metaData()
  //
  // Property for the metadata associated with the collection.
  //---------------------------------------------------------------------------
  get metaData() {
    return JSON.parse(this._impl.getMetaData());
  }

  //---------------------------------------------------------------------------
  // name()
  //
  // Property for the name of the collection.
  //---------------------------------------------------------------------------
  get name() {
    return this._impl.getName();
  }

  //---------------------------------------------------------------------------
  // save()
  //
  // Saves a single document into the collection.
  //---------------------------------------------------------------------------
  async save(content) {
    errors.assertArgCount(arguments, 1, 1);
    content = nodbUtil.verifySodaDoc(content);
    const options = {autoCommit: settings.autoCommit};
    await this._impl.save(content, options);
  }

  //---------------------------------------------------------------------------
  // saveAndGet()
  //
  // Saves a single document into the collection and returns a result document
  // containing metadata.
  //---------------------------------------------------------------------------
  async saveAndGet(content, a2) {
    errors.assertArgCount(arguments, 1, 2);
    content = nodbUtil.verifySodaDoc(content);
    const options = {autoCommit: settings.autoCommit};
    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      if (a2.hint !== undefined) {
        errors.assertParamPropValue(typeof a2.hint === 'string', 2, "hint");
        options.hint = a2.hint;
      }
    }

    const doc = new SodaDocument();
    doc._impl = await this._impl.saveAndGet(content, options);
    return doc;
  }

  //---------------------------------------------------------------------------
  // truncate()
  //
  // Remove all of the documents from a collection.
  //---------------------------------------------------------------------------
  async truncate() {
    errors.assertArgCount(arguments, 0, 0);
    await this._impl.truncate();
  }

}

nodbUtil.wrapFns(SodaCollection.prototype,
  "createIndex",
  "drop",
  "dropIndex",
  "getDataGuide",
  "insertMany",
  "insertManyAndGet",
  "insertOne",
  "insertOneAndGet",
  "listIndexes",
  "save",
  "saveAndGet",
  "truncate");

module.exports = SodaCollection;
