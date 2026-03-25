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

const { BytesValue } = require('./networkTypes')

/**
 * Represents a partial cookie used to set cookies.
 * Described in https://w3c.github.io/webdriver-bidi/#command-storage-setCookie.
 * @class
 */
class PartialCookie {
  #map = new Map()

  /**
   * Represents a partial cookie.
   * @class
   * @param {string} name - The name of the cookie.
   * @param {BytesValue} value - The value of the cookie as an instance of BytesValue.
   * @param {string} domain - The domain of the cookie.
   */
  constructor(name, value, domain) {
    this.#map.set('name', name)
    if (!(value instanceof BytesValue)) {
      throw new Error(`Value must be an instance of BytesValue. Received:'${value}'`)
    }
    this.#map.set('value', Object.fromEntries(value.asMap()))
    this.#map.set('domain', domain)
  }

  /**
   * Sets the path for the cookie.
   *
   * @param {string} path - The path for the cookie.
   * @returns {PartialCookie} - The updated PartialCookie instance for chaining.
   */
  path(path) {
    this.#map.set('path', path)
    return this
  }

  /**
   * Sets the size of the cookie.
   *
   * @param {number} size - The size of the cookie.
   * @returns {PartialCookie} - The updated PartialCookie instance for chaining.
   */
  size(size) {
    this.#map.set('size', size)
    return this
  }

  /**
   * Sets the `httpOnly` flag for the cookie.
   *
   * @param {boolean} httpOnly - The value to set for the `httpOnly` flag.
   * @returns {PartialCookie} - The updated PartialCookie instance for chaining.
   */
  httpOnly(httpOnly) {
    this.#map.set('httpOnly', httpOnly)
    return this
  }

  /**
   * Sets the secure flag for the cookie.
   *
   * @param {boolean} secure - Indicates whether the cookie should only be sent over secure connections.
   * @returns {PartialCookie} - The updated PartialCookie instance for chaining.
   */
  secure(secure) {
    this.#map.set('secure', secure)
    return this
  }

  /**
   * Sets the SameSite attribute for the cookie.
   *
   * @param {SameSite} sameSite - The SameSite attribute value for the cookie.
   * @returns {PartialCookie} - The updated PartialCookie instance for chaining.
   */
  sameSite(sameSite) {
    this.#map.set('sameSite', sameSite)
    return this
  }

  /**
   * Sets the expiry for the cookie.
   *
   * @param {number} expiry - The expiry time of the cookie.
   * @returns {PartialCookie} - The updated PartialCookie instance for chaining.
   */
  expiry(expiry) {
    this.#map.set('expiry', expiry)
    return this
  }

  asMap() {
    return this.#map
  }
}

module.exports = { PartialCookie }
