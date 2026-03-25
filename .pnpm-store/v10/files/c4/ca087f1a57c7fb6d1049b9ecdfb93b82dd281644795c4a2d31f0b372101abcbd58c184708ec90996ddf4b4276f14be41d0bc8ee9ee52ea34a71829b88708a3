'use strict'

const { webidl } = require('../../webidl')
const { validateCloseCodeAndReason } = require('../util')
const { kConstruct } = require('../../../core/symbols')
const { kEnumerableProperty } = require('../../../core/util')

function createInheritableDOMException () {
  // https://github.com/nodejs/node/issues/59677
  class Test extends DOMException {
    get reason () {
      return ''
    }
  }

  if (new Test().reason !== undefined) {
    return DOMException
  }

  return new Proxy(DOMException, {
    construct (target, args, newTarget) {
      const instance = Reflect.construct(target, args, target)
      Object.setPrototypeOf(instance, newTarget.prototype)
      return instance
    }
  })
}

class WebSocketError extends createInheritableDOMException() {
  #closeCode
  #reason

  constructor (message = '', init = undefined) {
    message = webidl.converters.DOMString(message, 'WebSocketError', 'message')

    // 1. Set this 's name to " WebSocketError ".
    // 2. Set this 's message to message .
    super(message, 'WebSocketError')

    if (init === kConstruct) {
      return
    } else if (init !== null) {
      init = webidl.converters.WebSocketCloseInfo(init)
    }

    // 3. Let code be init [" closeCode "] if it exists , or null otherwise.
    let code = init.closeCode ?? null

    // 4. Let reason be init [" reason "] if it exists , or the empty string otherwise.
    const reason = init.reason ?? ''

    // 5. Validate close code and reason with code and reason .
    validateCloseCodeAndReason(code, reason)

    // 6. If reason is non-empty, but code is not set, then set code to 1000 ("Normal Closure").
    if (reason.length !== 0 && code === null) {
      code = 1000
    }

    // 7. Set this 's closeCode to code .
    this.#closeCode = code

    // 8. Set this 's reason to reason .
    this.#reason = reason
  }

  get closeCode () {
    return this.#closeCode
  }

  get reason () {
    return this.#reason
  }

  /**
   * @param {string} message
   * @param {number|null} code
   * @param {string} reason
   */
  static createUnvalidatedWebSocketError (message, code, reason) {
    const error = new WebSocketError(message, kConstruct)
    error.#closeCode = code
    error.#reason = reason
    return error
  }
}

const { createUnvalidatedWebSocketError } = WebSocketError
delete WebSocketError.createUnvalidatedWebSocketError

Object.defineProperties(WebSocketError.prototype, {
  closeCode: kEnumerableProperty,
  reason: kEnumerableProperty,
  [Symbol.toStringTag]: {
    value: 'WebSocketError',
    writable: false,
    enumerable: false,
    configurable: true
  }
})

webidl.is.WebSocketError = webidl.util.MakeTypeAssertion(WebSocketError)

module.exports = { WebSocketError, createUnvalidatedWebSocketError }
