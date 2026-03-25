'use strict'

const { maxUnsigned16Bit } = require('./constants')

/** @type {import('crypto')} */
let crypto
try {
  crypto = require('crypto')
} catch {

}

class WebsocketFrameSend {
  /**
   * @param {Buffer|undefined} data
   */
  constructor (data) {
    this.frameData = data
    this.maskKey = crypto.randomBytes(4)
  }

  createFrame (opcode) {
    const bodyLength = this.frameData?.byteLength ?? 0

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
    buffer[offset - 4] = this.maskKey[0]
    buffer[offset - 3] = this.maskKey[1]
    buffer[offset - 2] = this.maskKey[2]
    buffer[offset - 1] = this.maskKey[3]

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
    for (let i = 0; i < bodyLength; i++) {
      buffer[offset + i] = this.frameData[i] ^ this.maskKey[i % 4]
    }

    return buffer
  }
}

module.exports = {
  WebsocketFrameSend
}
