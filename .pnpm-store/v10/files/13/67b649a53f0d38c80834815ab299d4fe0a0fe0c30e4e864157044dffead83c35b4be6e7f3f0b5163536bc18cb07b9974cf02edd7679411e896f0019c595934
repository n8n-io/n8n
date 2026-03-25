'use strict'

const inherits = require('node:util').inherits
const ReadableStream = require('node:stream').Readable

function PartStream (opts) {
  ReadableStream.call(this, opts)
}
inherits(PartStream, ReadableStream)

PartStream.prototype._read = function (n) {}

module.exports = PartStream
