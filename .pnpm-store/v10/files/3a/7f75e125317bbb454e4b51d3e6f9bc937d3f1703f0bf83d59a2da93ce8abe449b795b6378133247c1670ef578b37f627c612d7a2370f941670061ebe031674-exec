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

const { BytesValue, Header } = require('./networkTypes')

/**
 * Represents the parameters for a continue request command.
 * Described in https://w3c.github.io/webdriver-bidi/#command-network-continueRequest.
 */
class ContinueRequestParameters {
  #map = new Map()

  constructor(request) {
    this.#map.set('request', request)
  }

  /**
   * Sets the body value for the request.
   *
   * @param {BytesValue} value - The value to set as the body. Must be an instance of BytesValue.
   * @returns {ContinueRequestParameters} - The current instance of the ContinueRequestParameters for chaining.
   * @throws {Error} - If the value is not an instance of BytesValue.
   */
  body(value) {
    if (!(value instanceof BytesValue)) {
      throw new Error(`Value must be an instance of BytesValue. Received: '${value})'`)
    }
    this.#map.set('body', Object.fromEntries(value.asMap()))
    return this
  }

  /**
   * Sets the cookies for the request.
   *
   * @param {Header[]} cookieHeaders - An array of cookie headers.
   * @returns {ContinueRequestParameters} - The current instance of the ContinueRequestParameters for chaining.
   * @throws {Error} - If a cookie header is not an instance of Header.
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
   * Sets the headers for the request.
   *
   * @param {Header[]} headers - An array of Header objects.
   * @returns {ContinueRequestParameters} - The current instance of the ContinueRequestParameters for chaining.
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
   * Sets the HTTP method for the request.
   *
   * @param {string} method - The HTTP method to be set.
   * @returns {ContinueRequestParameters} - The updated `continueRequestParameters` object.
   * @throws {Error} - If the method parameter is not a string.
   */
  method(method) {
    if (typeof method !== 'string') {
      throw new Error(`Http method must be a string. Received: '${method})'`)
    }
    this.#map.set('method', method)
    return this
  }

  /**
   * Sets the URL for the request.
   *
   * @param {string} url - The URL to set for the request.
   * @returns {ContinueRequestParameters} - The current instance of the ContinueRequestParameters for chaining.
   * @throws {Error} - If the url parameter is not a string.
   */
  url(url) {
    if (typeof url !== 'string') {
      throw new Error(`Url must be a string. Received:'${url}'`)
    }

    this.#map.set('url', url)
    return this
  }

  asMap() {
    return this.#map
  }
}

module.exports = { ContinueRequestParameters }
