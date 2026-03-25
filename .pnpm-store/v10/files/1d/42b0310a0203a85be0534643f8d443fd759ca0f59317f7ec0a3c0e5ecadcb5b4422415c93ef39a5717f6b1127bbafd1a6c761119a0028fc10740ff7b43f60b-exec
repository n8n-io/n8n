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

const { Header } = require('./networkTypes')

/**
 * Represents the parameters for a continue response.
 * Described in https://w3c.github.io/webdriver-bidi/#command-network-continueResponse.
 */
class ContinueResponseParameters {
  #map = new Map()

  constructor(request) {
    this.#map.set('request', request)
  }

  /**
   * Sets the cookies for the response.
   *
   * @param {Header[]} cookieHeaders - The array of cookie headers.
   * @returns {ContinueResponseParameters} - The current instance of the ContinueResponseParameters for chaining.
   * @throws {Error} - If the cookieHeader is not an instance of Header.
   */
  cookies(cookieHeaders) {
    const cookies = []
    cookieHeaders.forEach((header) => {
      if (!(header instanceof Header)) {
        throw new Error(`CookieHeader must be an instance of Header. Received:'${header}'`)
      }
      cookies.push(Object.fromEntries(header.asMap()))
    })

    this.#map.set('cookies', cookies)
    return this
  }

  /**
   * Sets the credentials for authentication.
   *
   * @param {string} username - The username for authentication.
   * @param {string} password - The password for authentication.
   * @returns {ContinueResponseParameters} The current instance of the ContinueResponseParameters for chaining.
   * @throws {Error} If username or password is not a string.
   */
  credentials(username, password) {
    if (typeof username !== 'string') {
      throw new Error(`Username must be a string. Received:'${username}'`)
    }

    if (typeof password !== 'string') {
      throw new Error(`Password must be a string. Received:'${password}'`)
    }

    this.#map.set('credentials', { type: 'password', username: username, password: password })

    return this
  }

  /**
   * Sets the headers for the response.
   *
   * @param {Header[]} headers - An array of Header objects representing the headers.
   * @returns {ContinueResponseParameters} - The current instance of the ContinueResponseParameters for chaining.
   * @throws {Error} - If the header value is not an instance of Header.
   */
  headers(headers) {
    const headerList = []
    headers.forEach((header) => {
      if (!(header instanceof Header)) {
        throw new Error(`Header value must be an instance of Header. Received:'${header}'`)
      }
      headerList.push(Object.fromEntries(header.asMap()))
    })

    this.#map.set('headers', headerList)
    return this
  }

  /**
   * Sets the reason phrase for the response.
   *
   * @param {string} reasonPhrase - The reason phrase for the response.
   * @returns {ContinueResponseParameters} - The current instance of the ContinueResponseParameters for chaining.
   * @throws {Error} - If the reason phrase is not a string.
   */
  reasonPhrase(reasonPhrase) {
    if (typeof reasonPhrase !== 'string') {
      throw new Error(`Reason phrase must be a string. Received: '${reasonPhrase})'`)
    }
    this.#map.set('reasonPhrase', reasonPhrase)
    return this
  }

  /**
   * Sets the status code for the response.
   *
   * @param {number} statusCode - The status code to set.
   * @returns {ContinueResponseParameters} - The current instance of the ContinueResponseParameters for chaining.
   * @throws {Error} - If the `statusCode` parameter is not an integer.
   */
  statusCode(statusCode) {
    if (!Number.isInteger(statusCode)) {
      throw new Error(`Status must be an integer. Received:'${statusCode}'`)
    }

    this.#map.set('statusCode', statusCode)
    return this
  }

  asMap() {
    return this.#map
  }
}

module.exports = { ContinueResponseParameters }
