// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

'use strict'
const { isObject } = require('./util')

/**
 * @fileoverview Defines some common methods used for WebElements.
 */

const LEGACY_ELEMENT_ID_KEY = 'ELEMENT'
const ELEMENT_ID_KEY = 'element-6066-11e4-a52e-4f735466cecf'

/**
 * Contains logic about WebElements.
 */
/**
 * @param {?} obj the object to test.
 * @return {boolean} whether the object is a valid encoded WebElement ID.
 */
function isId(obj) {
  return isObject(obj) && (typeof obj[ELEMENT_ID_KEY] === 'string' || typeof obj[LEGACY_ELEMENT_ID_KEY] === 'string')
}

/**
 * Extracts the encoded WebElement ID from the object.
 *
 * @param {?} obj The object to extract the ID from.
 * @return {string} the extracted ID.
 * @throws {TypeError} if the object is not a valid encoded ID.
 */
function extractId(obj) {
  if (isObject(obj)) {
    if (typeof obj[ELEMENT_ID_KEY] === 'string') {
      return obj[ELEMENT_ID_KEY]
    } else if (typeof obj[LEGACY_ELEMENT_ID_KEY] === 'string') {
      return obj[LEGACY_ELEMENT_ID_KEY]
    }
  }
  throw new TypeError('object is not a WebElement ID')
}

// PUBLIC API

module.exports = {
  isId,
  extractId,
}
