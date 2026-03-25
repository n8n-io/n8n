'use strict'

const util = require('../core/util')
const { kBodyUsed } = require('../core/symbols')
const assert = require('node:assert')
const { InvalidArgumentError } = require('../core/errors')
const EE = require('node:events')

const redirectableStatusCodes = [300, 301, 302, 303, 307, 308]

const kBody = Symbol('body')

class BodyAsyncIterable {
  constructor (body) {
    this[kBody] = body
    this[kBodyUsed] = false
  }

  async * [Symbol.asyncIterator] () {
    assert(!this[kBodyUsed], 'disturbed')
    this[kBodyUsed] = true
    yield * this[kBody]
  }
}

class RedirectHandler {
  constructor (dispatch, maxRedirections, opts, handler) {
    if (maxRedirections != null && (!Number.isInteger(maxRedirections) || maxRedirections < 0)) {
      throw new InvalidArgumentError('maxRedirections must be a positive number')
    }

    util.validateHandler(handler, opts.method, opts.upgrade)

    this.dispatch = dispatch
    this.location = null
    this.abort = null
    this.opts = { ...opts, maxRedirections: 0 } // opts must be a copy
    this.maxRedirections = maxRedirections
    this.handler = handler
    this.history = []
    this.redirectionLimitReached = false

    if (util.isStream(this.opts.body)) {
      // TODO (fix): Provide some way for the user to cache the file to e.g. /tmp
      // so that it can be dispatched again?
      // TODO (fix): Do we need 100-expect support to provide a way to do this properly?
      if (util.bodyLength(this.opts.body) === 0) {
        this.opts.body
          .on('data', function () {
            assert(false)
          })
      }

      if (typeof this.opts.body.readableDidRead !== 'boolean') {
        this.opts.body[kBodyUsed] = false
        EE.prototype.on.call(this.opts.body, 'data', function () {
          this[kBodyUsed] = true
        })
      }
    } else if (this.opts.body && typeof this.opts.body.pipeTo === 'function') {
      // TODO (fix): We can't access ReadableStream internal state
      // to determine whether or not it has been disturbed. This is just
      // a workaround.
      this.opts.body = new BodyAsyncIterable(this.opts.body)
    } else if (
      this.opts.body &&
      typeof this.opts.body !== 'string' &&
      !ArrayBuffer.isView(this.opts.body) &&
      util.isIterable(this.opts.body)
    ) {
      // TODO: Should we allow re-using iterable if !this.opts.idempotent
      // or through some other flag?
      this.opts.body = new BodyAsyncIterable(this.opts.body)
    }
  }

  onConnect (abort) {
    this.abort = abort
    this.handler.onConnect(abort, { history: this.history })
  }

  onUpgrade (statusCode, headers, socket) {
    this.handler.onUpgrade(statusCode, headers, socket)
  }

  onError (error) {
    this.handler.onError(error)
  }

  onHeaders (statusCode, headers, resume, statusText) {
    this.location = this.history.length >= this.maxRedirections || util.isDisturbed(this.opts.body)
      ? null
      : parseLocation(statusCode, headers)

    if (this.opts.throwOnMaxRedirect && this.history.length >= this.maxRedirections) {
      if (this.request) {
        this.request.abort(new Error('max redirects'))
      }

      this.redirectionLimitReached = true
      this.abort(new Error('max redirects'))
      return
    }

    if (this.opts.origin) {
      this.history.push(new URL(this.opts.path, this.opts.origin))
    }

    if (!this.location) {
      return this.handler.onHeaders(statusCode, headers, resume, statusText)
    }

    const { origin, pathname, search } = util.parseURL(new URL(this.location, this.opts.origin && new URL(this.opts.path, this.opts.origin)))
    const path = search ? `${pathname}${search}` : pathname

    // Remove headers referring to the original URL.
    // By default it is Host only, unless it's a 303 (see below), which removes also all Content-* headers.
    // https://tools.ietf.org/html/rfc7231#section-6.4
    this.opts.headers = cleanRequestHeaders(this.opts.headers, statusCode === 303, this.opts.origin !== origin)
    this.opts.path = path
    this.opts.origin = origin
    this.opts.maxRedirections = 0
    this.opts.query = null

    // https://tools.ietf.org/html/rfc7231#section-6.4.4
    // In case of HTTP 303, always replace method to be either HEAD or GET
    if (statusCode === 303 && this.opts.method !== 'HEAD') {
      this.opts.method = 'GET'
      this.opts.body = null
    }
  }

  onData (chunk) {
    if (this.location) {
      /*
        https://tools.ietf.org/html/rfc7231#section-6.4

        TLDR: undici always ignores 3xx response bodies.

        Redirection is used to serve the requested resource from another URL, so it is assumes that
        no body is generated (and thus can be ignored). Even though generating a body is not prohibited.

        For status 301, 302, 303, 307 and 308 (the latter from RFC 7238), the specs mention that the body usually
        (which means it's optional and not mandated) contain just an hyperlink to the value of
        the Location response header, so the body can be ignored safely.

        For status 300, which is "Multiple Choices", the spec mentions both generating a Location
        response header AND a response body with the other possible location to follow.
        Since the spec explicitly chooses not to specify a format for such body and leave it to
        servers and browsers implementors, we ignore the body as there is no specified way to eventually parse it.
      */
    } else {
      return this.handler.onData(chunk)
    }
  }

  onComplete (trailers) {
    if (this.location) {
      /*
        https://tools.ietf.org/html/rfc7231#section-6.4

        TLDR: undici always ignores 3xx response trailers as they are not expected in case of redirections
        and neither are useful if present.

        See comment on onData method above for more detailed information.
      */

      this.location = null
      this.abort = null

      this.dispatch(this.opts, this)
    } else {
      this.handler.onComplete(trailers)
    }
  }

  onBodySent (chunk) {
    if (this.handler.onBodySent) {
      this.handler.onBodySent(chunk)
    }
  }
}

function parseLocation (statusCode, headers) {
  if (redirectableStatusCodes.indexOf(statusCode) === -1) {
    return null
  }

  for (let i = 0; i < headers.length; i += 2) {
    if (headers[i].length === 8 && util.headerNameToString(headers[i]) === 'location') {
      return headers[i + 1]
    }
  }
}

// https://tools.ietf.org/html/rfc7231#section-6.4.4
function shouldRemoveHeader (header, removeContent, unknownOrigin) {
  if (header.length === 4) {
    return util.headerNameToString(header) === 'host'
  }
  if (removeContent && util.headerNameToString(header).startsWith('content-')) {
    return true
  }
  if (unknownOrigin && (header.length === 13 || header.length === 6 || header.length === 19)) {
    const name = util.headerNameToString(header)
    return name === 'authorization' || name === 'cookie' || name === 'proxy-authorization'
  }
  return false
}

// https://tools.ietf.org/html/rfc7231#section-6.4
function cleanRequestHeaders (headers, removeContent, unknownOrigin) {
  const ret = []
  if (Array.isArray(headers)) {
    for (let i = 0; i < headers.length; i += 2) {
      if (!shouldRemoveHeader(headers[i], removeContent, unknownOrigin)) {
        ret.push(headers[i], headers[i + 1])
      }
    }
  } else if (headers && typeof headers === 'object') {
    for (const key of Object.keys(headers)) {
      if (!shouldRemoveHeader(key, removeContent, unknownOrigin)) {
        ret.push(key, headers[key])
      }
    }
  } else {
    assert(headers == null, 'headers must be an object or an array')
  }
  return ret
}

module.exports = RedirectHandler
