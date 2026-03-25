'use strict'

const EventEmitter = require('node:events').EventEmitter
const inherits = require('node:util').inherits
const getLimit = require('../../../lib/utils/getLimit')

const StreamSearch = require('../../streamsearch/sbmh')

const B_DCRLF = Buffer.from('\r\n\r\n')
const RE_CRLF = /\r\n/g
const RE_HDR = /^([^:]+):[ \t]?([\x00-\xFF]+)?$/ // eslint-disable-line no-control-regex

function HeaderParser (cfg) {
  EventEmitter.call(this)

  cfg = cfg || {}
  const self = this
  this.nread = 0
  this.maxed = false
  this.npairs = 0
  this.maxHeaderPairs = getLimit(cfg, 'maxHeaderPairs', 2000)
  this.maxHeaderSize = getLimit(cfg, 'maxHeaderSize', 80 * 1024)
  this.buffer = ''
  this.header = {}
  this.finished = false
  this.ss = new StreamSearch(B_DCRLF)
  this.ss.on('info', function (isMatch, data, start, end) {
    if (data && !self.maxed) {
      if (self.nread + end - start >= self.maxHeaderSize) {
        end = self.maxHeaderSize - self.nread + start
        self.nread = self.maxHeaderSize
        self.maxed = true
      } else { self.nread += (end - start) }

      self.buffer += data.toString('binary', start, end)
    }
    if (isMatch) { self._finish() }
  })
}
inherits(HeaderParser, EventEmitter)

HeaderParser.prototype.push = function (data) {
  const r = this.ss.push(data)
  if (this.finished) { return r }
}

HeaderParser.prototype.reset = function () {
  this.finished = false
  this.buffer = ''
  this.header = {}
  this.ss.reset()
}

HeaderParser.prototype._finish = function () {
  if (this.buffer) { this._parseHeader() }
  this.ss.matches = this.ss.maxMatches
  const header = this.header
  this.header = {}
  this.buffer = ''
  this.finished = true
  this.nread = this.npairs = 0
  this.maxed = false
  this.emit('header', header)
}

HeaderParser.prototype._parseHeader = function () {
  if (this.npairs === this.maxHeaderPairs) { return }

  const lines = this.buffer.split(RE_CRLF)
  const len = lines.length
  let m, h

  for (var i = 0; i < len; ++i) { // eslint-disable-line no-var
    if (lines[i].length === 0) { continue }
    if (lines[i][0] === '\t' || lines[i][0] === ' ') {
      // folded header content
      // RFC2822 says to just remove the CRLF and not the whitespace following
      // it, so we follow the RFC and include the leading whitespace ...
      if (h) {
        this.header[h][this.header[h].length - 1] += lines[i]
        continue
      }
    }

    const posColon = lines[i].indexOf(':')
    if (
      posColon === -1 ||
      posColon === 0
    ) {
      return
    }
    m = RE_HDR.exec(lines[i])
    h = m[1].toLowerCase()
    this.header[h] = this.header[h] || []
    this.header[h].push((m[2] || ''))
    if (++this.npairs === this.maxHeaderPairs) { break }
  }
}

module.exports = HeaderParser
