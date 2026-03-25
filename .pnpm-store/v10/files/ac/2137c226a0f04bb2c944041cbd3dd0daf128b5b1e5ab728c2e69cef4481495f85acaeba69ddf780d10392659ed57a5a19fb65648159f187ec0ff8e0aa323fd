'use strict'

const { parseHeaders } = require('../core/util')
const { InvalidArgumentError } = require('../core/errors')

const kResume = Symbol('resume')

class UnwrapController {
  #paused = false
  #reason = null
  #aborted = false
  #abort

  [kResume] = null

  constructor (abort) {
    this.#abort = abort
  }

  pause () {
    this.#paused = true
  }

  resume () {
    if (this.#paused) {
      this.#paused = false
      this[kResume]?.()
    }
  }

  abort (reason) {
    if (!this.#aborted) {
      this.#aborted = true
      this.#reason = reason
      this.#abort(reason)
    }
  }

  get aborted () {
    return this.#aborted
  }

  get reason () {
    return this.#reason
  }

  get paused () {
    return this.#paused
  }
}

module.exports = class UnwrapHandler {
  #handler
  #controller

  constructor (handler) {
    this.#handler = handler
  }

  static unwrap (handler) {
    // TODO (fix): More checks...
    return !handler.onRequestStart ? handler : new UnwrapHandler(handler)
  }

  onConnect (abort, context) {
    this.#controller = new UnwrapController(abort)
    this.#handler.onRequestStart?.(this.#controller, context)
  }

  onUpgrade (statusCode, rawHeaders, socket) {
    this.#handler.onRequestUpgrade?.(this.#controller, statusCode, parseHeaders(rawHeaders), socket)
  }

  onHeaders (statusCode, rawHeaders, resume, statusMessage) {
    this.#controller[kResume] = resume
    this.#handler.onResponseStart?.(this.#controller, statusCode, parseHeaders(rawHeaders), statusMessage)
    return !this.#controller.paused
  }

  onData (data) {
    this.#handler.onResponseData?.(this.#controller, data)
    return !this.#controller.paused
  }

  onComplete (rawTrailers) {
    this.#handler.onResponseEnd?.(this.#controller, parseHeaders(rawTrailers))
  }

  onError (err) {
    if (!this.#handler.onResponseError) {
      throw new InvalidArgumentError('invalid onError method')
    }

    this.#handler.onResponseError?.(this.#controller, err)
  }
}
