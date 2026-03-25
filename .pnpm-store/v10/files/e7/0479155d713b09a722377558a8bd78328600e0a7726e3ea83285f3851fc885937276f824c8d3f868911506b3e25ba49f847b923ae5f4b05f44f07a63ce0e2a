'use strict'
const Minipass = require('minipass')
const MinipassSized = require('minipass-sized')

const Blob = require('./blob.js')
const {BUFFER} = Blob
const FetchError = require('./fetch-error.js')

// optional dependency on 'encoding'
let convert
try {
  convert = require('encoding').convert
} catch (e) {}

const INTERNALS = Symbol('Body internals')
const CONSUME_BODY = Symbol('consumeBody')

class Body {
  constructor (bodyArg, options = {}) {
    const { size = 0, timeout = 0 } = options
    const body = bodyArg === undefined || bodyArg === null ? null
      : isURLSearchParams(bodyArg) ? Buffer.from(bodyArg.toString())
      : isBlob(bodyArg) ? bodyArg
      : Buffer.isBuffer(bodyArg) ? bodyArg
      : Object.prototype.toString.call(bodyArg) === '[object ArrayBuffer]'
        ? Buffer.from(bodyArg)
      : ArrayBuffer.isView(bodyArg)
        ? Buffer.from(bodyArg.buffer, bodyArg.byteOffset, bodyArg.byteLength)
      : Minipass.isStream(bodyArg) ? bodyArg
      : Buffer.from(String(bodyArg))

    this[INTERNALS] = {
      body,
      disturbed: false,
      error: null,
    }

    this.size = size
    this.timeout = timeout

    if (Minipass.isStream(body)) {
      body.on('error', er => {
        const error = er.name === 'AbortError' ? er
          : new FetchError(`Invalid response while trying to fetch ${
            this.url}: ${er.message}`, 'system', er)
        this[INTERNALS].error = error
      })
    }
  }

  get body () {
    return this[INTERNALS].body
  }

  get bodyUsed () {
    return this[INTERNALS].disturbed
  }

  arrayBuffer () {
    return this[CONSUME_BODY]().then(buf =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  }

  blob () {
    const ct = this.headers && this.headers.get('content-type') || ''
    return this[CONSUME_BODY]().then(buf => Object.assign(
      new Blob([], { type: ct.toLowerCase() }),
      { [BUFFER]: buf }
    ))
  }

  json () {
    return this[CONSUME_BODY]().then(buf => {
      try {
        return JSON.parse(buf.toString())
      } catch (er) {
        return Promise.reject(new FetchError(
          `invalid json response body at ${
            this.url} reason: ${er.message}`, 'invalid-json'))
      }
    })
  }

  text () {
    return this[CONSUME_BODY]().then(buf => buf.toString())
  }

  buffer () {
    return this[CONSUME_BODY]()
  }

  textConverted () {
    return this[CONSUME_BODY]().then(buf => convertBody(buf, this.headers))
  }

  [CONSUME_BODY] () {
    if (this[INTERNALS].disturbed)
      return Promise.reject(new TypeError(`body used already for: ${
        this.url}`))

    this[INTERNALS].disturbed = true

    if (this[INTERNALS].error)
      return Promise.reject(this[INTERNALS].error)

    // body is null
    if (this.body === null) {
      return Promise.resolve(Buffer.alloc(0))
    }

    if (Buffer.isBuffer(this.body))
      return Promise.resolve(this.body)

    const upstream = isBlob(this.body) ? this.body.stream() : this.body

    /* istanbul ignore if: should never happen */
    if (!Minipass.isStream(upstream))
      return Promise.resolve(Buffer.alloc(0))

    const stream = this.size && upstream instanceof MinipassSized ? upstream
      : !this.size && upstream instanceof Minipass &&
        !(upstream instanceof MinipassSized) ? upstream
      : this.size ? new MinipassSized({ size: this.size })
      : new Minipass()

    // allow timeout on slow response body
    const resTimeout = this.timeout ? setTimeout(() => {
      stream.emit('error', new FetchError(
        `Response timeout while trying to fetch ${
          this.url} (over ${this.timeout}ms)`, 'body-timeout'))
    }, this.timeout) : null

    // do not keep the process open just for this timeout, even
    // though we expect it'll get cleared eventually.
    if (resTimeout) {
      resTimeout.unref()
    }

    // do the pipe in the promise, because the pipe() can send too much
    // data through right away and upset the MP Sized object
    return new Promise((resolve, reject) => {
      // if the stream is some other kind of stream, then pipe through a MP
      // so we can collect it more easily.
      if (stream !== upstream) {
        upstream.on('error', er => stream.emit('error', er))
        upstream.pipe(stream)
      }
      resolve()
    }).then(() => stream.concat()).then(buf => {
      clearTimeout(resTimeout)
      return buf
    }).catch(er => {
      clearTimeout(resTimeout)
      // request was aborted, reject with this Error
      if (er.name === 'AbortError' || er.name === 'FetchError')
        throw er
      else if (er.name === 'RangeError')
        throw new FetchError(`Could not create Buffer from response body for ${
          this.url}: ${er.message}`, 'system', er)
      else
        // other errors, such as incorrect content-encoding or content-length
        throw new FetchError(`Invalid response body while trying to fetch ${
          this.url}: ${er.message}`, 'system', er)
    })
  }

  static clone (instance) {
    if (instance.bodyUsed)
      throw new Error('cannot clone body after it is used')

    const body = instance.body

    // check that body is a stream and not form-data object
    // NB: can't clone the form-data object without having it as a dependency
    if (Minipass.isStream(body) && typeof body.getBoundary !== 'function') {
      // create a dedicated tee stream so that we don't lose data
      // potentially sitting in the body stream's buffer by writing it
      // immediately to p1 and not having it for p2.
      const tee = new Minipass()
      const p1 = new Minipass()
      const p2 = new Minipass()
      tee.on('error', er => {
        p1.emit('error', er)
        p2.emit('error', er)
      })
      body.on('error', er => tee.emit('error', er))
      tee.pipe(p1)
      tee.pipe(p2)
      body.pipe(tee)
      // set instance body to one fork, return the other
      instance[INTERNALS].body = p1
      return p2
    } else
      return instance.body
  }

  static extractContentType (body) {
    return body === null || body === undefined ? null
      : typeof body === 'string' ? 'text/plain;charset=UTF-8'
      : isURLSearchParams(body)
        ? 'application/x-www-form-urlencoded;charset=UTF-8'
      : isBlob(body) ? body.type || null
      : Buffer.isBuffer(body) ? null
      : Object.prototype.toString.call(body) === '[object ArrayBuffer]' ? null
      : ArrayBuffer.isView(body) ? null
      : typeof body.getBoundary === 'function'
        ? `multipart/form-data;boundary=${body.getBoundary()}`
      : Minipass.isStream(body) ? null
      : 'text/plain;charset=UTF-8'
  }

  static getTotalBytes (instance) {
    const {body} = instance
    return (body === null || body === undefined) ? 0
    : isBlob(body) ? body.size
    : Buffer.isBuffer(body) ? body.length
    : body && typeof body.getLengthSync === 'function' && (
        // detect form data input from form-data module
        body._lengthRetrievers &&
        /* istanbul ignore next */ body._lengthRetrievers.length == 0 || // 1.x
        body.hasKnownLength && body.hasKnownLength()) // 2.x
      ? body.getLengthSync()
    : null
  }

  static writeToStream (dest, instance) {
    const {body} = instance

    if (body === null || body === undefined)
      dest.end()
    else if (Buffer.isBuffer(body) || typeof body === 'string')
      dest.end(body)
    else {
      // body is stream or blob
      const stream = isBlob(body) ? body.stream() : body
      stream.on('error', er => dest.emit('error', er)).pipe(dest)
    }

    return dest
  }
}

Object.defineProperties(Body.prototype, {
  body: { enumerable: true },
  bodyUsed: { enumerable: true },
  arrayBuffer: { enumerable: true },
  blob: { enumerable: true },
  json: { enumerable: true },
  text: { enumerable: true }
})


const isURLSearchParams = obj =>
  // Duck-typing as a necessary condition.
  (typeof obj !== 'object' ||
    typeof obj.append !== 'function' ||
    typeof obj.delete !== 'function' ||
    typeof obj.get !== 'function' ||
    typeof obj.getAll !== 'function' ||
    typeof obj.has !== 'function' ||
    typeof obj.set !== 'function') ? false
  // Brand-checking and more duck-typing as optional condition.
  : obj.constructor.name === 'URLSearchParams' ||
    Object.prototype.toString.call(obj) === '[object URLSearchParams]' ||
    typeof obj.sort === 'function'

const isBlob = obj =>
  typeof obj === 'object' &&
  typeof obj.arrayBuffer === 'function' &&
  typeof obj.type === 'string' &&
  typeof obj.stream === 'function' &&
  typeof obj.constructor === 'function' &&
  typeof obj.constructor.name === 'string' &&
  /^(Blob|File)$/.test(obj.constructor.name) &&
  /^(Blob|File)$/.test(obj[Symbol.toStringTag])


const convertBody = (buffer, headers) => {
  /* istanbul ignore if */
  if (typeof convert !== 'function')
    throw new Error('The package `encoding` must be installed to use the textConverted() function')

  const ct = headers && headers.get('content-type')
  let charset = 'utf-8'
  let res, str

  // header
  if (ct)
    res = /charset=([^;]*)/i.exec(ct)

  // no charset in content type, peek at response body for at most 1024 bytes
  str = buffer.slice(0, 1024).toString()

  // html5
  if (!res && str)
    res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str)

  // html4
  if (!res && str) {
    res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str)

    if (!res) {
      res = /<meta[\s]+?content=(['"])(.+?)\1[\s]+?http-equiv=(['"])content-type\3/i.exec(str)
      if (res)
        res.pop() // drop last quote
    }

    if (res)
      res = /charset=(.*)/i.exec(res.pop())
  }

  // xml
  if (!res && str)
    res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str)

  // found charset
  if (res) {
    charset = res.pop()

    // prevent decode issues when sites use incorrect encoding
    // ref: https://hsivonen.fi/encoding-menu/
    if (charset === 'gb2312' || charset === 'gbk')
      charset = 'gb18030'
  }

  // turn raw buffers into a single utf-8 buffer
  return convert(
    buffer,
    'UTF-8',
    charset
  ).toString()
}

module.exports = Body
