'use strict'

/**
 * @typedef {import('../../types/dispatcher.d.ts').default.DispatchHandler} DispatchHandler
 */

/**
 * Handler that buffers response data and notifies multiple waiting handlers.
 * Used for request deduplication.
 *
 * @implements {DispatchHandler}
 */
class DeduplicationHandler {
  /**
   * @type {DispatchHandler}
   */
  #primaryHandler

  /**
   * @type {DispatchHandler[]}
   */
  #waitingHandlers = []

  /**
   * @type {Buffer[]}
   */
  #chunks = []

  /**
   * @type {number}
   */
  #statusCode = 0

  /**
   * @type {Record<string, string | string[]>}
   */
  #headers = {}

  /**
   * @type {string}
   */
  #statusMessage = ''

  /**
   * @type {boolean}
   */
  #aborted = false

  /**
   * @type {import('../../types/dispatcher.d.ts').default.DispatchController | null}
   */
  #controller = null

  /**
   * @type {(() => void) | null}
   */
  #onComplete = null

  /**
   * @param {DispatchHandler} primaryHandler The primary handler
   * @param {() => void} onComplete Callback when request completes
   */
  constructor (primaryHandler, onComplete) {
    this.#primaryHandler = primaryHandler
    this.#onComplete = onComplete
  }

  /**
   * Add a waiting handler that will receive the buffered response
   * @param {DispatchHandler} handler
   */
  addWaitingHandler (handler) {
    this.#waitingHandlers.push(handler)
  }

  /**
   * @param {() => void} abort
   * @param {any} context
   */
  onRequestStart (controller, context) {
    this.#controller = controller
    this.#primaryHandler.onRequestStart?.(controller, context)
  }

  /**
   * @param {import('../../types/dispatcher.d.ts').default.DispatchController} controller
   * @param {number} statusCode
   * @param {import('../../types/header.d.ts').IncomingHttpHeaders} headers
   * @param {Socket} socket
   */
  onRequestUpgrade (controller, statusCode, headers, socket) {
    this.#primaryHandler.onRequestUpgrade?.(controller, statusCode, headers, socket)
  }

  /**
   * @param {import('../../types/dispatcher.d.ts').default.DispatchController} controller
   * @param {number} statusCode
   * @param {Record<string, string | string[]>} headers
   * @param {string} statusMessage
   */
  onResponseStart (controller, statusCode, headers, statusMessage) {
    this.#statusCode = statusCode
    this.#headers = headers
    this.#statusMessage = statusMessage
    this.#primaryHandler.onResponseStart?.(controller, statusCode, headers, statusMessage)
  }

  /**
   * @param {import('../../types/dispatcher.d.ts').default.DispatchController} controller
   * @param {Buffer} chunk
   */
  onResponseData (controller, chunk) {
    // Buffer the chunk for waiting handlers
    this.#chunks.push(Buffer.from(chunk))
    this.#primaryHandler.onResponseData?.(controller, chunk)
  }

  /**
   * @param {import('../../types/dispatcher.d.ts').default.DispatchController} controller
   * @param {object} trailers
   */
  onResponseEnd (controller, trailers) {
    this.#primaryHandler.onResponseEnd?.(controller, trailers)
    this.#notifyWaitingHandlers()
    this.#onComplete?.()
  }

  /**
   * @param {import('../../types/dispatcher.d.ts').default.DispatchController} controller
   * @param {Error} err
   */
  onResponseError (controller, err) {
    this.#aborted = true
    this.#primaryHandler.onResponseError?.(controller, err)
    this.#notifyWaitingHandlersError(err)
    this.#onComplete?.()
  }

  /**
   * Notify all waiting handlers with the buffered response
   */
  #notifyWaitingHandlers () {
    const body = Buffer.concat(this.#chunks)

    for (const handler of this.#waitingHandlers) {
      // Create a simple controller for each waiting handler
      const waitingController = {
        resume () {},
        pause () {},
        get paused () { return false },
        get aborted () { return false },
        get reason () { return null },
        abort () {}
      }

      try {
        handler.onRequestStart?.(waitingController, null)

        if (waitingController.aborted) {
          continue
        }

        handler.onResponseStart?.(
          waitingController,
          this.#statusCode,
          this.#headers,
          this.#statusMessage
        )

        if (waitingController.aborted) {
          continue
        }

        if (body.length > 0) {
          handler.onResponseData?.(waitingController, body)
        }

        handler.onResponseEnd?.(waitingController, {})
      } catch {
        // Ignore errors from waiting handlers
      }
    }

    this.#waitingHandlers = []
    this.#chunks = []
  }

  /**
   * Notify all waiting handlers of an error
   * @param {Error} err
   */
  #notifyWaitingHandlersError (err) {
    for (const handler of this.#waitingHandlers) {
      const waitingController = {
        resume () {},
        pause () {},
        get paused () { return false },
        get aborted () { return true },
        get reason () { return err },
        abort () {}
      }

      try {
        handler.onRequestStart?.(waitingController, null)
        handler.onResponseError?.(waitingController, err)
      } catch {
        // Ignore errors from waiting handlers
      }
    }

    this.#waitingHandlers = []
    this.#chunks = []
  }
}

module.exports = DeduplicationHandler
