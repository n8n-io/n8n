'use strict'

const { InvalidArgumentError, RequestAbortedError } = require('../core/errors')
const DecoratorHandler = require('../handler/decorator-handler')

class DumpHandler extends DecoratorHandler {
  #maxSize = 1024 * 1024
  #dumped = false
  #size = 0
  #controller = null
  aborted = false
  reason = false

  constructor ({ maxSize, signal }, handler) {
    if (maxSize != null && (!Number.isFinite(maxSize) || maxSize < 1)) {
      throw new InvalidArgumentError('maxSize must be a number greater than 0')
    }

    super(handler)

    this.#maxSize = maxSize ?? this.#maxSize
    // this.#handler = handler
  }

  #abort (reason) {
    this.aborted = true
    this.reason = reason
  }

  onRequestStart (controller, context) {
    controller.abort = this.#abort.bind(this)
    this.#controller = controller

    return super.onRequestStart(controller, context)
  }

  onResponseStart (controller, statusCode, headers, statusMessage) {
    const contentLength = headers['content-length']

    if (contentLength != null && contentLength > this.#maxSize) {
      throw new RequestAbortedError(
        `Response size (${contentLength}) larger than maxSize (${
          this.#maxSize
        })`
      )
    }

    if (this.aborted === true) {
      return true
    }

    return super.onResponseStart(controller, statusCode, headers, statusMessage)
  }

  onResponseError (controller, err) {
    if (this.#dumped) {
      return
    }

    // On network errors before connect, controller will be null
    err = this.#controller?.reason ?? err

    super.onResponseError(controller, err)
  }

  onResponseData (controller, chunk) {
    this.#size = this.#size + chunk.length

    if (this.#size >= this.#maxSize) {
      this.#dumped = true

      if (this.aborted === true) {
        super.onResponseError(controller, this.reason)
      } else {
        super.onResponseEnd(controller, {})
      }
    }

    return true
  }

  onResponseEnd (controller, trailers) {
    if (this.#dumped) {
      return
    }

    if (this.#controller.aborted === true) {
      super.onResponseError(controller, this.reason)
      return
    }

    super.onResponseEnd(controller, trailers)
  }
}

function createDumpInterceptor (
  { maxSize: defaultMaxSize } = {
    maxSize: 1024 * 1024
  }
) {
  return dispatch => {
    return function Intercept (opts, handler) {
      const { dumpMaxSize = defaultMaxSize } = opts

      const dumpHandler = new DumpHandler({ maxSize: dumpMaxSize, signal: opts.signal }, handler)

      return dispatch(opts, dumpHandler)
    }
  }
}

module.exports = createDumpInterceptor
