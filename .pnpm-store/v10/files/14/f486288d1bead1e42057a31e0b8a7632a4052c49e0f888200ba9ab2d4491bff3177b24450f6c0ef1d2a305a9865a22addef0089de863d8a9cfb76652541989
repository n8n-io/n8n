const Minipass = require('minipass')

class SizeError extends Error {
  constructor (found, expect) {
    super(`Bad data size: expected ${expect} bytes, but got ${found}`)
    this.expect = expect
    this.found = found
    this.code = 'EBADSIZE'
	  Error.captureStackTrace(this, this.constructor)
  }
  get name () {
    return 'SizeError'
  }
}

class MinipassSized extends Minipass {
  constructor (options = {}) {
    super(options)

    if (options.objectMode)
      throw new TypeError(`${
        this.constructor.name
      } streams only work with string and buffer data`)

    this.found = 0
    this.expect = options.size
    if (typeof this.expect !== 'number' ||
        this.expect > Number.MAX_SAFE_INTEGER ||
        isNaN(this.expect) ||
        this.expect < 0 ||
        !isFinite(this.expect) ||
        this.expect !== Math.floor(this.expect))
      throw new Error('invalid expected size: ' + this.expect)
  }

  write (chunk, encoding, cb) {
    const buffer = Buffer.isBuffer(chunk) ? chunk
      : typeof chunk === 'string' ?
        Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8')
      : chunk

    if (!Buffer.isBuffer(buffer)) {
      this.emit('error', new TypeError(`${
        this.constructor.name
      } streams only work with string and buffer data`))
      return false
    }

    this.found += buffer.length
    if (this.found > this.expect)
      this.emit('error', new SizeError(this.found, this.expect))

    return super.write(chunk, encoding, cb)
  }

  emit (ev, ...data) {
    if (ev === 'end') {
      if (this.found !== this.expect)
        this.emit('error', new SizeError(this.found, this.expect))
    }
    return super.emit(ev, ...data)
  }
}

MinipassSized.SizeError = SizeError

module.exports = MinipassSized
