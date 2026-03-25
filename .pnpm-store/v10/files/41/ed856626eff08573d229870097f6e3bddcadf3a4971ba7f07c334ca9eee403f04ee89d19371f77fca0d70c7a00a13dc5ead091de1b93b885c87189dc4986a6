'use strict'

const BufferList = require('obuf')
const { Transform } = require('stream')

const State = {
  READ_PREFIX: 1,
  READ_DATA: 2
}

class ByteaDecoder extends Transform {
  constructor () {
    super()
    this._incomingChunks = new BufferList()
    this._state = State.READ_PREFIX
  }

  _transform (chunk, encoding, callback) {
    this._incomingChunks.push(chunk)

    while (true) {
      if (this._state === State.READ_PREFIX) {
        if (this._incomingChunks.has(3)) {
          const prefix = this._incomingChunks.take(3)
          const prefixString = prefix.toString()
          if (prefixString !== '\\\\x') {
            return this.emit('error', new Error(`Expected double-escaped postgres bytea hex format prefix, received: '${prefixString}'`))
          }
          this._state = State.READ_DATA
          continue
        } else {
          break
        }
      }

      if (this._state === State.READ_DATA) {
        if (this._incomingChunks.size >= 2) {
          // two hex characters are needed to parse a byte. read even number of chars, and let remainder roll over
          let evenChunk
          const isEvenLength = this._incomingChunks.size % 2 === 0
          if (isEvenLength) {
            evenChunk = this._incomingChunks.take(this._incomingChunks.size)
          } else {
            evenChunk = this._incomingChunks.take(this._incomingChunks.size - 1)
          }
          this.push(Buffer.from(evenChunk.toString(), 'hex'))
        }
        break
      }
    }

    callback()
  }
}

module.exports = ByteaDecoder
