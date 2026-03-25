'use strict'

module.exports = class DecoratorHandler {
  #handler

  constructor (handler) {
    if (typeof handler !== 'object' || handler === null) {
      throw new TypeError('handler must be an object')
    }
    this.#handler = handler
  }

  onConnect (...args) {
    return this.#handler.onConnect?.(...args)
  }

  onError (...args) {
    return this.#handler.onError?.(...args)
  }

  onUpgrade (...args) {
    return this.#handler.onUpgrade?.(...args)
  }

  onResponseStarted (...args) {
    return this.#handler.onResponseStarted?.(...args)
  }

  onHeaders (...args) {
    return this.#handler.onHeaders?.(...args)
  }

  onData (...args) {
    return this.#handler.onData?.(...args)
  }

  onComplete (...args) {
    return this.#handler.onComplete?.(...args)
  }

  onBodySent (...args) {
    return this.#handler.onBodySent?.(...args)
  }
}
