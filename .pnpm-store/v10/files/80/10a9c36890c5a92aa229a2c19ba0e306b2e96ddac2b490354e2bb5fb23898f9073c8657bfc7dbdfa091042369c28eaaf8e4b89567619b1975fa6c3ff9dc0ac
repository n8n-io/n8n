// Copyright (c) 2018, 2024, Oracle and/or its affiliates.

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

const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const SodaDocument = require('./sodaDocument.js');

class SodaDocCursor {

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the cursor and make it unusable for further operations.
  //--------------------------------------------------------------------------
  async close() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl, errors.ERR_INVALID_SODA_DOC_CURSOR);
    await this._impl.close();
    delete this._impl;
  }

  //---------------------------------------------------------------------------
  // getNext()
  //
  // Return the next document available from the cursor.
  //---------------------------------------------------------------------------
  async getNext() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl, errors.ERR_INVALID_SODA_DOC_CURSOR);
    const docImpl = await this._impl.getNext();
    if (docImpl) {
      const doc = new SodaDocument();
      doc._impl = docImpl;
      return doc;
    }
  }

  [Symbol.asyncIterator]() {
    const cursor = this;
    return {
      async next() {
        const doc = await cursor.getNext();
        return {value: doc, done: doc === undefined};
      },
      return() {
        return {done: true};
      }
    };
  }

}

nodbUtil.wrapFns(SodaDocCursor.prototype,
  "close",
  "getNext");

module.exports = SodaDocCursor;
