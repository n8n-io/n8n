'use strict'

const { maxUnsigned16Bit } = require('./constants')

const BUFFER_SIZE = 16386

/** @type {import('crypto')} */
let crypto
let buffer = null
let bufIdx = BUFFER_SIZE

try {
  crypto = require('node:crypto')
/* c8 ignore next 3 */
} catch {
  crypto = {
    // not full compatibility, but minimum.
    randomFillSync: function randomFillSync (buffer, _offset, _size) {
      for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = Math.random() * 255 | 0
      }
      return buffer
    }
  }
}

function generateMask () {
  if (bufIdx === BUFFER_SIZE) {
    bufIdx = 0
    crypto.randomFillSync((buffer ??= Buffer.allocUnsafe(BUFFER_SIZE)), 0, BUFFER_SIZE)
  }
  return [buffer[bufIdx++], buffer[bufIdx++], buffer[bufIdx++], buffer[bufIdx++]]
}

class WebsocketFrameSend {
  /**
   * @param {Buffer|undefined} data
   */
  constructor (data) {
    this.frameData = data
  }

  createFrame (opcode) {
    const frameData = this.frameData
    const maskKey = generateMask()
    const bodyLength = frameData?.byteLength ?? 0

    /** @type {number} */
    let payloadLength = bodyLength // 0-125
    let offset = 6

    if (bodyLength > maxUnsigned16Bit) {
      offset += 8 // payload length is next 8 bytes
      payloadLength = 127
    } else if (bodyLength > 125) {
      offset += 2 // payload length is next 2 bytes
      payloadLength = 126
    }

    const buffer = Buffer.allocUnsafe(bodyLength + offset)

    // Clear first 2 bytes, everything else is overwritten
    buffer[0] = buffer[1] = 0
    buffer[0] |= 0x80 // FIN
    buffer[0] = (buffer[0] & 0xF0) + opcode // opcode

    /*! ws. MIT License. Einar Otto Stangvik <einaros@gmail.com> */
    buffer[offset - 4] = maskKey[0]
    buffer[offset - 3] = maskKey[1]
    buffer[offset - 2] = maskKey[2]
    buffer[offset - 1] = maskKey[3]

    buffer[1] = payloadLength

    if (payloadLength === 126) {
      buffer.writeUInt16BE(bodyLength, 2)
    } else if (payloadLength === 127) {
      // Clear extended payload length
      buffer[2] = buffer[3] = 0
      buffer.writeUIntBE(bodyLength, 4, 6)
    }

    buffer[1] |= 0x80 // MASK

    // mask body
    for (let i = 0; i < bodyLength; ++i) {
      buffer[offset + i] = frameData[i] ^ maskKey[i & 3]
    }

    return buffer
  }
}

module.exports = {
  WebsocketFrameSend
}
