'use strict'

const WritableStream = require('node:stream').Writable
const { inherits } = require('node:util')
const Dicer = require('../deps/dicer/lib/Dicer')

const MultipartParser = require('./types/multipart')
const UrlencodedParser = require('./types/urlencoded')
const parseParams = require('./utils/parseParams')

function Busboy (opts) {
  if (!(this instanceof Busboy)) { return new Busboy(opts) }

  if (typeof opts !== 'object') {
    throw new TypeError('Busboy expected an options-Object.')
  }
  if (typeof opts.headers !== 'object') {
    throw new TypeError('Busboy expected an options-Object with headers-attribute.')
  }
  if (typeof opts.headers['content-type'] !== 'string') {
    throw new TypeError('Missing Content-Type-header.')
  }

  const {
    headers,
    ...streamOptions
  } = opts

  this.opts = {
    autoDestroy: false,
    ...streamOptions
  }
  WritableStream.call(this, this.opts)

  this._done = false
  this._parser = this.getParserByHeaders(headers)
  this._finished = false
}
inherits(Busboy, WritableStream)

Busboy.prototype.emit = function (ev) {
  if (ev === 'finish') {
    if (!this._done) {
      this._parser?.end()
      return
    } else if (this._finished) {
      return
    }
    this._finished = true
  }
  WritableStream.prototype.emit.apply(this, arguments)
}

Busboy.prototype.getParserByHeaders = function (headers) {
  const parsed = parseParams(headers['content-type'])

  const cfg = {
    defCharset: this.opts.defCharset,
    fileHwm: this.opts.fileHwm,
    headers,
    highWaterMark: this.opts.highWaterMark,
    isPartAFile: this.opts.isPartAFile,
    limits: this.opts.limits,
    parsedConType: parsed,
    preservePath: this.opts.preservePath
  }

  if (MultipartParser.detect.test(parsed[0])) {
    return new MultipartParser(this, cfg)
  }
  if (UrlencodedParser.detect.test(parsed[0])) {
    return new UrlencodedParser(this, cfg)
  }
  throw new Error('Unsupported Content-Type.')
}

Busboy.prototype._write = function (chunk, encoding, cb) {
  this._parser.write(chunk, cb)
}

module.exports = Busboy
module.exports.default = Busboy
module.exports.Busboy = Busboy

module.exports.Dicer = Dicer
