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

const { BoxClipRectangle, ElementClipRectangle } = require('./clipRectangle')

/**
 * Defines the reference point from which to compute offsets for capturing screenshot.
 *
 * @enum {string}
 */
const Origin = {
  VIEWPORT: 'viewport',
  DOCUMENT: 'document',
}

/**
 * Represents the optional parameters for capturing a screenshot.
 * Described in https://w3c.github.io/webdriver-bidi/#command-browsingContext-captureScreenshot.
 */
class CaptureScreenshotParameters {
  #map = new Map()

  /**
   * Sets the origin for capturing the screenshot.
   *
   * @param {Origin} origin - The origin for capturing the screenshot. Must be one of `Origin.VIEWPORT` or `Origin.DOCUMENT`.
   * @returns {CaptureScreenshotParameters} - The current instance of the CaptureScreenshotParameters for chaining.
   * @throws {Error} - If the provided origin is not valid.
   */
  origin(origin) {
    if (origin !== Origin.VIEWPORT && origin !== Origin.DOCUMENT) {
      throw new Error(`Origin must be one of ${Object.values(Origin)}. Received:'${origin}'`)
    }
    this.#map.set('origin', origin)
    return this
  }

  /**
   * Sets the image format and quality for capturing a screenshot.
   *
   * @param {string} type - The image format type.
   * @param {number} [quality] - The image quality (optional).
   * @throws {Error} If the type is not a string or if the quality is not a number.
   * @returns {CaptureScreenshotParameters} - The current instance of the CaptureScreenshotParameters for chaining.
   */
  imageFormat(type, quality = undefined) {
    if (typeof type !== 'string') {
      throw new Error(`Type must be an instance of String. Received:'${type}'`)
    }

    this.#map.set('type', type)

    if (quality !== undefined) {
      if (typeof quality !== 'number') {
        throw new Error(`Quality must be a number. Received:'${quality}'`)
      }
      this.#map.set('quality', quality)
    }
    return this
  }

  /**
   * Sets the clip rectangle for capturing a screenshot.
   *
   * @param {BoxClipRectangle|ElementClipRectangle} clipRectangle - The clip rectangle to set.
   * @throws {Error} If the clipRectangle is not an instance of ClipRectangle.
   * @returns {CaptureScreenshotParameters} - The current instance of the CaptureScreenshotParameters for chaining.
   */
  clipRectangle(clipRectangle) {
    if (!(clipRectangle instanceof BoxClipRectangle || clipRectangle instanceof ElementClipRectangle)) {
      throw new Error(`ClipRectangle must be an instance of ClipRectangle. Received:'${clipRectangle}'`)
    }
    this.#map.set('clip', Object.fromEntries(clipRectangle.asMap()))
    return this
  }

  asMap() {
    return this.#map
  }
}

module.exports = { CaptureScreenshotParameters, Origin }
