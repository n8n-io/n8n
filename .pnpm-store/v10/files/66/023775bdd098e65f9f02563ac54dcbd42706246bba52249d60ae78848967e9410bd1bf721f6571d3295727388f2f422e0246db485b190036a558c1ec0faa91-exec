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
 * Represents a set of parameters for creating a context.
 * Described in https://w3c.github.io/webdriver-bidi/#command-browsingContext-create.
 */
class CreateContextParameters {
  #map = new Map()

  /**
   * Sets the reference context.
   * @param {string} id - The ID of the reference context.
   * @returns {CreateContextParameters} - The updated instance of CreateContextParameters for chaining.
   * @throws {Error} - If the provided ID is not a string.
   */
  referenceContext(id) {
    if (typeof id !== 'string') {
      throw new Error(`ReferenceContext must be string. Received:'${id}'`)
    }
    this.#map.set('referenceContext', id)
    return this
  }

  /**
   * Sets the background parameter.
   *
   * @param {boolean} background - The background value to set.
   * @returns {CreateContextParameters} - The updated instance of CreateContextParameters for chaining.
   * @throws {Error} - If the background parameter is not a boolean.
   */
  background(background) {
    if (typeof background !== 'boolean') {
      throw new Error(`Background must be boolean. Received:'${background}'`)
    }
    this.#map.set('background', background)
    return this
  }

  /**
   * Sets the user context.
   * @param {string} userContext - The user context to set.
   * @returns {CreateContextParameters} - The updated instance of CreateContextParameters for chaining.
   * @throws {Error} - If the userContext parameter is not a string.
   */
  userContext(userContext) {
    if (typeof userContext !== 'string') {
      throw new Error(`UserContext must be string. Received:'${userContext}'`)
    }
    this.#map.set('userContext', userContext)
    return this
  }

  asMap() {
    return this.#map
  }
}

module.exports = { CreateContextParameters }
