'use strict'

const util = require('../core/util')
const { kBodyUsed } = require('../core/symbols')
const assert = require('node:assert')
const { InvalidArgumentError } = require('../core/errors')
const EE = require('node:events')

const redirectableStatusCodes = [300, 301, 302, 303, 307, 308]

const kBody = Symbol('body')

const noop = () => {}

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
  static buildDispatch (dispatcher, maxRedirections) {
    if (maxRedirections != null && (!Number.isInteger(maxRedirections) || maxRedirections < 0)) {
      throw new InvalidArgumentError('maxRedirections must be a positive number')
    }

    const dispatch = dispatcher.dispatch.bind(dispatcher)
    return (opts, originalHandler) => dispatch(opts, new RedirectHandler(dispatch, maxRedirections, opts, originalHandler))
  }

  constructor (dispatch, maxRedirections, opts, handler) {
    if (maxRedirections != null && (!Number.isInteger(maxRedirections) || maxRedirections < 0)) {
      throw new InvalidArgumentError('maxRedirections must be a positive number')
    }

    this.dispatch = dispatch
    this.location = null
    const { maxRedirections: _, ...cleanOpts } = opts
    this.opts = cleanOpts // opts must be a copy, exclude maxRedirections
    this.maxRedirections = maxRedirections
    this.handler = handler
    this.history = []

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
      util.isIterable(this.opts.body) &&
      !util.isFormDataLike(this.opts.body)
    ) {
      // TODO: Should we allow re-using iterable if !this.opts.idempotent
      // or through some other flag?
      this.opts.body = new BodyAsyncIterable(this.opts.body)
    }
  }

  onRequestStart (controller, context) {
    this.handler.onRequestStart?.(controller, { ...context, history: this.history })
  }

  onRequestUpgrade (controller, statusCode, headers, socket) {
    this.handler.onRequestUpgrade?.(controller, statusCode, headers, socket)
  }

  onResponseStart (controller, statusCode, headers, statusMessage) {
    if (this.opts.throwOnMaxRedirect && this.history.length >= this.maxRedirections) {
      throw new Error('max redirects')
    }

    // https://tools.ietf.org/html/rfc7231#section-6.4.2
    // https://fetch.spec.whatwg.org/#http-redirect-fetch
    // In case of HTTP 301 or 302 with POST, change the method to GET
    if ((statusCode === 301 || statusCode === 302) && this.opts.method === 'POST') {
      this.opts.method = 'GET'
      if (util.isStream(this.opts.body)) {
        util.destroy(this.opts.body.on('error', noop))
      }
      this.opts.body = null
    }

    // https://tools.ietf.org/html/rfc7231#section-6.4.4
    // In case of HTTP 303, always replace method to be either HEAD or GET
    if (statusCode === 303 && this.opts.method !== 'HEAD') {
      this.opts.method = 'GET'
      if (util.isStream(this.opts.body)) {
        util.destroy(this.opts.body.on('error', noop))
      }
      this.opts.body = null
    }

    this.location = this.history.length >= this.maxRedirections || util.isDisturbed(this.opts.body) || redirectableStatusCodes.indexOf(statusCode) === -1
      ? null
      : headers.location

    if (this.opts.origin) {
      this.history.push(new URL(this.opts.path, this.opts.origin))
    }

    if (!this.location) {
      this.handler.onResponseStart?.(controller, statusCode, headers, statusMessage)
      return
    }

    const { origin, pathname, search } = util.parseURL(new URL(this.location, this.opts.origin && new URL(this.opts.path, this.opts.origin)))
    const path = search ? `${pathname}${search}` : pathname

    // Check for redirect loops by seeing if we've already visited this URL in our history
    // This catches the case where Client/Pool try to handle cross-origin redirects but fail
    // and keep redirecting to the same URL in an infinite loop
    const redirectUrlString = `${origin}${path}`
    for (const historyUrl of this.history) {
      if (historyUrl.toString() === redirectUrlString) {
        throw new InvalidArgumentError(`Redirect loop detected. Cannot redirect to ${origin}. This typically happens when using a Client or Pool with cross-origin redirects. Use an Agent for cross-origin redirects.`)
      }
    }

    // Remove headers referring to the original URL.
    // By default it is Host only, unless it's a 303 (see below), which removes also all Content-* headers.
    // https://tools.ietf.org/html/rfc7231#section-6.4
    this.opts.headers = cleanRequestHeaders(this.opts.headers, statusCode === 303, this.opts.origin !== origin)
    this.opts.path = path
    this.opts.origin = origin
    this.opts.query = null
  }

  onResponseData (controller, chunk) {
    if (this.location) {
      /*
        https://tools.ietf.org/html/rfc7231#section-6.4

        TLDR: undici always ignores 3xx response bodies.

        Redirection is used to serve the requested resource from another URL, so it assumes that
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
      this.handler.onResponseData?.(controller, chunk)
    }
  }

  onResponseEnd (controller, trailers) {
    if (this.location) {
      /*
        https://tools.ietf.org/html/rfc7231#section-6.4

        TLDR: undici always ignores 3xx response trailers as they are not expected in case of redirections
        and neither are useful if present.

        See comment on onData method above for more detailed information.
      */
      this.dispatch(this.opts, this)
    } else {
      this.handler.onResponseEnd(controller, trailers)
    }
  }

  onResponseError (controller, error) {
    this.handler.onResponseError?.(controller, error)
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
    const entries = typeof headers[Symbol.iterator] === 'function' ? headers : Object.entries(headers)
    for (const [key, value] of entries) {
      if (!shouldRemoveHeader(key, removeContent, unknownOrigin)) {
        ret.push(key, value)
      }
    }
  } else {
    assert(headers == null, 'headers must be an object or an array')
  }
  return ret
}

module.exports = RedirectHandler
