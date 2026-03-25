'use strict'

// TODO:
//  * support 1 nested multipart level
//    (see second multipart example here:
//     http://www.w3.org/TR/html401/interact/forms.html#didx-multipartform-data)
//  * support limits.fieldNameSize
//     -- this will require modifications to utils.parseParams

const { Readable } = require('node:stream')
const { inherits } = require('node:util')

const Dicer = require('../../deps/dicer/lib/Dicer')

const parseParams = require('../utils/parseParams')
const decodeText = require('../utils/decodeText')
const basename = require('../utils/basename')
const getLimit = require('../utils/getLimit')

const RE_BOUNDARY = /^boundary$/i
const RE_FIELD = /^form-data$/i
const RE_CHARSET = /^charset$/i
const RE_FILENAME = /^filename$/i
const RE_NAME = /^name$/i

Multipart.detect = /^multipart\/form-data/i
function Multipart (boy, cfg) {
  let i
  let len
  const self = this
  let boundary
  const limits = cfg.limits
  const isPartAFile = cfg.isPartAFile || ((fieldName, contentType, fileName) => (contentType === 'application/octet-stream' || fileName !== undefined))
  const parsedConType = cfg.parsedConType || []
  const defCharset = cfg.defCharset || 'utf8'
  const preservePath = cfg.preservePath
  const fileOpts = { highWaterMark: cfg.fileHwm }

  for (i = 0, len = parsedConType.length; i < len; ++i) {
    if (Array.isArray(parsedConType[i]) &&
      RE_BOUNDARY.test(parsedConType[i][0])) {
      boundary = parsedConType[i][1]
      break
    }
  }

  function checkFinished () {
    if (nends === 0 && finished && !boy._done) {
      finished = false
      self.end()
    }
  }

  if (typeof boundary !== 'string') { throw new Error('Multipart: Boundary not found') }

  const fieldSizeLimit = getLimit(limits, 'fieldSize', 1 * 1024 * 1024)
  const fileSizeLimit = getLimit(limits, 'fileSize', Infinity)
  const filesLimit = getLimit(limits, 'files', Infinity)
  const fieldsLimit = getLimit(limits, 'fields', Infinity)
  const partsLimit = getLimit(limits, 'parts', Infinity)
  const headerPairsLimit = getLimit(limits, 'headerPairs', 2000)
  const headerSizeLimit = getLimit(limits, 'headerSize', 80 * 1024)

  let nfiles = 0
  let nfields = 0
  let nends = 0
  let curFile
  let curField
  let finished = false

  this._needDrain = false
  this._pause = false
  this._cb = undefined
  this._nparts = 0
  this._boy = boy

  const parserCfg = {
    boundary,
    maxHeaderPairs: headerPairsLimit,
    maxHeaderSize: headerSizeLimit,
    partHwm: fileOpts.highWaterMark,
    highWaterMark: cfg.highWaterMark
  }

  this.parser = new Dicer(parserCfg)
  this.parser.on('drain', function () {
    self._needDrain = false
    if (self._cb && !self._pause) {
      const cb = self._cb
      self._cb = undefined
      cb()
    }
  }).on('part', function onPart (part) {
    if (++self._nparts > partsLimit) {
      self.parser.removeListener('part', onPart)
      self.parser.on('part', skipPart)
      boy.hitPartsLimit = true
      boy.emit('partsLimit')
      return skipPart(part)
    }

    // hack because streams2 _always_ doesn't emit 'end' until nextTick, so let
    // us emit 'end' early since we know the part has ended if we are already
    // seeing the next part
    if (curField) {
      const field = curField
      field.emit('end')
      field.removeAllListeners('end')
    }

    part.on('header', function (header) {
      let contype
      let fieldname
      let parsed
      let charset
      let encoding
      let filename
      let nsize = 0

      if (header['content-type']) {
        parsed = parseParams(header['content-type'][0])
        if (parsed[0]) {
          contype = parsed[0].toLowerCase()
          for (i = 0, len = parsed.length; i < len; ++i) {
            if (RE_CHARSET.test(parsed[i][0])) {
              charset = parsed[i][1].toLowerCase()
              break
            }
          }
        }
      }

      if (contype === undefined) { contype = 'text/plain' }
      if (charset === undefined) { charset = defCharset }

      if (header['content-disposition']) {
        parsed = parseParams(header['content-disposition'][0])
        if (!RE_FIELD.test(parsed[0])) { return skipPart(part) }
        for (i = 0, len = parsed.length; i < len; ++i) {
          if (RE_NAME.test(parsed[i][0])) {
            fieldname = parsed[i][1]
          } else if (RE_FILENAME.test(parsed[i][0])) {
            filename = parsed[i][1]
            if (!preservePath) { filename = basename(filename) }
          }
        }
      } else { return skipPart(part) }

      if (header['content-transfer-encoding']) { encoding = header['content-transfer-encoding'][0].toLowerCase() } else { encoding = '7bit' }

      let onData,
        onEnd

      if (isPartAFile(fieldname, contype, filename)) {
        // file/binary field
        if (nfiles === filesLimit) {
          if (!boy.hitFilesLimit) {
            boy.hitFilesLimit = true
            boy.emit('filesLimit')
          }
          return skipPart(part)
        }

        ++nfiles

        if (boy.listenerCount('file') === 0) {
          self.parser._ignore()
          return
        }

        ++nends
        const file = new FileStream(fileOpts)
        curFile = file
        file.on('end', function () {
          --nends
          self._pause = false
          checkFinished()
          if (self._cb && !self._needDrain) {
            const cb = self._cb
            self._cb = undefined
            cb()
          }
        })
        file._read = function (n) {
          if (!self._pause) { return }
          self._pause = false
          if (self._cb && !self._needDrain) {
            const cb = self._cb
            self._cb = undefined
            cb()
          }
        }
        boy.emit('file', fieldname, file, filename, encoding, contype)

        onData = function (data) {
          if ((nsize += data.length) > fileSizeLimit) {
            const extralen = fileSizeLimit - nsize + data.length
            if (extralen > 0) { file.push(data.slice(0, extralen)) }
            file.truncated = true
            file.bytesRead = fileSizeLimit
            part.removeAllListeners('data')
            file.emit('limit')
            return
          } else if (!file.push(data)) { self._pause = true }

          file.bytesRead = nsize
        }

        onEnd = function () {
          curFile = undefined
          file.push(null)
        }
      } else {
        // non-file field
        if (nfields === fieldsLimit) {
          if (!boy.hitFieldsLimit) {
            boy.hitFieldsLimit = true
            boy.emit('fieldsLimit')
          }
          return skipPart(part)
        }

        ++nfields
        ++nends
        let buffer = ''
        let truncated = false
        curField = part

        onData = function (data) {
          if ((nsize += data.length) > fieldSizeLimit) {
            const extralen = (fieldSizeLimit - (nsize - data.length))
            buffer += data.toString('binary', 0, extralen)
            truncated = true
            part.removeAllListeners('data')
          } else { buffer += data.toString('binary') }
        }

        onEnd = function () {
          curField = undefined
          if (buffer.length) { buffer = decodeText(buffer, 'binary', charset) }
          boy.emit('field', fieldname, buffer, false, truncated, encoding, contype)
          --nends
          checkFinished()
        }
      }

      /* As of node@2efe4ab761666 (v0.10.29+/v0.11.14+), busboy had become
         broken. Streams2/streams3 is a huge black box of confusion, but
         somehow overriding the sync state seems to fix things again (and still
         seems to work for previous node versions).
      */
      part._readableState.sync = false

      part.on('data', onData)
      part.on('end', onEnd)
    }).on('error', function (err) {
      if (curFile) { curFile.emit('error', err) }
    })
  }).on('error', function (err) {
    boy.emit('error', err)
  }).on('finish', function () {
    finished = true
    checkFinished()
  })
}

Multipart.prototype.write = function (chunk, cb) {
  const r = this.parser.write(chunk)
  if (r && !this._pause) {
    cb()
  } else {
    this._needDrain = !r
    this._cb = cb
  }
}

Multipart.prototype.end = function () {
  const self = this

  if (self.parser.writable) {
    self.parser.end()
  } else if (!self._boy._done) {
    process.nextTick(function () {
      self._boy._done = true
      self._boy.emit('finish')
    })
  }
}

function skipPart (part) {
  part.resume()
}

function FileStream (opts) {
  Readable.call(this, opts)

  this.bytesRead = 0

  this.truncated = false
}

inherits(FileStream, Readable)

FileStream.prototype._read = function (n) {}

module.exports = Multipart
