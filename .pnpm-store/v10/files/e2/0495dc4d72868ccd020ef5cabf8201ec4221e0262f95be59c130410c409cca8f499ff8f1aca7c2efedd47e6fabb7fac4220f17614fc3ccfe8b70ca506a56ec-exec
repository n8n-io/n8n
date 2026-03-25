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
 * Represents the types of partition descriptors.
 * @enum {string}
 * Described in https://w3c.github.io/webdriver-bidi/#command-storage-getCookies.
 */
const Type = {
  CONTEXT: 'context',
  STORAGE_KEY: 'storageKey',
}

/**
 * Represents a partition descriptor.
 * Described in https://w3c.github.io/webdriver-bidi/#command-storage-getCookies.
 */
class PartitionDescriptor {
  /*eslint no-unused-private-class-members: "off"*/
  #type

  /**
   * Constructs a new PartitionDescriptor instance.
   * @param {Type} type - The type of the partition.
   */
  constructor(type) {
    this.#type = type
  }
}

/**
 * Represents a partition descriptor for a browsing context.
 * @extends PartitionDescriptor
 */
class BrowsingContextPartitionDescriptor extends PartitionDescriptor {
  #context = null

  constructor(context) {
    super(Type.CONTEXT)
    this.#context = context
  }

  asMap() {
    const map = new Map()
    map.set('type', Type.CONTEXT)
    map.set('context', this.#context)
    return map
  }
}

/**
 * Represents a partition descriptor for storage key.
 * @extends PartitionDescriptor
 */
class StorageKeyPartitionDescriptor extends PartitionDescriptor {
  #map = new Map()

  constructor() {
    super(Type.STORAGE_KEY)
    this.#map.set('type', Type.STORAGE_KEY)
  }

  /**
   * Sets the user context for the partition descriptor.
   * @param {any} userContext - The user context to set.
   * @returns {PartitionDescriptor} - The updated partition descriptor instance for chaining.
   */
  userContext(userContext) {
    this.#map.set('userContext', userContext)
    return this
  }

  /**
   * Sets the source origin for the partition descriptor.
   *
   * @param {string} sourceOrigin - The source origin to set.
   * @returns {PartitionDescriptor} - The updated PartitionDescriptor instance for chaining.
   */
  sourceOrigin(sourceOrigin) {
    this.#map.set('sourceOrigin', sourceOrigin)
    return this
  }

  asMap() {
    return this.#map
  }
}

module.exports = { BrowsingContextPartitionDescriptor, StorageKeyPartitionDescriptor }
