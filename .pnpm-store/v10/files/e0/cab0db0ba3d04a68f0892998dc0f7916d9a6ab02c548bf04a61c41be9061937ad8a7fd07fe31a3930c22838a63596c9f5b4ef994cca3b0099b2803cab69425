'use strict'

const { createInflateRaw, Z_DEFAULT_WINDOWBITS } = require('node:zlib')
const { isValidClientWindowBits } = require('./util')

const tail = Buffer.from([0x00, 0x00, 0xff, 0xff])
const kBuffer = Symbol('kBuffer')
const kLength = Symbol('kLength')

class PerMessageDeflate {
  /** @type {import('node:zlib').InflateRaw} */
  #inflate

  #options = {}

  constructor (extensions) {
    this.#options.serverNoContextTakeover = extensions.has('server_no_context_takeover')
    this.#options.serverMaxWindowBits = extensions.get('server_max_window_bits')
  }

  decompress (chunk, fin, callback) {
    // An endpoint uses the following algorithm to decompress a message.
    // 1.  Append 4 octets of 0x00 0x00 0xff 0xff to the tail end of the
    //     payload of the message.
    // 2.  Decompress the resulting data using DEFLATE.

    if (!this.#inflate) {
      let windowBits = Z_DEFAULT_WINDOWBITS

      if (this.#options.serverMaxWindowBits) { // empty values default to Z_DEFAULT_WINDOWBITS
        if (!isValidClientWindowBits(this.#options.serverMaxWindowBits)) {
          callback(new Error('Invalid server_max_window_bits'))
          return
        }

        windowBits = Number.parseInt(this.#options.serverMaxWindowBits)
      }

      this.#inflate = createInflateRaw({ windowBits })
      this.#inflate[kBuffer] = []
      this.#inflate[kLength] = 0

      this.#inflate.on('data', (data) => {
        this.#inflate[kBuffer].push(data)
        this.#inflate[kLength] += data.length
      })

      this.#inflate.on('error', (err) => {
        this.#inflate = null
        callback(err)
      })
    }

    this.#inflate.write(chunk)
    if (fin) {
      this.#inflate.write(tail)
    }

    this.#inflate.flush(() => {
      const full = Buffer.concat(this.#inflate[kBuffer], this.#inflate[kLength])

      this.#inflate[kBuffer].length = 0
      this.#inflate[kLength] = 0

      callback(null, full)
    })
  }
}

module.exports = { PerMessageDeflate }
