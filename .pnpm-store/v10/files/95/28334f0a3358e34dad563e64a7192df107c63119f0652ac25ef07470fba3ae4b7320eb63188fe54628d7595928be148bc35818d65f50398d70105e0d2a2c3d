// Copyright (c) 2023, Oracle and/or its affiliates.

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

// future object used for managing backwards incompatible changes.
class Future {

  constructor() {
    this._featureFlags = {};
    this._featureFlags.oldJsonColumnAsObj = false;
  }

  get oldJsonColumnAsObj() {
    return this._featureFlags.oldJsonColumnAsObj;
  }

  // fetch VARCHAR2 and LOB columns that contain JSON data (and have
  // the "IS JSON" constraint enabled) in the same way that columns
  // of type JSON (which requires Oracle Database 21 and higher) are fetched.
  set oldJsonColumnAsObj(value) {
    errors.assertPropValue(typeof value === 'boolean', "oldJsonColumnAsObj");
    this._featureFlags.oldJsonColumnAsObj = value;
  }

}

module.exports = new Future;
