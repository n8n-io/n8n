'use strict'
const assert = require('node:assert')

const { kRetryHandlerDefaultRetry } = require('../core/symbols')
const { RequestRetryError } = require('../core/errors')
const {
  isDisturbed,
  parseHeaders,
  parseRangeHeader,
  wrapRequestBody
} = require('../core/util')

function calculateRetryAfterHeader (retryAfter) {
  const current = Date.now()
  return new Date(retryAfter).getTime() - current
}

class RetryHandler {
  constructor (opts, handlers) {
    const { retryOptions, ...dispatchOpts } = opts
    const {
      // Retry scoped
      retry: retryFn,
      maxRetries,
      maxTimeout,
      minTimeout,
      timeoutFactor,
      // Response scoped
      methods,
      errorCodes,
      retryAfter,
      statusCodes
    } = retryOptions ?? {}

    this.dispatch = handlers.dispatch
    this.handler = handlers.handler
    this.opts = { ...dispatchOpts, body: wrapRequestBody(opts.body) }
    this.abort = null
    this.aborted = false
    this.retryOpts = {
      retry: retryFn ?? RetryHandler[kRetryHandlerDefaultRetry],
      retryAfter: retryAfter ?? true,
      maxTimeout: maxTimeout ?? 30 * 1000, // 30s,
      minTimeout: minTimeout ?? 500, // .5s
      timeoutFactor: timeoutFactor ?? 2,
      maxRetries: maxRetries ?? 5,
      // What errors we should retry
      methods: methods ?? ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'TRACE'],
      // Indicates which errors to retry
      statusCodes: statusCodes ?? [500, 502, 503, 504, 429],
      // List of errors to retry
      errorCodes: errorCodes ?? [
        'ECONNRESET',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ENETDOWN',
        'ENETUNREACH',
        'EHOSTDOWN',
        'EHOSTUNREACH',
        'EPIPE',
        'UND_ERR_SOCKET'
      ]
    }

    this.retryCount = 0
    this.retryCountCheckpoint = 0
    this.start = 0
    this.end = null
    this.etag = null
    this.resume = null

    // Handle possible onConnect duplication
    this.handler.onConnect(reason => {
      this.aborted = true
      if (this.abort) {
        this.abort(reason)
      } else {
        this.reason = reason
      }
    })
  }

  onRequestSent () {
    if (this.handler.onRequestSent) {
      this.handler.onRequestSent()
    }
  }

  onUpgrade (statusCode, headers, socket) {
    if (this.handler.onUpgrade) {
      this.handler.onUpgrade(statusCode, headers, socket)
    }
  }

  onConnect (abort) {
    if (this.aborted) {
      abort(this.reason)
    } else {
      this.abort = abort
    }
  }

  onBodySent (chunk) {
    if (this.handler.onBodySent) return this.handler.onBodySent(chunk)
  }

  static [kRetryHandlerDefaultRetry] (err, { state, opts }, cb) {
    const { statusCode, code, headers } = err
    const { method, retryOptions } = opts
    const {
      maxRetries,
      minTimeout,
      maxTimeout,
      timeoutFactor,
      statusCodes,
      errorCodes,
      methods
    } = retryOptions
    const { counter } = state

    // Any code that is not a Undici's originated and allowed to retry
    if (code && code !== 'UND_ERR_REQ_RETRY' && !errorCodes.includes(code)) {
      cb(err)
      return
    }

    // If a set of method are provided and the current method is not in the list
    if (Array.isArray(methods) && !methods.includes(method)) {
      cb(err)
      return
    }

    // If a set of status code are provided and the current status code is not in the list
    if (
      statusCode != null &&
      Array.isArray(statusCodes) &&
      !statusCodes.includes(statusCode)
    ) {
      cb(err)
      return
    }

    // If we reached the max number of retries
    if (counter > maxRetries) {
      cb(err)
      return
    }

    let retryAfterHeader = headers?.['retry-after']
    if (retryAfterHeader) {
      retryAfterHeader = Number(retryAfterHeader)
      retryAfterHeader = Number.isNaN(retryAfterHeader)
        ? calculateRetryAfterHeader(retryAfterHeader)
        : retryAfterHeader * 1e3 // Retry-After is in seconds
    }

    const retryTimeout =
      retryAfterHeader > 0
        ? Math.min(retryAfterHeader, maxTimeout)
        : Math.min(minTimeout * timeoutFactor ** (counter - 1), maxTimeout)

    setTimeout(() => cb(null), retryTimeout)
  }

  onHeaders (statusCode, rawHeaders, resume, statusMessage) {
    const headers = parseHeaders(rawHeaders)

    this.retryCount += 1

    if (statusCode >= 300) {
      if (this.retryOpts.statusCodes.includes(statusCode) === false) {
        return this.handler.onHeaders(
          statusCode,
          rawHeaders,
          resume,
          statusMessage
        )
      } else {
        this.abort(
          new RequestRetryError('Request failed', statusCode, {
            headers,
            data: {
              count: this.retryCount
            }
          })
        )
        return false
      }
    }

    // Checkpoint for resume from where we left it
    if (this.resume != null) {
      this.resume = null

      // Only Partial Content 206 supposed to provide Content-Range,
      // any other status code that partially consumed the payload
      // should not be retry because it would result in downstream
      // wrongly concatanete multiple responses.
      if (statusCode !== 206 && (this.start > 0 || statusCode !== 200)) {
        this.abort(
          new RequestRetryError('server does not support the range header and the payload was partially consumed', statusCode, {
            headers,
            data: { count: this.retryCount }
          })
        )
        return false
      }

      const contentRange = parseRangeHeader(headers['content-range'])
      // If no content range
      if (!contentRange) {
        this.abort(
          new RequestRetryError('Content-Range mismatch', statusCode, {
            headers,
            data: { count: this.retryCount }
          })
        )
        return false
      }

      // Let's start with a weak etag check
      if (this.etag != null && this.etag !== headers.etag) {
        this.abort(
          new RequestRetryError('ETag mismatch', statusCode, {
            headers,
            data: { count: this.retryCount }
          })
        )
        return false
      }

      const { start, size, end = size - 1 } = contentRange

      assert(this.start === start, 'content-range mismatch')
      assert(this.end == null || this.end === end, 'content-range mismatch')

      this.resume = resume
      return true
    }

    if (this.end == null) {
      if (statusCode === 206) {
        // First time we receive 206
        const range = parseRangeHeader(headers['content-range'])

        if (range == null) {
          return this.handler.onHeaders(
            statusCode,
            rawHeaders,
            resume,
            statusMessage
          )
        }

        const { start, size, end = size - 1 } = range
        assert(
          start != null && Number.isFinite(start),
          'content-range mismatch'
        )
        assert(end != null && Number.isFinite(end), 'invalid content-length')

        this.start = start
        this.end = end
      }

      // We make our best to checkpoint the body for further range headers
      if (this.end == null) {
        const contentLength = headers['content-length']
        this.end = contentLength != null ? Number(contentLength) - 1 : null
      }

      assert(Number.isFinite(this.start))
      assert(
        this.end == null || Number.isFinite(this.end),
        'invalid content-length'
      )

      this.resume = resume
      this.etag = headers.etag != null ? headers.etag : null

      // Weak etags are not useful for comparison nor cache
      // for instance not safe to assume if the response is byte-per-byte
      // equal
      if (this.etag != null && this.etag.startsWith('W/')) {
        this.etag = null
      }

      return this.handler.onHeaders(
        statusCode,
        rawHeaders,
        resume,
        statusMessage
      )
    }

    const err = new RequestRetryError('Request failed', statusCode, {
      headers,
      data: { count: this.retryCount }
    })

    this.abort(err)

    return false
  }

  onData (chunk) {
    this.start += chunk.length

    return this.handler.onData(chunk)
  }

  onComplete (rawTrailers) {
    this.retryCount = 0
    return this.handler.onComplete(rawTrailers)
  }

  onError (err) {
    if (this.aborted || isDisturbed(this.opts.body)) {
      return this.handler.onError(err)
    }

    // We reconcile in case of a mix between network errors
    // and server error response
    if (this.retryCount - this.retryCountCheckpoint > 0) {
      // We count the difference between the last checkpoint and the current retry count
      this.retryCount =
        this.retryCountCheckpoint +
        (this.retryCount - this.retryCountCheckpoint)
    } else {
      this.retryCount += 1
    }

    this.retryOpts.retry(
      err,
      {
        state: { counter: this.retryCount },
        opts: { retryOptions: this.retryOpts, ...this.opts }
      },
      onRetry.bind(this)
    )

    function onRetry (err) {
      if (err != null || this.aborted || isDisturbed(this.opts.body)) {
        return this.handler.onError(err)
      }

      if (this.start !== 0) {
        const headers = { range: `bytes=${this.start}-${this.end ?? ''}` }

        // Weak etag check - weak etags will make comparison algorithms never match
        if (this.etag != null) {
          headers['if-match'] = this.etag
        }

        this.opts = {
          ...this.opts,
          headers: {
            ...this.opts.headers,
            ...headers
          }
        }
      }

      try {
        this.retryCountCheckpoint = this.retryCount
        this.dispatch(this.opts, this)
      } catch (err) {
        this.handler.onError(err)
      }
    }
  }
}

module.exports = RetryHandler
