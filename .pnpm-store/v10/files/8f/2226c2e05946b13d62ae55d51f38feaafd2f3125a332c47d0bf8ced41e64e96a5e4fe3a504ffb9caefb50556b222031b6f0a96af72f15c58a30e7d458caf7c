'use strict'

const { Transform } = require('stream')

class ByteaEncoder extends Transform {
  constructor () {
    super()
    this.push('\\\\x')
  }

  _transform (chunk, encoding, callback) {
    this.push(chunk.toString('hex'))
    callback()
  }
}

module.exports = ByteaEncoder
