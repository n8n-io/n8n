'use strict'

const util = require('../core/util')
const { InvalidArgumentError, RequestAbortedError } = require('../core/errors')
const DecoratorHandler = require('../handler/decorator-handler')

class DumpHandler extends DecoratorHandler {
  #maxSize = 1024 * 1024
  #abort = null
  #dumped = false
  #aborted = false
  #size = 0
  #reason = null
  #handler = null

  constructor ({ maxSize }, handler) {
    super(handler)

    if (maxSize != null && (!Number.isFinite(maxSize) || maxSize < 1)) {
      throw new InvalidArgumentError('maxSize must be a number greater than 0')
    }

    this.#maxSize = maxSize ?? this.#maxSize
    this.#handler = handler
  }

  onConnect (abort) {
    this.#abort = abort

    this.#handler.onConnect(this.#customAbort.bind(this))
  }

  #customAbort (reason) {
    this.#aborted = true
    this.#reason = reason
  }

  // TODO: will require adjustment after new hooks are out
  onHeaders (statusCode, rawHeaders, resume, statusMessage) {
    const headers = util.parseHeaders(rawHeaders)
    const contentLength = headers['content-length']

    if (contentLength != null && contentLength > this.#maxSize) {
      throw new RequestAbortedError(
        `Response size (${contentLength}) larger than maxSize (${
          this.#maxSize
        })`
      )
    }

    if (this.#aborted) {
      return true
    }

    return this.#handler.onHeaders(
      statusCode,
      rawHeaders,
      resume,
      statusMessage
    )
  }

  onError (err) {
    if (this.#dumped) {
      return
    }

    err = this.#reason ?? err

    this.#handler.onError(err)
  }

  onData (chunk) {
    this.#size = this.#size + chunk.length

    if (this.#size >= this.#maxSize) {
      this.#dumped = true

      if (this.#aborted) {
        this.#handler.onError(this.#reason)
      } else {
        this.#handler.onComplete([])
      }
    }

    return true
  }

  onComplete (trailers) {
    if (this.#dumped) {
      return
    }

    if (this.#aborted) {
      this.#handler.onError(this.reason)
      return
    }

    this.#handler.onComplete(trailers)
  }
}

function createDumpInterceptor (
  { maxSize: defaultMaxSize } = {
    maxSize: 1024 * 1024
  }
) {
  return dispatch => {
    return function Intercept (opts, handler) {
      const { dumpMaxSize = defaultMaxSize } =
        opts

      const dumpHandler = new DumpHandler(
        { maxSize: dumpMaxSize },
        handler
      )

      return dispatch(opts, dumpHandler)
    }
  }
}

module.exports = createDumpInterceptor
