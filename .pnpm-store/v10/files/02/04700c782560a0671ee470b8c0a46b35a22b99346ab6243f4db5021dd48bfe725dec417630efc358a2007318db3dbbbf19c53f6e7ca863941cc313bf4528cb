'use strict'

const WritableStream = require('node:stream').Writable
const inherits = require('node:util').inherits

const StreamSearch = require('../../streamsearch/sbmh')

const PartStream = require('./PartStream')
const HeaderParser = require('./HeaderParser')

const DASH = 45
const B_ONEDASH = Buffer.from('-')
const B_CRLF = Buffer.from('\r\n')
const EMPTY_FN = function () {}

function Dicer (cfg) {
  if (!(this instanceof Dicer)) { return new Dicer(cfg) }
  WritableStream.call(this, cfg)

  if (!cfg || (!cfg.headerFirst && typeof cfg.boundary !== 'string')) { throw new TypeError('Boundary required') }

  if (typeof cfg.boundary === 'string') { this.setBoundary(cfg.boundary) } else { this._bparser = undefined }

  this._headerFirst = cfg.headerFirst

  this._dashes = 0
  this._parts = 0
  this._finished = false
  this._realFinish = false
  this._isPreamble = true
  this._justMatched = false
  this._firstWrite = true
  this._inHeader = true
  this._part = undefined
  this._cb = undefined
  this._ignoreData = false
  this._partOpts = { highWaterMark: cfg.partHwm }
  this._pause = false

  const self = this
  this._hparser = new HeaderParser(cfg)
  this._hparser.on('header', function (header) {
    self._inHeader = false
    self._part.emit('header', header)
  })
}
inherits(Dicer, WritableStream)

Dicer.prototype.emit = function (ev) {
  if (ev === 'finish' && !this._realFinish) {
    if (!this._finished) {
      const self = this
      process.nextTick(function () {
        self.emit('error', new Error('Unexpected end of multipart data'))
        if (self._part && !self._ignoreData) {
          const type = (self._isPreamble ? 'Preamble' : 'Part')
          self._part.emit('error', new Error(type + ' terminated early due to unexpected end of multipart data'))
          self._part.push(null)
          process.nextTick(function () {
            self._realFinish = true
            self.emit('finish')
            self._realFinish = false
          })
          return
        }
        self._realFinish = true
        self.emit('finish')
        self._realFinish = false
      })
    }
  } else { WritableStream.prototype.emit.apply(this, arguments) }
}

Dicer.prototype._write = function (data, encoding, cb) {
  // ignore unexpected data (e.g. extra trailer data after finished)
  if (!this._hparser && !this._bparser) { return cb() }

  if (this._headerFirst && this._isPreamble) {
    if (!this._part) {
      this._part = new PartStream(this._partOpts)
      if (this.listenerCount('preamble') !== 0) { this.emit('preamble', this._part) } else { this._ignore() }
    }
    const r = this._hparser.push(data)
    if (!this._inHeader && r !== undefined && r < data.length) { data = data.slice(r) } else { return cb() }
  }

  // allows for "easier" testing
  if (this._firstWrite) {
    this._bparser.push(B_CRLF)
    this._firstWrite = false
  }

  this._bparser.push(data)

  if (this._pause) { this._cb = cb } else { cb() }
}

Dicer.prototype.reset = function () {
  this._part = undefined
  this._bparser = undefined
  this._hparser = undefined
}

Dicer.prototype.setBoundary = function (boundary) {
  const self = this
  this._bparser = new StreamSearch('\r\n--' + boundary)
  this._bparser.on('info', function (isMatch, data, start, end) {
    self._oninfo(isMatch, data, start, end)
  })
}

Dicer.prototype._ignore = function () {
  if (this._part && !this._ignoreData) {
    this._ignoreData = true
    this._part.on('error', EMPTY_FN)
    // we must perform some kind of read on the stream even though we are
    // ignoring the data, otherwise node's Readable stream will not emit 'end'
    // after pushing null to the stream
    this._part.resume()
  }
}

Dicer.prototype._oninfo = function (isMatch, data, start, end) {
  let buf; const self = this; let i = 0; let r; let shouldWriteMore = true

  if (!this._part && this._justMatched && data) {
    while (this._dashes < 2 && (start + i) < end) {
      if (data[start + i] === DASH) {
        ++i
        ++this._dashes
      } else {
        if (this._dashes) { buf = B_ONEDASH }
        this._dashes = 0
        break
      }
    }
    if (this._dashes === 2) {
      if ((start + i) < end && this.listenerCount('trailer') !== 0) { this.emit('trailer', data.slice(start + i, end)) }
      this.reset()
      this._finished = true
      // no more parts will be added
      if (self._parts === 0) {
        self._realFinish = true
        self.emit('finish')
        self._realFinish = false
      }
    }
    if (this._dashes) { return }
  }
  if (this._justMatched) { this._justMatched = false }
  if (!this._part) {
    this._part = new PartStream(this._partOpts)
    this._part._read = function (n) {
      self._unpause()
    }
    if (this._isPreamble && this.listenerCount('preamble') !== 0) {
      this.emit('preamble', this._part)
    } else if (this._isPreamble !== true && this.listenerCount('part') !== 0) {
      this.emit('part', this._part)
    } else {
      this._ignore()
    }
    if (!this._isPreamble) { this._inHeader = true }
  }
  if (data && start < end && !this._ignoreData) {
    if (this._isPreamble || !this._inHeader) {
      if (buf) { shouldWriteMore = this._part.push(buf) }
      shouldWriteMore = this._part.push(data.slice(start, end))
      if (!shouldWriteMore) { this._pause = true }
    } else if (!this._isPreamble && this._inHeader) {
      if (buf) { this._hparser.push(buf) }
      r = this._hparser.push(data.slice(start, end))
      if (!this._inHeader && r !== undefined && r < end) { this._oninfo(false, data, start + r, end) }
    }
  }
  if (isMatch) {
    this._hparser.reset()
    if (this._isPreamble) { this._isPreamble = false } else {
      if (start !== end) {
        ++this._parts
        this._part.on('end', function () {
          if (--self._parts === 0) {
            if (self._finished) {
              self._realFinish = true
              self.emit('finish')
              self._realFinish = false
            } else {
              self._unpause()
            }
          }
        })
      }
    }
    this._part.push(null)
    this._part = undefined
    this._ignoreData = false
    this._justMatched = true
    this._dashes = 0
  }
}

Dicer.prototype._unpause = function () {
  if (!this._pause) { return }

  this._pause = false
  if (this._cb) {
    const cb = this._cb
    this._cb = undefined
    cb()
  }
}

module.exports = Dicer
