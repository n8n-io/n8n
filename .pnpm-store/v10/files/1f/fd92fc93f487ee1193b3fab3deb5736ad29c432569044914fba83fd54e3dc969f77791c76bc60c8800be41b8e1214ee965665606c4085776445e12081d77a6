'use strict'
const Url = require('url')
const Minipass = require('minipass')
const Headers = require('./headers.js')
const { exportNodeCompatibleHeaders } = Headers
const Body = require('./body.js')
const { clone, extractContentType, getTotalBytes } = Body

const version = require('../package.json').version
const defaultUserAgent =
  `minipass-fetch/${version} (+https://github.com/isaacs/minipass-fetch)`

const INTERNALS = Symbol('Request internals')

const { parse: parseUrl, format: formatUrl } = Url

const isRequest = input =>
  typeof input === 'object' && typeof input[INTERNALS] === 'object'

const isAbortSignal = signal => {
  const proto = (
    signal
    && typeof signal === 'object'
    && Object.getPrototypeOf(signal)
  )
  return !!(proto && proto.constructor.name === 'AbortSignal')
}

class Request extends Body {
  constructor (input, init = {}) {
    const parsedURL = isRequest(input) ? Url.parse(input.url)
      : input && input.href ? Url.parse(input.href)
      : Url.parse(`${input}`)

    if (isRequest(input))
      init = { ...input[INTERNALS], ...init }
    else if (!input || typeof input === 'string')
      input = {}

    const method = (init.method || input.method || 'GET').toUpperCase()
    const isGETHEAD = method === 'GET' || method === 'HEAD'

    if ((init.body !== null && init.body !== undefined ||
        isRequest(input) && input.body !== null) && isGETHEAD)
      throw new TypeError('Request with GET/HEAD method cannot have body')

    const inputBody = init.body !== null && init.body !== undefined ? init.body
      : isRequest(input) && input.body !== null ? clone(input)
      : null

    super(inputBody, {
      timeout: init.timeout || input.timeout || 0,
      size: init.size || input.size || 0,
    })

    const headers = new Headers(init.headers || input.headers || {})

    if (inputBody !== null && inputBody !== undefined &&
        !headers.has('Content-Type')) {
      const contentType = extractContentType(inputBody)
      if (contentType)
        headers.append('Content-Type', contentType)
    }

    const signal = 'signal' in init ? init.signal
      : null

    if (signal !== null && signal !== undefined && !isAbortSignal(signal))
      throw new TypeError('Expected signal must be an instanceof AbortSignal')

    // TLS specific options that are handled by node
    const {
      ca,
      cert,
      ciphers,
      clientCertEngine,
      crl,
      dhparam,
      ecdhCurve,
      family,
      honorCipherOrder,
      key,
      passphrase,
      pfx,
      rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
      secureOptions,
      secureProtocol,
      servername,
      sessionIdContext,
    } = init

    this[INTERNALS] = {
      method,
      redirect: init.redirect || input.redirect || 'follow',
      headers,
      parsedURL,
      signal,
      ca,
      cert,
      ciphers,
      clientCertEngine,
      crl,
      dhparam,
      ecdhCurve,
      family,
      honorCipherOrder,
      key,
      passphrase,
      pfx,
      rejectUnauthorized,
      secureOptions,
      secureProtocol,
      servername,
      sessionIdContext,
    }

    // node-fetch-only options
    this.follow = init.follow !== undefined ? init.follow
      : input.follow !== undefined ? input.follow
      : 20
    this.compress = init.compress !== undefined ? init.compress
      : input.compress !== undefined ? input.compress
      : true
    this.counter = init.counter || input.counter || 0
    this.agent = init.agent || input.agent
  }

  get method() {
    return this[INTERNALS].method
  }

  get url() {
    return formatUrl(this[INTERNALS].parsedURL)
  }

  get headers() {
    return this[INTERNALS].headers
  }

  get redirect() {
    return this[INTERNALS].redirect
  }

  get signal() {
    return this[INTERNALS].signal
  }

  clone () {
    return new Request(this)
  }

  get [Symbol.toStringTag] () {
    return 'Request'
  }

  static getNodeRequestOptions (request) {
    const parsedURL = request[INTERNALS].parsedURL
    const headers = new Headers(request[INTERNALS].headers)

    // fetch step 1.3
    if (!headers.has('Accept'))
      headers.set('Accept', '*/*')

    // Basic fetch
    if (!parsedURL.protocol || !parsedURL.hostname)
      throw new TypeError('Only absolute URLs are supported')

    if (!/^https?:$/.test(parsedURL.protocol))
      throw new TypeError('Only HTTP(S) protocols are supported')

    if (request.signal &&
        Minipass.isStream(request.body) &&
        typeof request.body.destroy !== 'function') {
      throw new Error(
        'Cancellation of streamed requests with AbortSignal is not supported')
    }

    // HTTP-network-or-cache fetch steps 2.4-2.7
    const contentLengthValue =
      (request.body === null || request.body === undefined) &&
        /^(POST|PUT)$/i.test(request.method) ? '0'
      : request.body !== null && request.body !== undefined
        ? getTotalBytes(request)
      : null

    if (contentLengthValue)
      headers.set('Content-Length', contentLengthValue + '')

    // HTTP-network-or-cache fetch step 2.11
    if (!headers.has('User-Agent'))
      headers.set('User-Agent', defaultUserAgent)

    // HTTP-network-or-cache fetch step 2.15
    if (request.compress && !headers.has('Accept-Encoding'))
      headers.set('Accept-Encoding', 'gzip,deflate')

    const agent = typeof request.agent === 'function'
      ? request.agent(parsedURL)
      : request.agent

    if (!headers.has('Connection') && !agent)
      headers.set('Connection', 'close')

    // TLS specific options that are handled by node
    const {
      ca,
      cert,
      ciphers,
      clientCertEngine,
      crl,
      dhparam,
      ecdhCurve,
      family,
      honorCipherOrder,
      key,
      passphrase,
      pfx,
      rejectUnauthorized,
      secureOptions,
      secureProtocol,
      servername,
      sessionIdContext,
    } = request[INTERNALS]

    // HTTP-network fetch step 4.2
    // chunked encoding is handled by Node.js

    return {
      ...parsedURL,
      method: request.method,
      headers: exportNodeCompatibleHeaders(headers),
      agent,
      ca,
      cert,
      ciphers,
      clientCertEngine,
      crl,
      dhparam,
      ecdhCurve,
      family,
      honorCipherOrder,
      key,
      passphrase,
      pfx,
      rejectUnauthorized,
      secureOptions,
      secureProtocol,
      servername,
      sessionIdContext,
    }
  }
}

module.exports = Request

Object.defineProperties(Request.prototype, {
  method: { enumerable: true },
  url: { enumerable: true },
  headers: { enumerable: true },
  redirect: { enumerable: true },
  clone: { enumerable: true },
  signal: { enumerable: true },
})
