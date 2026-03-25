'use strict'

const CHAR_CODE_0 = '0'.charCodeAt(0)
const CHAR_CODE_9 = '9'.charCodeAt(0)
const CHAR_CODE_DASH = '-'.charCodeAt(0)
const CHAR_CODE_COLON = ':'.charCodeAt(0)
const CHAR_CODE_SPACE = ' '.charCodeAt(0)
const CHAR_CODE_DOT = '.'.charCodeAt(0)
const CHAR_CODE_Z = 'Z'.charCodeAt(0)
const CHAR_CODE_MINUS = '-'.charCodeAt(0)
const CHAR_CODE_PLUS = '+'.charCodeAt(0)

class PGDateParser {
  constructor (dateString) {
    this.dateString = dateString
    this.pos = 0
    this.stringLen = dateString.length
  }

  isDigit (c) {
    return c >= CHAR_CODE_0 && c <= CHAR_CODE_9
  }

  /** read numbers and parse positive integer regex: \d+ */
  readInteger () {
    let val = 0
    const start = this.pos
    while (this.pos < this.stringLen) {
      const chr = this.dateString.charCodeAt(this.pos)
      if (this.isDigit(chr)) {
        val = val * 10
        this.pos += 1
        val += chr - CHAR_CODE_0
      } else {
        break
      }
    }

    if (start === this.pos) {
      return null
    }

    return val
  }

  /** read exactly 2 numbers and parse positive integer. regex: \d{2} */
  readInteger2 () {
    const chr1 = this.dateString.charCodeAt(this.pos)
    const chr2 = this.dateString.charCodeAt(this.pos + 1)

    if (this.isDigit(chr1) && this.isDigit(chr2)) {
      this.pos += 2
      return (chr1 - CHAR_CODE_0) * 10 + (chr2 - CHAR_CODE_0)
    }

    return -1
  }

  skipChar (char) {
    if (this.pos === this.stringLen) {
      return false
    }

    if (this.dateString.charCodeAt(this.pos) === char) {
      this.pos += 1
      return true
    }

    return false
  }

  readBC () {
    if (this.pos === this.stringLen) {
      return false
    }

    if (this.dateString.slice(this.pos, this.pos + 3) === ' BC') {
      this.pos += 3
      return true
    }

    return false
  }

  checkEnd () {
    return this.pos === this.stringLen
  }

  getUTC () {
    return this.skipChar(CHAR_CODE_Z)
  }

  readSign () {
    if (this.pos >= this.stringLen) {
      return null
    }

    const char = this.dateString.charCodeAt(this.pos)
    if (char === CHAR_CODE_PLUS) {
      this.pos += 1
      return 1
    }

    if (char === CHAR_CODE_MINUS) {
      this.pos += 1
      return -1
    }

    return null
  }

  getTZOffset () {
    // special handling for '+00' at the end of  - UTC
    if (this.pos === this.stringLen - 3 && this.dateString.slice(this.pos, this.pos + 3) === '+00') {
      this.pos += 3
      return 0
    }

    if (this.stringLen === this.pos) {
      return undefined
    }

    const sign = this.readSign()
    if (sign === null) {
      if (this.getUTC()) {
        return 0
      }

      return undefined
    }

    const hours = this.readInteger2()
    if (hours === null) {
      return null
    }
    let offset = hours * 3600

    if (!this.skipChar(CHAR_CODE_COLON)) {
      return offset * sign * 1000
    }

    const minutes = this.readInteger2()
    if (minutes === null) {
      return null
    }
    offset += minutes * 60

    if (!this.skipChar(CHAR_CODE_COLON)) {
      return offset * sign * 1000
    }

    const seconds = this.readInteger2()
    if (seconds == null) {
      return null
    }

    return (offset + seconds) * sign * 1000
  }

  /* read milliseconds out of time fraction, returns 0 if missing, null if format invalid */
  readMilliseconds () {
    /* read milliseconds from fraction: .001=1, 0.1 = 100 */
    if (this.skipChar(CHAR_CODE_DOT)) {
      let i = 2
      let val = 0
      const start = this.pos
      while (this.pos < this.stringLen) {
        const chr = this.dateString.charCodeAt(this.pos)
        if (this.isDigit(chr)) {
          this.pos += 1
          if (i >= 0) {
            val += (chr - CHAR_CODE_0) * 10 ** i
          }
          i -= 1
        } else {
          break
        }
      }

      if (start === this.pos) {
        return null
      }

      return val
    }

    return 0
  }

  readDate () {
    const year = this.readInteger()
    if (!this.skipChar(CHAR_CODE_DASH)) {
      return null
    }

    let month = this.readInteger2()
    if (!this.skipChar(CHAR_CODE_DASH)) {
      return null
    }

    const day = this.readInteger2()
    if (year === null || month === null || day === null) {
      return null
    }

    month = month - 1
    return { year, month, day }
  }

  readTime () {
    if (this.stringLen - this.pos < 9 || !this.skipChar(CHAR_CODE_SPACE)) {
      return { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }
    }

    const hours = this.readInteger2()
    if (hours === null || !this.skipChar(CHAR_CODE_COLON)) {
      return null
    }
    const minutes = this.readInteger2()
    if (minutes === null || !this.skipChar(CHAR_CODE_COLON)) {
      return null
    }
    const seconds = this.readInteger2()
    if (seconds === null) {
      return null
    }

    const milliseconds = this.readMilliseconds()
    if (milliseconds === null) {
      return null
    }

    return { hours, minutes, seconds, milliseconds }
  }

  getJSDate () {
    const date = this.readDate()
    if (date === null) {
      return null
    }

    const time = this.readTime()
    if (time === null) {
      return null
    }

    const tzOffset = this.getTZOffset()
    if (tzOffset === null) {
      return null
    }

    const isBC = this.readBC()
    if (isBC) {
      date.year = -(date.year - 1)
    }

    if (!this.checkEnd()) {
      return null
    }

    let jsDate
    if (tzOffset !== undefined) {
      jsDate = new Date(
        Date.UTC(date.year, date.month, date.day, time.hours, time.minutes, time.seconds, time.milliseconds)
      )

      if (date.year <= 99 && date.year >= -99) {
        jsDate.setUTCFullYear(date.year)
      }

      if (tzOffset !== 0) {
        jsDate.setTime(jsDate.getTime() - tzOffset)
      }
    } else {
      jsDate = new Date(date.year, date.month, date.day, time.hours, time.minutes, time.seconds, time.milliseconds)
      if (date.year <= 99 && date.year >= -99) {
        jsDate.setFullYear(date.year)
      }
    }

    return jsDate
  }

  static parse (dateString) {
    return new PGDateParser(dateString).getJSDate()
  }
}

module.exports = function parseDate (isoDate) {
  if (isoDate === null || isoDate === undefined) {
    return null
  }

  const date = PGDateParser.parse(isoDate)

  // parsing failed, check for infinity
  if (date === null) {
    if (isoDate === 'infinity') {
      return Infinity
    }

    if (isoDate === '-infinity') {
      return -Infinity
    }
  }

  return date
}
