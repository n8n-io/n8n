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
 * Represents a partition key of cookie storage.
 * Described in https://w3c.github.io/webdriver-bidi/#type-storage-PartitionKey.
 */
class PartitionKey {
  #userContext
  #sourceOrigin

  /**
   * Constructs a new PartitionKey object.
   * @param {string} userContext - The user context.
   * @param {string} sourceOrigin - The source origin.
   */
  constructor(userContext, sourceOrigin) {
    this.#userContext = userContext
    this.#sourceOrigin = sourceOrigin
  }

  /**
   * Gets the user context.
   * @returns {string} The user context.
   */
  get userContext() {
    return this.#userContext
  }

  /**
   * Gets the source origin.
   * @returns {string} The source origin.
   */
  get sourceOrigin() {
    return this.#sourceOrigin
  }
}

module.exports = { PartitionKey }
