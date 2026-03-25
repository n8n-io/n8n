'use strict'
const http = require('http')
const { STATUS_CODES } = http

const Headers = require('./headers.js')
const Body = require('./body.js')
const { clone, extractContentType } = Body

const INTERNALS = Symbol('Response internals')

class Response extends Body {
  constructor (body = null, opts = {}) {
    super(body, opts)

    const status = opts.status || 200
    const headers = new Headers(opts.headers)

    if (body !== null && body !== undefined && !headers.has('Content-Type')) {
      const contentType = extractContentType(body)
      if (contentType)
        headers.append('Content-Type', contentType)
    }

    this[INTERNALS] = {
      url: opts.url,
      status,
      statusText: opts.statusText || STATUS_CODES[status],
      headers,
      counter: opts.counter,
      trailer: Promise.resolve(opts.trailer || new Headers()),
    }
  }

  get trailer () {
    return this[INTERNALS].trailer
  }

  get url () {
    return this[INTERNALS].url || ''
  }

  get status () {
    return this[INTERNALS].status
  }

  get ok ()  {
    return this[INTERNALS].status >= 200 && this[INTERNALS].status < 300
  }

  get redirected () {
    return this[INTERNALS].counter > 0
  }

  get statusText () {
    return this[INTERNALS].statusText
  }

  get headers () {
    return this[INTERNALS].headers
  }

  clone () {
    return new Response(clone(this), {
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      ok: this.ok,
      redirected: this.redirected,
      trailer: this.trailer,
    })
  }

  get [Symbol.toStringTag] () {
    return 'Response'
  }
}

module.exports = Response

Object.defineProperties(Response.prototype, {
  url: { enumerable: true },
  status: { enumerable: true },
  ok: { enumerable: true },
  redirected: { enumerable: true },
  statusText: { enumerable: true },
  headers: { enumerable: true },
  clone: { enumerable: true },
})
