// Copyright (c) 2018, 2022, Oracle and/or its affiliates.

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

class SodaDocument {

  //---------------------------------------------------------------------------
  // createdOn
  //
  // Property for the created date of the document.
  //---------------------------------------------------------------------------
  get createdOn() {
    return this._impl.getCreatedOn();
  }

  //---------------------------------------------------------------------------
  // getContent()
  //
  // Returns the document content as a Javascript object.
  //---------------------------------------------------------------------------
  getContent() {
    return JSON.parse(this._impl.getContentAsString());
  }

  //---------------------------------------------------------------------------
  // getContentAsBuffer()
  //
  // Returns the document content as a buffer.
  //---------------------------------------------------------------------------
  getContentAsBuffer() {
    return this._impl.getContentAsBuffer();
  }

  //---------------------------------------------------------------------------
  // getContentAsString()
  //
  // Returns the document content as a string.
  //---------------------------------------------------------------------------
  getContentAsString() {
    return this._impl.getContentAsString();
  }

  //---------------------------------------------------------------------------
  // key
  //
  // Property for the key of the document.
  //---------------------------------------------------------------------------
  get key() {
    return this._impl.getKey();
  }

  //---------------------------------------------------------------------------
  // lastModified
  //
  // Property for the last modified date of the document.
  //---------------------------------------------------------------------------
  get lastModified() {
    return this._impl.getLastModified();
  }

  //---------------------------------------------------------------------------
  // mediaType
  //
  // Property for the media type of the document.
  //---------------------------------------------------------------------------
  get mediaType() {
    return this._impl.getMediaType();
  }

  //---------------------------------------------------------------------------
  // verison
  //
  // Property for the version of the document.
  //---------------------------------------------------------------------------
  get version() {
    return this._impl.getVersion();
  }

}

SodaDocument.prototype._sodaDocumentMarker = true;

module.exports = SodaDocument;
