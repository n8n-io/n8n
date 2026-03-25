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
 * Represents a clip rectangle.
 * Described in https://w3c.github.io/webdriver-bidi/#command-browsingContext-captureScreenshot.
 */
class ClipRectangle {
  clipType

  /**
   * Constructs a new ClipRectangle object.
   * @param {string} type - The type of the clip rectangle.
   */
  constructor(type) {
    this.clipType = type
  }

  /**
   * Gets the type of the clip rectangle.
   * @returns {string} The type of the clip rectangle.
   */
  get type() {
    return this.clipType
  }

  asMap() {}
}

/**
 * Represents a clip rectangle for an element.
 * @extends ClipRectangle
 */
class ElementClipRectangle extends ClipRectangle {
  #sharedId
  #handleId

  /**
   * Constructs a new ElementClipRectangle instance.
   * @param {string} sharedId - The shared ID of the element.
   * @param {string} [handleId] - The handle ID of the element (optional).
   */
  constructor(sharedId, handleId = undefined) {
    super('element')
    this.#sharedId = sharedId

    if (handleId !== undefined) {
      this.#handleId = handleId
    }
  }

  /**
   * Converts the ElementClipRectangle instance to a map.
   * @returns {Map} - The converted map.
   */
  asMap() {
    const map = new Map()
    map.set('type', super.type)

    const sharedReference = new Map()
    sharedReference.set('sharedId', this.#sharedId)
    if (this.#handleId !== undefined) {
      sharedReference.set('handleId', this.#handleId)
    }

    map.set('element', Object.fromEntries(sharedReference))

    return map
  }
}

/**
 * Represents a box-shaped clip rectangle.
 * @extends ClipRectangle
 */
class BoxClipRectangle extends ClipRectangle {
  #x
  #y
  #width
  #height

  /**
   * Constructs a new BoxClipRectangle object.
   * @param {number} x - The x-coordinate of the top-left corner of the rectangle.
   * @param {number} y - The y-coordinate of the top-left corner of the rectangle.
   * @param {number} width - The width of the rectangle.
   * @param {number} height - The height of the rectangle.
   */
  constructor(x, y, width, height) {
    super('box')
    this.#x = x
    this.#y = y
    this.#width = width
    this.#height = height
  }

  /**
   * Converts the BoxClipRectangle object to a Map.
   * @returns {Map<string, any>} - The Map representation of the BoxClipRectangle object.
   */
  asMap() {
    const map = new Map()
    map.set('type', super.type)
    map.set('x', this.#x)
    map.set('y', this.#y)
    map.set('width', this.#width)
    map.set('height', this.#height)

    return map
  }
}

module.exports = { BoxClipRectangle, ElementClipRectangle }
