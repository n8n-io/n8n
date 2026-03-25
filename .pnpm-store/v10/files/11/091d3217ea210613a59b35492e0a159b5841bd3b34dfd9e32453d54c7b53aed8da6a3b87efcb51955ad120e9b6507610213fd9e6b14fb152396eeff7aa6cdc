const assert = require('assert')

const { kRetryHandlerDefaultRetry } = require('../core/symbols')
const { RequestRetryError } = require('../core/errors')
const { isDisturbed, parseHeaders, parseRangeHeader } = require('../core/util')

function calculateRetryAfterHeader (retryAfter) {
  const current = Date.now()
  const diff = new Date(retryAfter).getTime() - current

  return diff
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
    this.opts = dispatchOpts
    this.abort = null
    this.aborted = false
    this.retryOpts = {
      retry: retryFn ?? RetryHandler[kRetryHandlerDefaultRetry],
      retryAfter: retryAfter ?? true,
      maxTimeout: maxTimeout ?? 30 * 1000, // 30s,
      timeout: minTimeout ?? 500, // .5s
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
        'EPIPE'
      ]
    }

    this.retryCount = 0
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
      timeout,
      maxTimeout,
      timeoutFactor,
      statusCodes,
      errorCodes,
      methods
    } = retryOptions
    let { counter, currentTimeout } = state

    currentTimeout =
      currentTimeout != null && currentTimeout > 0 ? currentTimeout : timeout

    // Any code that is not a Undici's originated and allowed to retry
    if (
      code &&
      code !== 'UND_ERR_REQ_RETRY' &&
      code !== 'UND_ERR_SOCKET' &&
      !errorCodes.includes(code)
    ) {
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

    let retryAfterHeader = headers != null && headers['retry-after']
    if (retryAfterHeader) {
      retryAfterHeader = Number(retryAfterHeader)
      retryAfterHeader = isNaN(retryAfterHeader)
        ? calculateRetryAfterHeader(retryAfterHeader)
        : retryAfterHeader * 1e3 // Retry-After is in seconds
    }

    const retryTimeout =
      retryAfterHeader > 0
        ? Math.min(retryAfterHeader, maxTimeout)
        : Math.min(currentTimeout * timeoutFactor ** counter, maxTimeout)

    state.currentTimeout = retryTimeout

    setTimeout(() => cb(null), retryTimeout)
  }

  onHeaders (statusCode, rawHeaders, resume, statusMessage) {
    const headers = parseHeaders(rawHeaders)

    this.retryCount += 1

    if (statusCode >= 300) {
      this.abort(
        new RequestRetryError('Request failed', statusCode, {
          headers,
          count: this.retryCount
        })
      )
      return false
    }

    // Checkpoint for resume from where we left it
    if (this.resume != null) {
      this.resume = null

      if (statusCode !== 206) {
        return true
      }

      const contentRange = parseRangeHeader(headers['content-range'])
      // If no content range
      if (!contentRange) {
        this.abort(
          new RequestRetryError('Content-Range mismatch', statusCode, {
            headers,
            count: this.retryCount
          })
        )
        return false
      }

      // Let's start with a weak etag check
      if (this.etag != null && this.etag !== headers.etag) {
        this.abort(
          new RequestRetryError('ETag mismatch', statusCode, {
            headers,
            count: this.retryCount
          })
        )
        return false
      }

      const { start, size, end = size } = contentRange

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

        const { start, size, end = size } = range

        assert(
          start != null && Number.isFinite(start) && this.start !== start,
          'content-range mismatch'
        )
        assert(Number.isFinite(start))
        assert(
          end != null && Number.isFinite(end) && this.end !== end,
          'invalid content-length'
        )

        this.start = start
        this.end = end
      }

      // We make our best to checkpoint the body for further range headers
      if (this.end == null) {
        const contentLength = headers['content-length']
        this.end = contentLength != null ? Number(contentLength) : null
      }

      assert(Number.isFinite(this.start))
      assert(
        this.end == null || Number.isFinite(this.end),
        'invalid content-length'
      )

      this.resume = resume
      this.etag = headers.etag != null ? headers.etag : null

      return this.handler.onHeaders(
        statusCode,
        rawHeaders,
        resume,
        statusMessage
      )
    }

    const err = new RequestRetryError('Request failed', statusCode, {
      headers,
      count: this.retryCount
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

    this.retryOpts.retry(
      err,
      {
        state: { counter: this.retryCount++, currentTimeout: this.retryAfter },
        opts: { retryOptions: this.retryOpts, ...this.opts }
      },
      onRetry.bind(this)
    )

    function onRetry (err) {
      if (err != null || this.aborted || isDisturbed(this.opts.body)) {
        return this.handler.onError(err)
      }

      if (this.start !== 0) {
        this.opts = {
          ...this.opts,
          headers: {
            ...this.opts.headers,
            range: `bytes=${this.start}-${this.end ?? ''}`
          }
        }
      }

      try {
        this.dispatch(this.opts, this)
      } catch (err) {
        this.handler.onError(err)
      }
    }
  }
}

module.exports = RetryHandler
