'use strict'

const assert = require('node:assert')
const { Readable } = require('./readable')
const { InvalidArgumentError, RequestAbortedError } = require('../core/errors')
const util = require('../core/util')
const { getResolveErrorBodyCallback } = require('./util')
const { AsyncResource } = require('node:async_hooks')

class RequestHandler extends AsyncResource {
  constructor (opts, callback) {
    if (!opts || typeof opts !== 'object') {
      throw new InvalidArgumentError('invalid opts')
    }

    const { signal, method, opaque, body, onInfo, responseHeaders, throwOnError, highWaterMark } = opts

    try {
      if (typeof callback !== 'function') {
        throw new InvalidArgumentError('invalid callback')
      }

      if (highWaterMark && (typeof highWaterMark !== 'number' || highWaterMark < 0)) {
        throw new InvalidArgumentError('invalid highWaterMark')
      }

      if (signal && typeof signal.on !== 'function' && typeof signal.addEventListener !== 'function') {
        throw new InvalidArgumentError('signal must be an EventEmitter or EventTarget')
      }

      if (method === 'CONNECT') {
        throw new InvalidArgumentError('invalid method')
      }

      if (onInfo && typeof onInfo !== 'function') {
        throw new InvalidArgumentError('invalid onInfo callback')
      }

      super('UNDICI_REQUEST')
    } catch (err) {
      if (util.isStream(body)) {
        util.destroy(body.on('error', util.nop), err)
      }
      throw err
    }

    this.method = method
    this.responseHeaders = responseHeaders || null
    this.opaque = opaque || null
    this.callback = callback
    this.res = null
    this.abort = null
    this.body = body
    this.trailers = {}
    this.context = null
    this.onInfo = onInfo || null
    this.throwOnError = throwOnError
    this.highWaterMark = highWaterMark
    this.signal = signal
    this.reason = null
    this.removeAbortListener = null

    if (util.isStream(body)) {
      body.on('error', (err) => {
        this.onError(err)
      })
    }

    if (this.signal) {
      if (this.signal.aborted) {
        this.reason = this.signal.reason ?? new RequestAbortedError()
      } else {
        this.removeAbortListener = util.addAbortListener(this.signal, () => {
          this.reason = this.signal.reason ?? new RequestAbortedError()
          if (this.res) {
            util.destroy(this.res.on('error', util.nop), this.reason)
          } else if (this.abort) {
            this.abort(this.reason)
          }

          if (this.removeAbortListener) {
            this.res?.off('close', this.removeAbortListener)
            this.removeAbortListener()
            this.removeAbortListener = null
          }
        })
      }
    }
  }

  onConnect (abort, context) {
    if (this.reason) {
      abort(this.reason)
      return
    }

    assert(this.callback)

    this.abort = abort
    this.context = context
  }

  onHeaders (statusCode, rawHeaders, resume, statusMessage) {
    const { callback, opaque, abort, context, responseHeaders, highWaterMark } = this

    const headers = responseHeaders === 'raw' ? util.parseRawHeaders(rawHeaders) : util.parseHeaders(rawHeaders)

    if (statusCode < 200) {
      if (this.onInfo) {
        this.onInfo({ statusCode, headers })
      }
      return
    }

    const parsedHeaders = responseHeaders === 'raw' ? util.parseHeaders(rawHeaders) : headers
    const contentType = parsedHeaders['content-type']
    const contentLength = parsedHeaders['content-length']
    const res = new Readable({
      resume,
      abort,
      contentType,
      contentLength: this.method !== 'HEAD' && contentLength
        ? Number(contentLength)
        : null,
      highWaterMark
    })

    if (this.removeAbortListener) {
      res.on('close', this.removeAbortListener)
    }

    this.callback = null
    this.res = res
    if (callback !== null) {
      if (this.throwOnError && statusCode >= 400) {
        this.runInAsyncScope(getResolveErrorBodyCallback, null,
          { callback, body: res, contentType, statusCode, statusMessage, headers }
        )
      } else {
        this.runInAsyncScope(callback, null, null, {
          statusCode,
          headers,
          trailers: this.trailers,
          opaque,
          body: res,
          context
        })
      }
    }
  }

  onData (chunk) {
    return this.res.push(chunk)
  }

  onComplete (trailers) {
    util.parseHeaders(trailers, this.trailers)
    this.res.push(null)
  }

  onError (err) {
    const { res, callback, body, opaque } = this

    if (callback) {
      // TODO: Does this need queueMicrotask?
      this.callback = null
      queueMicrotask(() => {
        this.runInAsyncScope(callback, null, err, { opaque })
      })
    }

    if (res) {
      this.res = null
      // Ensure all queued handlers are invoked before destroying res.
      queueMicrotask(() => {
        util.destroy(res, err)
      })
    }

    if (body) {
      this.body = null
      util.destroy(body, err)
    }

    if (this.removeAbortListener) {
      res?.off('close', this.removeAbortListener)
      this.removeAbortListener()
      this.removeAbortListener = null
    }
  }
}

function request (opts, callback) {
  if (callback === undefined) {
    return new Promise((resolve, reject) => {
      request.call(this, opts, (err, data) => {
        return err ? reject(err) : resolve(data)
      })
    })
  }

  try {
    this.dispatch(opts, new RequestHandler(opts, callback))
  } catch (err) {
    if (typeof callback !== 'function') {
      throw err
    }
    const opaque = opts?.opaque
    queueMicrotask(() => callback(err, { opaque }))
  }
}

module.exports = request
module.exports.RequestHandler = RequestHandler
