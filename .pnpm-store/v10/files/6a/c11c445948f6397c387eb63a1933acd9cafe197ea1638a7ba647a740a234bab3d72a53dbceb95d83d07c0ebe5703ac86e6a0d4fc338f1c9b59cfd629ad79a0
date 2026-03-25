/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const stream = require('stream')

// ------------------------------------------------------------------------------
// Public Interface
// ------------------------------------------------------------------------------

/**
 * The stream to accumulate written data as a single string.
 */
module.exports = class BufferStream extends stream.Writable {
  /**
     * Initialize the current data as a empty string.
     */
  constructor () {
    super()

    /**
         * Accumulated data.
         * @type {string}
         */
    this.value = ''
  }

  /**
     * Accumulates written data.
     *
     * @param {string|Buffer} chunk - A written data.
     * @param {string} _encoding - The encoding of chunk.
     * @param {function} callback - The callback to notify done.
     * @returns {void}
     */
  _write (chunk, _encoding, callback) {
    this.value += chunk.toString()
    callback()
  }
}
