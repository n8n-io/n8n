const b4a = require('b4a')

module.exports = class PassThroughDecoder {
  constructor (encoding) {
    this.encoding = encoding
  }

  get remaining () {
    return 0
  }

  decode (tail) {
    return b4a.toString(tail, this.encoding)
  }

  flush () {
    return ''
  }
}
