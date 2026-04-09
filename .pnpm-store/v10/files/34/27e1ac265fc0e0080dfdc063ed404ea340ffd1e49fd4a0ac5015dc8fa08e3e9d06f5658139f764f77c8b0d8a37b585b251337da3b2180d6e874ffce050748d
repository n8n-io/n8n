'use strict'

const { InvalidArgumentError } = require('../core/errors')

module.exports = class WrapHandler {
  #handler

  constructor (handler) {
    this.#handler = handler
  }

  static wrap (handler) {
    // TODO (fix): More checks...
    return handler.onRequestStart ? handler : new WrapHandler(handler)
  }

  // Unwrap Interface

  onConnect (abort, context) {
    return this.#handler.onConnect?.(abort, context)
  }

  onResponseStarted () {
    return this.#handler.onResponseStarted?.()
  }

  onHeaders (statusCode, rawHeaders, resume, statusMessage) {
    return this.#handler.onHeaders?.(statusCode, rawHeaders, resume, statusMessage)
  }

  onUpgrade (statusCode, rawHeaders, socket) {
    return this.#handler.onUpgrade?.(statusCode, rawHeaders, socket)
  }

  onData (data) {
    return this.#handler.onData?.(data)
  }

  onComplete (trailers) {
    return this.#handler.onComplete?.(trailers)
  }

  onError (err) {
    if (!this.#handler.onError) {
      throw err
    }

    return this.#handler.onError?.(err)
  }

  // Wrap Interface

  onRequestStart (controller, context) {
    this.#handler.onConnect?.((reason) => controller.abort(reason), context)
  }

  onRequestUpgrade (controller, statusCode, headers, socket) {
    const rawHeaders = []
    for (const [key, val] of Object.entries(headers)) {
      rawHeaders.push(Buffer.from(key, 'latin1'), toRawHeaderValue(val))
    }

    this.#handler.onUpgrade?.(statusCode, rawHeaders, socket)
  }

  onResponseStart (controller, statusCode, headers, statusMessage) {
    const rawHeaders = []
    for (const [key, val] of Object.entries(headers)) {
      rawHeaders.push(Buffer.from(key, 'latin1'), toRawHeaderValue(val))
    }

    if (this.#handler.onHeaders?.(statusCode, rawHeaders, () => controller.resume(), statusMessage) === false) {
      controller.pause()
    }
  }

  onResponseData (controller, data) {
    if (this.#handler.onData?.(data) === false) {
      controller.pause()
    }
  }

  onResponseEnd (controller, trailers) {
    const rawTrailers = []
    for (const [key, val] of Object.entries(trailers)) {
      rawTrailers.push(Buffer.from(key, 'latin1'), toRawHeaderValue(val))
    }

    this.#handler.onComplete?.(rawTrailers)
  }

  onResponseError (controller, err) {
    if (!this.#handler.onError) {
      throw new InvalidArgumentError('invalid onError method')
    }

    this.#handler.onError?.(err)
  }
}

function toRawHeaderValue (value) {
  return Array.isArray(value)
    ? value.map((item) => Buffer.from(item, 'latin1'))
    : Buffer.from(value, 'latin1')
}
