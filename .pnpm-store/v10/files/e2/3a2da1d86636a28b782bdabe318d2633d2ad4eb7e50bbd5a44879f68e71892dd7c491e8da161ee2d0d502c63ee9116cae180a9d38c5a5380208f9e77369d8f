'use strict'

const textDecoder = new TextDecoder()

/**
 * @see https://encoding.spec.whatwg.org/#utf-8-decode
 * @param {Uint8Array} buffer
 */
function utf8DecodeBytes (buffer) {
  if (buffer.length === 0) {
    return ''
  }

  // 1. Let buffer be the result of peeking three bytes from
  //    ioQueue, converted to a byte sequence.

  // 2. If buffer is 0xEF 0xBB 0xBF, then read three
  //    bytes from ioQueue. (Do nothing with those bytes.)
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    buffer = buffer.subarray(3)
  }

  // 3. Process a queue with an instance of UTF-8’s
  //    decoder, ioQueue, output, and "replacement".
  const output = textDecoder.decode(buffer)

  // 4. Return output.
  return output
}

module.exports = {
  utf8DecodeBytes
}
