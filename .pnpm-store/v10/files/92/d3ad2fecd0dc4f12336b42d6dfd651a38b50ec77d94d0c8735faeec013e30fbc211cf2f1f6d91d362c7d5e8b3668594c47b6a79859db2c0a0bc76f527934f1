const b4a = require('b4a')

/**
 * https://encoding.spec.whatwg.org/#utf-8-decoder
 */
module.exports = class UTF8Decoder {
  constructor () {
    this.codePoint = 0
    this.bytesSeen = 0
    this.bytesNeeded = 0
    this.lowerBoundary = 0x80
    this.upperBoundary = 0xbf
  }

  get remaining () {
    return this.bytesSeen
  }

  decode (data) {
    // If we have a fast path, just sniff if the last part is a boundary
    if (this.bytesNeeded === 0) {
      let isBoundary = true

      for (let i = Math.max(0, data.byteLength - 4), n = data.byteLength; i < n && isBoundary; i++) {
        isBoundary = data[i] <= 0x7f
      }

      if (isBoundary) return b4a.toString(data, 'utf8')
    }

    let result = ''

    for (let i = 0, n = data.byteLength; i < n; i++) {
      const byte = data[i]

      if (this.bytesNeeded === 0) {
        if (byte <= 0x7f) {
          result += String.fromCharCode(byte)
        } else {
          this.bytesSeen = 1

          if (byte >= 0xc2 && byte <= 0xdf) {
            this.bytesNeeded = 2
            this.codePoint = byte & 0x1f
          } else if (byte >= 0xe0 && byte <= 0xef) {
            if (byte === 0xe0) this.lowerBoundary = 0xa0
            else if (byte === 0xed) this.upperBoundary = 0x9f
            this.bytesNeeded = 3
            this.codePoint = byte & 0xf
          } else if (byte >= 0xf0 && byte <= 0xf4) {
            if (byte === 0xf0) this.lowerBoundary = 0x90
            if (byte === 0xf4) this.upperBoundary = 0x8f
            this.bytesNeeded = 4
            this.codePoint = byte & 0x7
          } else {
            result += '\ufffd'
          }
        }

        continue
      }

      if (byte < this.lowerBoundary || byte > this.upperBoundary) {
        this.codePoint = 0
        this.bytesNeeded = 0
        this.bytesSeen = 0
        this.lowerBoundary = 0x80
        this.upperBoundary = 0xbf

        result += '\ufffd'

        continue
      }

      this.lowerBoundary = 0x80
      this.upperBoundary = 0xbf

      this.codePoint = (this.codePoint << 6) | (byte & 0x3f)
      this.bytesSeen++

      if (this.bytesSeen !== this.bytesNeeded) continue

      result += String.fromCodePoint(this.codePoint)

      this.codePoint = 0
      this.bytesNeeded = 0
      this.bytesSeen = 0
    }

    return result
  }

  flush () {
    const result = this.bytesNeeded > 0 ? '\ufffd' : ''

    this.codePoint = 0
    this.bytesNeeded = 0
    this.bytesSeen = 0
    this.lowerBoundary = 0x80
    this.upperBoundary = 0xbf

    return result
  }
}
