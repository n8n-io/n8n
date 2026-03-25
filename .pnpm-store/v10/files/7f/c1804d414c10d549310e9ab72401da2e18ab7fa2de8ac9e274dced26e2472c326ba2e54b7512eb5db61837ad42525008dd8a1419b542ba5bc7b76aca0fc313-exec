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

const { Capabilities } = require('./capabilities')

/**
 * Contains information about a single WebDriver session.
 */
class Session {
  /**
   * @param {string} id The session ID.
   * @param {!./capabilities.Capabilities} capabilities
   *     The session capabilities.
   */
  constructor(id, capabilities) {
    /** @private {string} */
    this.id_ = id

    /** @private {!Capabilities} */
    this.caps_ =
      capabilities instanceof Capabilities
        ? /** @type {!Capabilities} */ (capabilities)
        : new Capabilities(capabilities)
  }

  /**
   * @return {string} This session's ID.
   */
  getId() {
    return this.id_
  }

  /**
   * @return {!Capabilities} This session's capabilities.
   */
  getCapabilities() {
    return this.caps_
  }

  /**
   * Retrieves the value of a specific capability.
   * @param {string} key The capability to retrieve.
   * @return {*} The capability value.
   */
  getCapability(key) {
    return this.caps_.get(key)
  }

  /**
   * Returns the JSON representation of this object, which is just the string
   * session ID.
   * @return {string} The JSON representation of this Session.
   */
  toJSON() {
    return this.getId()
  }
}

// PUBLIC API

module.exports = { Session }
