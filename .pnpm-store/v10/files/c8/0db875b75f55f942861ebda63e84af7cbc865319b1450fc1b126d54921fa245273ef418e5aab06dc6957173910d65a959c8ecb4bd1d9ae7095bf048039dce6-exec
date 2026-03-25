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

/**
 * Represents a URL pattern to intercept.
 * Described in network.UrlPatternPattern https://w3c.github.io/webdriver-bidi/#type-network-UrlPattern
 */
class UrlPattern {
  #map = new Map()

  /**
   * Sets the protocol for the URL pattern.
   *
   * @param {string} protocol - The protocol to set.
   * @returns {UrlPattern} - Returns the updated instance of the URL pattern for chaining.
   */
  protocol(protocol) {
    this.#map.set('protocol', protocol)
    return this
  }

  /**
   * Sets the hostname for the URL pattern.
   *
   * @param {string} hostname - The hostname to set.
   * @returns {UrlPattern} - Returns the updated instance of the URL pattern for chaining.
   */
  hostname(hostname) {
    this.#map.set('hostname', hostname)
    return this
  }

  /**
   * Sets the port for the URL pattern.
   *
   * @param {number} port - The port number to set.
   * @returns {UrlPattern} - Returns the updated instance of the URL pattern for chaining.
   * @throws {Error} - Throws an error if the port is not a number.
   */
  port(port) {
    if (typeof port === 'number') {
      this.#map.set('port', port.toString())
    } else {
      throw new Error(`Port must be a number. Received:'${port}'`)
    }
    return this
  }

  /**
   * Sets the pathname for the URL pattern.
   *
   * @param {string} pathname - The pathname to set.
   * @returns {UrlPattern} - Returns the updated instance of the URL pattern for chaining.
   */
  pathname(pathname) {
    this.#map.set('pathname', pathname)
    return this
  }

  /**
   * Sets the search parameter in the URL pattern.
   *
   * @param {string} search - The search parameter to be set.
   * @returns {UrlPattern} - Returns the updated instance of the URL pattern for chaining.
   */
  search(search) {
    this.#map.set('search', search)
    return this
  }

  asMap() {
    this.#map.set('type', 'pattern')
    return this.#map
  }
}

module.exports = { UrlPattern }
