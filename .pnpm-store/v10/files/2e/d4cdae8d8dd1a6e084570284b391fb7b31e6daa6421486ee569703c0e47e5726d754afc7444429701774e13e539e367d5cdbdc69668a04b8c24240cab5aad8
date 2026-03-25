'use strict'

const {
  InvalidArgumentError,
  NotSupportedError
} = require('./errors')
const assert = require('assert')
const { kHTTP2BuildRequest, kHTTP2CopyHeaders, kHTTP1BuildRequest } = require('./symbols')
const util = require('./util')

// tokenRegExp and headerCharRegex have been lifted from
// https://github.com/nodejs/node/blob/main/lib/_http_common.js

/**
 * Verifies that the given val is a valid HTTP token
 * per the rules defined in RFC 7230
 * See https://tools.ietf.org/html/rfc7230#section-3.2.6
 */
const tokenRegExp = /^[\^_`a-zA-Z\-0-9!#$%&'*+.|~]+$/

/**
 * Matches if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 */
const headerCharRegex = /[^\t\x20-\x7e\x80-\xff]/

// Verifies that a given path is valid does not contain control chars \x00 to \x20
const invalidPathRegex = /[^\u0021-\u00ff]/

const kHandler = Symbol('handler')

const channels = {}

let extractBody

try {
  const diagnosticsChannel = require('diagnostics_channel')
  channels.create = diagnosticsChannel.channel('undici:request:create')
  channels.bodySent = diagnosticsChannel.channel('undici:request:bodySent')
  channels.headers = diagnosticsChannel.channel('undici:request:headers')
  channels.trailers = diagnosticsChannel.channel('undici:request:trailers')
  channels.error = diagnosticsChannel.channel('undici:request:error')
} catch {
  channels.create = { hasSubscribers: false }
  channels.bodySent = { hasSubscribers: false }
  channels.headers = { hasSubscribers: false }
  channels.trailers = { hasSubscribers: false }
  channels.error = { hasSubscribers: false }
}

class Request {
  constructor (origin, {
    path,
    method,
    body,
    headers,
    query,
    idempotent,
    blocking,
    upgrade,
    headersTimeout,
    bodyTimeout,
    reset,
    throwOnError,
    expectContinue
  }, handler) {
    if (typeof path !== 'string') {
      throw new InvalidArgumentError('path must be a string')
    } else if (
      path[0] !== '/' &&
      !(path.startsWith('http://') || path.startsWith('https://')) &&
      method !== 'CONNECT'
    ) {
      throw new InvalidArgumentError('path must be an absolute URL or start with a slash')
    } else if (invalidPathRegex.exec(path) !== null) {
      throw new InvalidArgumentError('invalid request path')
    }

    if (typeof method !== 'string') {
      throw new InvalidArgumentError('method must be a string')
    } else if (tokenRegExp.exec(method) === null) {
      throw new InvalidArgumentError('invalid request method')
    }

    if (upgrade && typeof upgrade !== 'string') {
      throw new InvalidArgumentError('upgrade must be a string')
    }

    if (headersTimeout != null && (!Number.isFinite(headersTimeout) || headersTimeout < 0)) {
      throw new InvalidArgumentError('invalid headersTimeout')
    }

    if (bodyTimeout != null && (!Number.isFinite(bodyTimeout) || bodyTimeout < 0)) {
      throw new InvalidArgumentError('invalid bodyTimeout')
    }

    if (reset != null && typeof reset !== 'boolean') {
      throw new InvalidArgumentError('invalid reset')
    }

    if (expectContinue != null && typeof expectContinue !== 'boolean') {
      throw new InvalidArgumentError('invalid expectContinue')
    }

    this.headersTimeout = headersTimeout

    this.bodyTimeout = bodyTimeout

    this.throwOnError = throwOnError === true

    this.method = method

    this.abort = null

    if (body == null) {
      this.body = null
    } else if (util.isStream(body)) {
      this.body = body

      const rState = this.body._readableState
      if (!rState || !rState.autoDestroy) {
        this.endHandler = function autoDestroy () {
          util.destroy(this)
        }
        this.body.on('end', this.endHandler)
      }

      this.errorHandler = err => {
        if (this.abort) {
          this.abort(err)
        } else {
          this.error = err
        }
      }
      this.body.on('error', this.errorHandler)
    } else if (util.isBuffer(body)) {
      this.body = body.byteLength ? body : null
    } else if (ArrayBuffer.isView(body)) {
      this.body = body.buffer.byteLength ? Buffer.from(body.buffer, body.byteOffset, body.byteLength) : null
    } else if (body instanceof ArrayBuffer) {
      this.body = body.byteLength ? Buffer.from(body) : null
    } else if (typeof body === 'string') {
      this.body = body.length ? Buffer.from(body) : null
    } else if (util.isFormDataLike(body) || util.isIterable(body) || util.isBlobLike(body)) {
      this.body = body
    } else {
      throw new InvalidArgumentError('body must be a string, a Buffer, a Readable stream, an iterable, or an async iterable')
    }

    this.completed = false

    this.aborted = false

    this.upgrade = upgrade || null

    this.path = query ? util.buildURL(path, query) : path

    this.origin = origin

    this.idempotent = idempotent == null
      ? method === 'HEAD' || method === 'GET'
      : idempotent

    this.blocking = blocking == null ? false : blocking

    this.reset = reset == null ? null : reset

    this.host = null

    this.contentLength = null

    this.contentType = null

    this.headers = ''

    // Only for H2
    this.expectContinue = expectContinue != null ? expectContinue : false

    if (Array.isArray(headers)) {
      if (headers.length % 2 !== 0) {
        throw new InvalidArgumentError('headers array must be even')
      }
      for (let i = 0; i < headers.length; i += 2) {
        processHeader(this, headers[i], headers[i + 1])
      }
    } else if (headers && typeof headers === 'object') {
      const keys = Object.keys(headers)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        processHeader(this, key, headers[key])
      }
    } else if (headers != null) {
      throw new InvalidArgumentError('headers must be an object or an array')
    }

    if (util.isFormDataLike(this.body)) {
      if (util.nodeMajor < 16 || (util.nodeMajor === 16 && util.nodeMinor < 8)) {
        throw new InvalidArgumentError('Form-Data bodies are only supported in node v16.8 and newer.')
      }

      if (!extractBody) {
        extractBody = require('../fetch/body.js').extractBody
      }

      const [bodyStream, contentType] = extractBody(body)
      if (this.contentType == null) {
        this.contentType = contentType
        this.headers += `content-type: ${contentType}\r\n`
      }
      this.body = bodyStream.stream
      this.contentLength = bodyStream.length
    } else if (util.isBlobLike(body) && this.contentType == null && body.type) {
      this.contentType = body.type
      this.headers += `content-type: ${body.type}\r\n`
    }

    util.validateHandler(handler, method, upgrade)

    this.servername = util.getServerName(this.host)

    this[kHandler] = handler

    if (channels.create.hasSubscribers) {
      channels.create.publish({ request: this })
    }
  }

  onBodySent (chunk) {
    if (this[kHandler].onBodySent) {
      try {
        return this[kHandler].onBodySent(chunk)
      } catch (err) {
        this.abort(err)
      }
    }
  }

  onRequestSent () {
    if (channels.bodySent.hasSubscribers) {
      channels.bodySent.publish({ request: this })
    }

    if (this[kHandler].onRequestSent) {
      try {
        return this[kHandler].onRequestSent()
      } catch (err) {
        this.abort(err)
      }
    }
  }

  onConnect (abort) {
    assert(!this.aborted)
    assert(!this.completed)

    if (this.error) {
      abort(this.error)
    } else {
      this.abort = abort
      return this[kHandler].onConnect(abort)
    }
  }

  onHeaders (statusCode, headers, resume, statusText) {
    assert(!this.aborted)
    assert(!this.completed)

    if (channels.headers.hasSubscribers) {
      channels.headers.publish({ request: this, response: { statusCode, headers, statusText } })
    }

    try {
      return this[kHandler].onHeaders(statusCode, headers, resume, statusText)
    } catch (err) {
      this.abort(err)
    }
  }

  onData (chunk) {
    assert(!this.aborted)
    assert(!this.completed)

    try {
      return this[kHandler].onData(chunk)
    } catch (err) {
      this.abort(err)
      return false
    }
  }

  onUpgrade (statusCode, headers, socket) {
    assert(!this.aborted)
    assert(!this.completed)

    return this[kHandler].onUpgrade(statusCode, headers, socket)
  }

  onComplete (trailers) {
    this.onFinally()

    assert(!this.aborted)

    this.completed = true
    if (channels.trailers.hasSubscribers) {
      channels.trailers.publish({ request: this, trailers })
    }

    try {
      return this[kHandler].onComplete(trailers)
    } catch (err) {
      // TODO (fix): This might be a bad idea?
      this.onError(err)
    }
  }

  onError (error) {
    this.onFinally()

    if (channels.error.hasSubscribers) {
      channels.error.publish({ request: this, error })
    }

    if (this.aborted) {
      return
    }
    this.aborted = true

    return this[kHandler].onError(error)
  }

  onFinally () {
    if (this.errorHandler) {
      this.body.off('error', this.errorHandler)
      this.errorHandler = null
    }

    if (this.endHandler) {
      this.body.off('end', this.endHandler)
      this.endHandler = null
    }
  }

  // TODO: adjust to support H2
  addHeader (key, value) {
    processHeader(this, key, value)
    return this
  }

  static [kHTTP1BuildRequest] (origin, opts, handler) {
    // TODO: Migrate header parsing here, to make Requests
    // HTTP agnostic
    return new Request(origin, opts, handler)
  }

  static [kHTTP2BuildRequest] (origin, opts, handler) {
    const headers = opts.headers
    opts = { ...opts, headers: null }

    const request = new Request(origin, opts, handler)

    request.headers = {}

    if (Array.isArray(headers)) {
      if (headers.length % 2 !== 0) {
        throw new InvalidArgumentError('headers array must be even')
      }
      for (let i = 0; i < headers.length; i += 2) {
        processHeader(request, headers[i], headers[i + 1], true)
      }
    } else if (headers && typeof headers === 'object') {
      const keys = Object.keys(headers)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        processHeader(request, key, headers[key], true)
      }
    } else if (headers != null) {
      throw new InvalidArgumentError('headers must be an object or an array')
    }

    return request
  }

  static [kHTTP2CopyHeaders] (raw) {
    const rawHeaders = raw.split('\r\n')
    const headers = {}

    for (const header of rawHeaders) {
      const [key, value] = header.split(': ')

      if (value == null || value.length === 0) continue

      if (headers[key]) headers[key] += `,${value}`
      else headers[key] = value
    }

    return headers
  }
}

function processHeaderValue (key, val, skipAppend) {
  if (val && typeof val === 'object') {
    throw new InvalidArgumentError(`invalid ${key} header`)
  }

  val = val != null ? `${val}` : ''

  if (headerCharRegex.exec(val) !== null) {
    throw new InvalidArgumentError(`invalid ${key} header`)
  }

  return skipAppend ? val : `${key}: ${val}\r\n`
}

function processHeader (request, key, val, skipAppend = false) {
  if (val && (typeof val === 'object' && !Array.isArray(val))) {
    throw new InvalidArgumentError(`invalid ${key} header`)
  } else if (val === undefined) {
    return
  }

  if (
    request.host === null &&
    key.length === 4 &&
    key.toLowerCase() === 'host'
  ) {
    if (headerCharRegex.exec(val) !== null) {
      throw new InvalidArgumentError(`invalid ${key} header`)
    }
    // Consumed by Client
    request.host = val
  } else if (
    request.contentLength === null &&
    key.length === 14 &&
    key.toLowerCase() === 'content-length'
  ) {
    request.contentLength = parseInt(val, 10)
    if (!Number.isFinite(request.contentLength)) {
      throw new InvalidArgumentError('invalid content-length header')
    }
  } else if (
    request.contentType === null &&
    key.length === 12 &&
    key.toLowerCase() === 'content-type'
  ) {
    request.contentType = val
    if (skipAppend) request.headers[key] = processHeaderValue(key, val, skipAppend)
    else request.headers += processHeaderValue(key, val)
  } else if (
    key.length === 17 &&
    key.toLowerCase() === 'transfer-encoding'
  ) {
    throw new InvalidArgumentError('invalid transfer-encoding header')
  } else if (
    key.length === 10 &&
    key.toLowerCase() === 'connection'
  ) {
    const value = typeof val === 'string' ? val.toLowerCase() : null
    if (value !== 'close' && value !== 'keep-alive') {
      throw new InvalidArgumentError('invalid connection header')
    } else if (value === 'close') {
      request.reset = true
    }
  } else if (
    key.length === 10 &&
    key.toLowerCase() === 'keep-alive'
  ) {
    throw new InvalidArgumentError('invalid keep-alive header')
  } else if (
    key.length === 7 &&
    key.toLowerCase() === 'upgrade'
  ) {
    throw new InvalidArgumentError('invalid upgrade header')
  } else if (
    key.length === 6 &&
    key.toLowerCase() === 'expect'
  ) {
    throw new NotSupportedError('expect header not supported')
  } else if (tokenRegExp.exec(key) === null) {
    throw new InvalidArgumentError('invalid header key')
  } else {
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        if (skipAppend) {
          if (request.headers[key]) request.headers[key] += `,${processHeaderValue(key, val[i], skipAppend)}`
          else request.headers[key] = processHeaderValue(key, val[i], skipAppend)
        } else {
          request.headers += processHeaderValue(key, val[i])
        }
      }
    } else {
      if (skipAppend) request.headers[key] = processHeaderValue(key, val, skipAppend)
      else request.headers += processHeaderValue(key, val)
    }
  }
}

module.exports = Request
