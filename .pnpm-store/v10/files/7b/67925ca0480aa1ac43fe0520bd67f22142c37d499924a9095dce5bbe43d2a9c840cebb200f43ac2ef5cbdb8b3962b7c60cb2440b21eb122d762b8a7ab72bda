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

const { Buffer } = require('buffer');
const SodaCollection = require('./sodaCollection.js');
const SodaDocument = require('./sodaDocument.js');
const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const settings = require('./settings.js');

class SodaDatabase {

  _getConnection() {
    return this._connection;
  }

  //---------------------------------------------------------------------------
  // createCollection()
  //
  // Creates a SODA collection.
  //---------------------------------------------------------------------------
  async createCollection(name, a2) {
    const options = {autoCommit: settings.autoCommit};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(typeof name === 'string', 1);

    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      if (a2.mode !== undefined) {
        errors.assertParamPropValue(Number.isInteger(a2.mode) && a2.mode > 0,
          2, "mode");
        options.mode = a2.mode;
      }
      if (a2.metaData !== undefined) {
        errors.assertParamPropValue(nodbUtil.isObject(a2.metaData), 2,
          "metaData");
        options.metaData = JSON.stringify(a2.metaData);
      }
    }

    const coll = new SodaCollection();
    coll._impl = await this._impl.createCollection(name, options);
    return coll;
  }

  //---------------------------------------------------------------------------
  // createDocument()
  //
  // Creates a SODA document.
  //---------------------------------------------------------------------------
  createDocument(content, a2) {
    let options = {};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(Buffer.isBuffer(content) ||
        typeof content === 'string' || nodbUtil.isObject(content), 1);
    if (arguments.length > 1) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      options = a2;
      errors.assertParamPropString(options, 2, "key");
      errors.assertParamPropString(options, 2, "mediaType");
    }

    if (typeof content === 'string') {
      content = Buffer.from(content);
    } else if (nodbUtil.isObject(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    const doc = new SodaDocument();
    doc._impl = this._impl.createDocument(content, options);
    return doc;
  }

  //---------------------------------------------------------------------------
  // getCollectionNames()
  //
  // Return an array of the names of the collections in the database.
  //---------------------------------------------------------------------------
  async getCollectionNames(a1) {
    let options = {};

    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      errors.assertParamValue(nodbUtil.isObject(a1), 1);
      options = a1;
      if (options.startsWith !== undefined) {
        errors.assertParamPropValue(typeof options.startsWith === 'string', 1,
          "startsWith");
      }
      if (options.limit !== undefined) {
        errors.assertParamPropValue(Number.isInteger(options.limit), 1,
          "limit");
      }
    }
    return await this._impl.getCollectionNames(options);
  }

  //---------------------------------------------------------------------------
  // openCollection()
  //
  // Open an existing SODA collection and return it to the caller.
  //---------------------------------------------------------------------------
  async openCollection(name) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof name === 'string', 1);
    const options = {autoCommit: settings.autoCommit};
    const collImpl = await this._impl.openCollection(name, options);
    if (collImpl) {
      const coll = new SodaCollection();
      coll._impl = collImpl;
      return coll;
    }
  }

}

nodbUtil.wrapFns(SodaDatabase.prototype,
  "createCollection",
  "getCollectionNames",
  "openCollection");

module.exports = SodaDatabase;
