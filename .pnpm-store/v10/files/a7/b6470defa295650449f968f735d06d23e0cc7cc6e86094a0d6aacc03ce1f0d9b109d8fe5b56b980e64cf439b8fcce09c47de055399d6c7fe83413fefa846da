'use strict'
const assert = require('node:assert')

const { kRetryHandlerDefaultRetry } = require('../core/symbols')
const { RequestRetryError } = require('../core/errors')
const WrapHandler = require('./wrap-handler')
const {
  isDisturbed,
  parseRangeHeader,
  wrapRequestBody
} = require('../core/util')

function calculateRetryAfterHeader (retryAfter) {
  const retryTime = new Date(retryAfter).getTime()
  return isNaN(retryTime) ? 0 : retryTime - Date.now()
}

class RetryHandler {
  constructor (opts, { dispatch, handler }) {
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
      statusCodes,
      throwOnError
    } = retryOptions ?? {}

    this.error = null
    this.dispatch = dispatch
    this.handler = WrapHandler.wrap(handler)
    this.opts = { ...dispatchOpts, body: wrapRequestBody(opts.body) }
    this.retryOpts = {
      throwOnError: throwOnError ?? true,
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
    this.headersSent = false
    this.start = 0
    this.end = null
    this.etag = null
  }

  onResponseStartWithRetry (controller, statusCode, headers, statusMessage, err) {
    if (this.retryOpts.throwOnError) {
      // Preserve old behavior for status codes that are not eligible for retry
      if (this.retryOpts.statusCodes.includes(statusCode) === false) {
        this.headersSent = true
        this.handler.onResponseStart?.(controller, statusCode, headers, statusMessage)
      } else {
        this.error = err
      }

      return
    }

    if (isDisturbed(this.opts.body)) {
      this.headersSent = true
      this.handler.onResponseStart?.(controller, statusCode, headers, statusMessage)
      return
    }

    function shouldRetry (passedErr) {
      if (passedErr) {
        this.headersSent = true
        this.handler.onResponseStart?.(controller, statusCode, headers, statusMessage)
        controller.resume()
        return
      }

      this.error = err
      controller.resume()
    }

    controller.pause()
    this.retryOpts.retry(
      err,
      {
        state: { counter: this.retryCount },
        opts: { retryOptions: this.retryOpts, ...this.opts }
      },
      shouldRetry.bind(this)
    )
  }

  onRequestStart (controller, context) {
    if (!this.headersSent) {
      this.handler.onRequestStart?.(controller, context)
    }
  }

  onRequestUpgrade (controller, statusCode, headers, socket) {
    this.handler.onRequestUpgrade?.(controller, statusCode, headers, socket)
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
        ? calculateRetryAfterHeader(headers['retry-after'])
        : retryAfterHeader * 1e3 // Retry-After is in seconds
    }

    const retryTimeout =
      retryAfterHeader > 0
        ? Math.min(retryAfterHeader, maxTimeout)
        : Math.min(minTimeout * timeoutFactor ** (counter - 1), maxTimeout)

    setTimeout(() => cb(null), retryTimeout)
  }

  onResponseStart (controller, statusCode, headers, statusMessage) {
    this.error = null
    this.retryCount += 1

    if (statusCode >= 300) {
      const err = new RequestRetryError('Request failed', statusCode, {
        headers,
        data: {
          count: this.retryCount
        }
      })

      this.onResponseStartWithRetry(controller, statusCode, headers, statusMessage, err)
      return
    }

    // Checkpoint for resume from where we left it
    if (this.headersSent) {
      // Only Partial Content 206 supposed to provide Content-Range,
      // any other status code that partially consumed the payload
      // should not be retried because it would result in downstream
      // wrongly concatenate multiple responses.
      if (statusCode !== 206 && (this.start > 0 || statusCode !== 200)) {
        throw new RequestRetryError('server does not support the range header and the payload was partially consumed', statusCode, {
          headers,
          data: { count: this.retryCount }
        })
      }

      const contentRange = parseRangeHeader(headers['content-range'])
      // If no content range
      if (!contentRange) {
        // We always throw here as we want to indicate that we entred unexpected path
        throw new RequestRetryError('Content-Range mismatch', statusCode, {
          headers,
          data: { count: this.retryCount }
        })
      }

      // Let's start with a weak etag check
      if (this.etag != null && this.etag !== headers.etag) {
        // We always throw here as we want to indicate that we entred unexpected path
        throw new RequestRetryError('ETag mismatch', statusCode, {
          headers,
          data: { count: this.retryCount }
        })
      }

      const { start, size, end = size ? size - 1 : null } = contentRange

      assert(this.start === start, 'content-range mismatch')
      assert(this.end == null || this.end === end, 'content-range mismatch')

      return
    }

    if (this.end == null) {
      if (statusCode === 206) {
        // First time we receive 206
        const range = parseRangeHeader(headers['content-range'])

        if (range == null) {
          this.headersSent = true
          this.handler.onResponseStart?.(
            controller,
            statusCode,
            headers,
            statusMessage
          )
          return
        }

        const { start, size, end = size ? size - 1 : null } = range
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

      this.resume = true
      this.etag = headers.etag != null ? headers.etag : null

      // Weak etags are not useful for comparison nor cache
      // for instance not safe to assume if the response is byte-per-byte
      // equal
      if (
        this.etag != null &&
        this.etag[0] === 'W' &&
        this.etag[1] === '/'
      ) {
        this.etag = null
      }

      this.headersSent = true
      this.handler.onResponseStart?.(
        controller,
        statusCode,
        headers,
        statusMessage
      )
    } else {
      throw new RequestRetryError('Request failed', statusCode, {
        headers,
        data: { count: this.retryCount }
      })
    }
  }

  onResponseData (controller, chunk) {
    if (this.error) {
      return
    }

    this.start += chunk.length

    this.handler.onResponseData?.(controller, chunk)
  }

  onResponseEnd (controller, trailers) {
    if (this.error && this.retryOpts.throwOnError) {
      throw this.error
    }

    if (!this.error) {
      this.retryCount = 0
      return this.handler.onResponseEnd?.(controller, trailers)
    }

    this.retry(controller)
  }

  retry (controller) {
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
      this.handler.onResponseError?.(controller, err)
    }
  }

  onResponseError (controller, err) {
    if (controller?.aborted || isDisturbed(this.opts.body)) {
      this.handler.onResponseError?.(controller, err)
      return
    }

    function shouldRetry (returnedErr) {
      if (!returnedErr) {
        this.retry(controller)
        return
      }

      this.handler?.onResponseError?.(controller, returnedErr)
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
      shouldRetry.bind(this)
    )
  }
}

module.exports = RetryHandler
