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

/**
 * Determines whether a {@code value} should be treated as an object.
 * @param {?} value The value to test.
 * @returns {boolean} Whether the value is an object.
 */
function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

/**
 * Determines whether a {@code value} should be treated as a promise.
 * Any object whose "then" property is a function will be considered a promise.
 *
 * @param {?} value The value to test.
 * @return {boolean} Whether the value is a promise.
 */
function isPromise(value) {
  try {
    // Use array notation so the Closure compiler does not obfuscate away our
    // contract.
    return (typeof value === 'object' || typeof value === 'function') && typeof value['then'] === 'function'
    /*eslint no-unused-vars: "off"*/
  } catch (ex) {
    return false
  }
}

module.exports = {
  isObject,
  isPromise,
}
