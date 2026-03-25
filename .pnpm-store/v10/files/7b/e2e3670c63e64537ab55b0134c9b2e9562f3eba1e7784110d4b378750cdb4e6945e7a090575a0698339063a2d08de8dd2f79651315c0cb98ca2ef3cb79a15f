// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

//----------------------------------------------------------------------------
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

// define base database object class; instances of this class are never
// instantiated; instead, classes subclassed from this one will be
// instantiated; a cache of these classes are maintained on each connection
class DbObjectImpl {

  constructor(objType) {
    this._objType = objType;
  }

  //---------------------------------------------------------------------------
  // append()
  //
  // Appends an element to the collection.
  //---------------------------------------------------------------------------
  append() {
    errors.throwNotImplemented("appending element to collection");
  }

  //---------------------------------------------------------------------------
  // copy()
  //
  // Creates and returns a copy of the object.
  //---------------------------------------------------------------------------
  copy() {
    errors.throwNotImplemented("copying an object");
  }

  //---------------------------------------------------------------------------
  // deleteElement()
  //
  // Deletes an element from a collection.
  //---------------------------------------------------------------------------
  deleteElement() {
    errors.throwNotImplemented("deleting an element from a collection");
  }

  //---------------------------------------------------------------------------
  // getElement()
  //
  // Returns an element from the collection.
  //---------------------------------------------------------------------------
  getElement() {
    errors.throwNotImplemented("getting an element from a collection");
  }

  //---------------------------------------------------------------------------
  // getFirstIndex()
  //
  // Returns the first index in a collection.
  //---------------------------------------------------------------------------
  getFirstIndex() {
    errors.throwNotImplemented("getting the first index in a collection");
  }

  //---------------------------------------------------------------------------
  // getKeys()
  //
  // Returns the keys of the collection in a JavaScript array.
  //---------------------------------------------------------------------------
  getKeys() {
    errors.throwNotImplemented("returning the keys of a collection");
  }

  //---------------------------------------------------------------------------
  // getLastIndex()
  //
  // Returns the last index in a collection.
  //---------------------------------------------------------------------------
  getLastIndex() {
    errors.throwNotImplemented("getting the last index in a collection");
  }

  //---------------------------------------------------------------------------
  // getNextIndex()
  //
  // Returns the next index in a collection.
  //---------------------------------------------------------------------------
  getNextIndex() {
    errors.throwNotImplemented("getting the next index in a collection");
  }

  //---------------------------------------------------------------------------
  // getPrevIndex()
  //
  // Returns the previous index in a collection.
  //---------------------------------------------------------------------------
  getPrevIndex() {
    errors.throwNotImplemented("getting the previous index in a collection");
  }

  //---------------------------------------------------------------------------
  // getValues()
  //
  // Returns the values of the collection in a JavaScript array.
  //---------------------------------------------------------------------------
  getValues() {
    errors.throwNotImplemented("getting the values in a collection");
  }

  //---------------------------------------------------------------------------
  // hasElement()
  //
  // Returns whether an element exists at the given index.
  //---------------------------------------------------------------------------
  hasElement() {
    errors.throwNotImplemented("getting if value exists in a collection");
  }

  //---------------------------------------------------------------------------
  // setElement()
  //
  // Sets the element at the given index in the collection.
  //---------------------------------------------------------------------------
  setElement() {
    errors.throwNotImplemented("setting an element in a collection");
  }

  //---------------------------------------------------------------------------
  // trim()
  //
  // Trim the specified number of elements from the end of the collection.
  //---------------------------------------------------------------------------
  trim() {
    errors.throwNotImplemented("trimming elements from a collection");
  }

}

module.exports = DbObjectImpl;
