const Minipass = require('minipass')
const _data = Symbol('_data')
const _length = Symbol('_length')
class Collect extends Minipass {
  constructor (options) {
    super(options)
    this[_data] = []
    this[_length] = 0
  }
  write (chunk, encoding, cb) {
    if (typeof encoding === 'function')
      cb = encoding, encoding = 'utf8'

    if (!encoding)
      encoding = 'utf8'

    const c = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
    this[_data].push(c)
    this[_length] += c.length
    if (cb)
      cb()
    return true
  }
  end (chunk, encoding, cb) {
    if (typeof chunk === 'function')
      cb = chunk, chunk = null
    if (typeof encoding === 'function')
      cb = encoding, encoding = 'utf8'
    if (chunk)
      this.write(chunk, encoding)
    const result = Buffer.concat(this[_data], this[_length])
    super.write(result)
    return super.end(cb)
  }
}
module.exports = Collect

// it would be possible to DRY this a bit by doing something like
// this.collector = new Collect() and listening on its data event,
// but it's not much code, and we may as well save the extra obj
class CollectPassThrough extends Minipass {
  constructor (options) {
    super(options)
    this[_data] = []
    this[_length] = 0
  }
  write (chunk, encoding, cb) {
    if (typeof encoding === 'function')
      cb = encoding, encoding = 'utf8'

    if (!encoding)
      encoding = 'utf8'

    const c = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
    this[_data].push(c)
    this[_length] += c.length
    return super.write(chunk, encoding, cb)
  }
  end (chunk, encoding, cb) {
    if (typeof chunk === 'function')
      cb = chunk, chunk = null
    if (typeof encoding === 'function')
      cb = encoding, encoding = 'utf8'
    if (chunk)
      this.write(chunk, encoding)
    const result = Buffer.concat(this[_data], this[_length])
    this.emit('collect', result)
    return super.end(cb)
  }
}
module.exports.PassThrough = CollectPassThrough
