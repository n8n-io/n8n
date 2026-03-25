'use strict'

const RE_PLUS = /\+/g

const HEX = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
]

function Decoder () {
  this.buffer = undefined
}
Decoder.prototype.write = function (str) {
  // Replace '+' with ' ' before decoding
  str = str.replace(RE_PLUS, ' ')
  let res = ''
  let i = 0; let p = 0; const len = str.length
  for (; i < len; ++i) {
    if (this.buffer !== undefined) {
      if (!HEX[str.charCodeAt(i)]) {
        res += '%' + this.buffer
        this.buffer = undefined
        --i // retry character
      } else {
        this.buffer += str[i]
        ++p
        if (this.buffer.length === 2) {
          res += String.fromCharCode(parseInt(this.buffer, 16))
          this.buffer = undefined
        }
      }
    } else if (str[i] === '%') {
      if (i > p) {
        res += str.substring(p, i)
        p = i
      }
      this.buffer = ''
      ++p
    }
  }
  if (p < len && this.buffer === undefined) { res += str.substring(p) }
  return res
}
Decoder.prototype.reset = function () {
  this.buffer = undefined
}

module.exports = Decoder
