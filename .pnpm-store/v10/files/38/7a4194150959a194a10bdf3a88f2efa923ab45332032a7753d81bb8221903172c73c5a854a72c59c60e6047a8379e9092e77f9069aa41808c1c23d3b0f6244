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

const SodaDocCursor = require('./sodaDocCursor.js');
const SodaDocument = require('./sodaDocument.js');
const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const settings = require('./settings.js');

class SodaOperation {

  constructor() {
    this._options = {
      autoCommit: settings.autoCommit,
      fetchArraySize: settings.fetchArraySize
    };
  }

  //---------------------------------------------------------------------------
  // count()
  //
  // Return a count of the number of documents that match the search criteria.
  //---------------------------------------------------------------------------
  async count() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._impl.count(this._options);
  }

  //---------------------------------------------------------------------------
  // getCursor()
  //
  // Return a cursor which will return the documents that match the search
  // criteria.
  //---------------------------------------------------------------------------
  async getCursor() {
    errors.assertArgCount(arguments, 0, 0);
    const cursor = new SodaDocCursor();
    cursor._impl = await this._impl.getCursor(this._options);
    return cursor;
  }

  //---------------------------------------------------------------------------
  // getDocuments()
  //   Return an array of documents that match the search criteria.
  //---------------------------------------------------------------------------
  async getDocuments() {
    errors.assertArgCount(arguments, 0, 0);
    const docImpls = await this._impl.getDocuments(this._options);
    const returnVal = new Array(docImpls.length);
    for (let i = 0; i < docImpls.length; i++) {
      returnVal[i] = new SodaDocument();
      returnVal[i]._impl = docImpls[i];
    }
    return returnVal;
  }

  //---------------------------------------------------------------------------
  // getOne()
  //
  // Return the first document that matches the search criteria.
  //---------------------------------------------------------------------------
  async getOne() {
    errors.assertArgCount(arguments, 0, 0);
    const docImpl = await this._impl.getOne(this._options);
    if (docImpl) {
      const doc = new SodaDocument;
      doc._impl = docImpl;
      return doc;
    }
  }


  //---------------------------------------------------------------------------
  // lock()
  //
  //  Pessimistic locking - similar to SELECT FOR UPDATE, these documents
  //  cannot be updated by other threads until an explicit commit/rollback is
  //  called.  With autoCommit set to true is applicable only for one immediate
  //  operation and is not recommended in this context
  //---------------------------------------------------------------------------
  lock()  {
    errors.assertArgCount(arguments, 0, 0);
    this._options.lock = true;
    return this;
  }


  //---------------------------------------------------------------------------
  // replaceOne()
  //
  // Replace the first document that matches the search criteria with the
  // specified document.
  //---------------------------------------------------------------------------
  async replaceOne(content) {
    errors.assertArgCount(arguments, 1, 1);
    content = nodbUtil.verifySodaDoc(content);
    return await this._impl.replaceOne(this._options, content);
  }

  //---------------------------------------------------------------------------
  // replaceOneAndGet()
  //
  // Replace the first document that matches the search criteria with the
  // specified document and then return a result document containing metadata.
  //---------------------------------------------------------------------------
  async replaceOneAndGet(content) {
    errors.assertArgCount(arguments, 1, 1);
    content = nodbUtil.verifySodaDoc(content);
    const docImpl = await this._impl.replaceOneAndGet(this._options, content);
    if (docImpl) {
      const doc = new SodaDocument();
      doc._impl = docImpl;
      return doc;
    }
  }

  //---------------------------------------------------------------------------
  // remove()
  //
  // Remove the documents that match the search criteria from the collection
  // and return information about the operation to the caller.
  //---------------------------------------------------------------------------
  async remove() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._impl.remove(this._options);
  }

  // fetchArraySize - a non-terminal function that can chain further
  fetchArraySize(n) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(n) && n >= 0, 1);
    this._options.fetchArraySize = n;
    return this;
  }

  // filter property - a non-terminal function and can chain further
  filter(f) {
    errors.assertArgCount (arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(f), 1);
    this._options.filter = JSON.stringify(f);
    return this;
  }

  // hint - a non-terminal function and can chain further
  hint(val) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof val === 'string', 1);
    this._options.hint = val;
    return this;
  }

  // key - a non-terminal function and can chain further
  key(k) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof k === 'string', 1);
    this._options.key = k;
    this._options.keys = undefined;
    return this;
  }

  // keys - a non-terminal function and can chain further
  keys(arr) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Array.isArray(arr), 1);

    for (let i = 0; i < arr.length; i++) {
      errors.assertParamValue(typeof arr[i] === 'string', 1);
    }

    this._options.keys = arr;
    this._options.key = undefined;
    return this;
  }

  // limit property - a non-terminal function and can chain further
  limit(n) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof n === 'number', 1);
    this._options.limit = n;
    return this;
  }

  // skip property - a non-terminal function and can chain further
  skip(n) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof n === 'number', 1);
    this._options.skip = n;
    return this;
  }

  // version property - a non-terminal function and can chain further
  version(v) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof v === 'string', 1);
    this._options.version = v;
    return this;
  }

}

nodbUtil.wrapFns(SodaOperation.prototype,
  "count",
  "getCursor",
  "getDocuments",
  "getOne",
  "remove",
  "replaceOne",
  "replaceOneAndGet");

module.exports = SodaOperation;
