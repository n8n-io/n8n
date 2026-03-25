const { EventEmitter } = require('events')
const SocketRequest = require('./socketRequest')
const events = require('../instrumentationEvents')
const { KafkaJSInvariantViolation } = require('../../errors')

const PRIVATE = {
  EMIT_QUEUE_SIZE_EVENT: Symbol('private:RequestQueue:emitQueueSizeEvent'),
  EMIT_REQUEST_QUEUE_EMPTY: Symbol('private:RequestQueue:emitQueueEmpty'),
}

const REQUEST_QUEUE_EMPTY = 'requestQueueEmpty'
const CHECK_PENDING_REQUESTS_INTERVAL = 10

module.exports = class RequestQueue extends EventEmitter {
  /**
   * @param {Object} options
   * @param {number} options.maxInFlightRequests
   * @param {number} options.requestTimeout
   * @param {boolean} options.enforceRequestTimeout
   * @param {string} options.clientId
   * @param {string} options.broker
   * @param {import("../../../types").Logger} options.logger
   * @param {import("../../instrumentation/emitter")} [options.instrumentationEmitter=null]
   * @param {() => boolean} [options.isConnected]
   */
  constructor({
    instrumentationEmitter = null,
    maxInFlightRequests,
    requestTimeout,
    enforceRequestTimeout,
    clientId,
    broker,
    logger,
    isConnected = () => true,
  }) {
    super()
    this.instrumentationEmitter = instrumentationEmitter
    this.maxInFlightRequests = maxInFlightRequests
    this.requestTimeout = requestTimeout
    this.enforceRequestTimeout = enforceRequestTimeout
    this.clientId = clientId
    this.broker = broker
    this.logger = logger
    this.isConnected = isConnected

    this.inflight = new Map()
    this.pending = []

    /**
     * Until when this request queue is throttled and shouldn't send requests
     *
     * The value represents the timestamp of the end of the throttling in ms-since-epoch. If the value
     * is smaller than the current timestamp no throttling is active.
     *
     * @type {number}
     */
    this.throttledUntil = -1

    /**
     * Timeout id if we have scheduled a check for pending requests due to client-side throttling
     *
     * @type {null|NodeJS.Timeout}
     */
    this.throttleCheckTimeoutId = null

    this[PRIVATE.EMIT_REQUEST_QUEUE_EMPTY] = () => {
      if (this.pending.length === 0 && this.inflight.size === 0) {
        this.emit(REQUEST_QUEUE_EMPTY)
      }
    }

    this[PRIVATE.EMIT_QUEUE_SIZE_EVENT] = () => {
      instrumentationEmitter &&
        instrumentationEmitter.emit(events.NETWORK_REQUEST_QUEUE_SIZE, {
          broker: this.broker,
          clientId: this.clientId,
          queueSize: this.pending.length,
        })

      this[PRIVATE.EMIT_REQUEST_QUEUE_EMPTY]()
    }
  }

  /**
   * @public
   */
  scheduleRequestTimeoutCheck() {
    if (this.enforceRequestTimeout) {
      this.destroy()

      this.requestTimeoutIntervalId = setInterval(() => {
        this.inflight.forEach(request => {
          if (Date.now() - request.sentAt > request.requestTimeout) {
            request.timeoutRequest()
          }
        })

        if (!this.isConnected()) {
          this.destroy()
        }
      }, Math.min(this.requestTimeout, 100))
    }
  }

  maybeThrottle(clientSideThrottleTime) {
    if (clientSideThrottleTime !== null && clientSideThrottleTime > 0) {
      this.logger.debug(`Client side throttling in effect for ${clientSideThrottleTime}ms`)
      const minimumThrottledUntil = Date.now() + clientSideThrottleTime
      this.throttledUntil = Math.max(minimumThrottledUntil, this.throttledUntil)
    }
  }

  createSocketRequest(pushedRequest) {
    const { correlationId } = pushedRequest.entry
    const defaultRequestTimeout = this.requestTimeout
    const customRequestTimeout = pushedRequest.requestTimeout

    // Some protocol requests have custom request timeouts (e.g JoinGroup, Fetch, etc). The custom
    // timeouts are influenced by user configurations, which can be lower than the default requestTimeout
    const requestTimeout = Math.max(defaultRequestTimeout, customRequestTimeout || 0)

    const socketRequest = new SocketRequest({
      entry: pushedRequest.entry,
      expectResponse: pushedRequest.expectResponse,
      broker: this.broker,
      clientId: this.clientId,
      instrumentationEmitter: this.instrumentationEmitter,
      requestTimeout,
      send: () => {
        if (this.inflight.has(correlationId)) {
          throw new KafkaJSInvariantViolation('Correlation id already exists')
        }
        this.inflight.set(correlationId, socketRequest)
        pushedRequest.sendRequest()
      },
      timeout: () => {
        this.inflight.delete(correlationId)
        this.checkPendingRequests()
        // Try to emit REQUEST_QUEUE_EMPTY. Otherwise, waitForPendingRequests may stuck forever
        this[PRIVATE.EMIT_REQUEST_QUEUE_EMPTY]()
      },
    })

    return socketRequest
  }

  /**
   * @typedef {Object} PushedRequest
   * @property {import("./socketRequest").RequestEntry} entry
   * @property {boolean} expectResponse
   * @property {Function} sendRequest
   * @property {number} [requestTimeout]
   *
   * @public
   * @param {PushedRequest} pushedRequest
   */
  push(pushedRequest) {
    const { correlationId } = pushedRequest.entry
    const socketRequest = this.createSocketRequest(pushedRequest)

    if (this.canSendSocketRequestImmediately()) {
      this.sendSocketRequest(socketRequest)
      return
    }

    this.pending.push(socketRequest)
    this.scheduleCheckPendingRequests()

    this.logger.debug(`Request enqueued`, {
      clientId: this.clientId,
      broker: this.broker,
      correlationId,
    })

    this[PRIVATE.EMIT_QUEUE_SIZE_EVENT]()
  }

  /**
   * @param {SocketRequest} socketRequest
   */
  sendSocketRequest(socketRequest) {
    socketRequest.send()

    if (!socketRequest.expectResponse) {
      this.logger.debug(`Request does not expect a response, resolving immediately`, {
        clientId: this.clientId,
        broker: this.broker,
        correlationId: socketRequest.correlationId,
      })

      this.inflight.delete(socketRequest.correlationId)
      socketRequest.completed({ size: 0, payload: null })
    }
  }

  /**
   * @public
   * @param {object} response
   * @param {number} response.correlationId
   * @param {Buffer} response.payload
   * @param {number} response.size
   */
  fulfillRequest({ correlationId, payload, size }) {
    const socketRequest = this.inflight.get(correlationId)
    this.inflight.delete(correlationId)
    this.checkPendingRequests()

    if (socketRequest) {
      socketRequest.completed({ size, payload })
    } else {
      this.logger.warn(`Response without match`, {
        clientId: this.clientId,
        broker: this.broker,
        correlationId,
      })
    }

    this[PRIVATE.EMIT_REQUEST_QUEUE_EMPTY]()
  }

  /**
   * @public
   * @param {Error} error
   */
  rejectAll(error) {
    const requests = [...this.inflight.values(), ...this.pending]

    for (const socketRequest of requests) {
      socketRequest.rejected(error)
      this.inflight.delete(socketRequest.correlationId)
    }

    this.pending = []
    this.inflight.clear()
    this[PRIVATE.EMIT_QUEUE_SIZE_EVENT]()
  }

  /**
   * @public
   */
  waitForPendingRequests() {
    return new Promise(resolve => {
      if (this.pending.length === 0 && this.inflight.size === 0) {
        return resolve()
      }

      this.logger.debug('Waiting for pending requests', {
        clientId: this.clientId,
        broker: this.broker,
        currentInflightRequests: this.inflight.size,
        currentPendingQueueSize: this.pending.length,
      })

      this.once(REQUEST_QUEUE_EMPTY, () => resolve())
    })
  }

  /**
   * @public
   */
  destroy() {
    clearInterval(this.requestTimeoutIntervalId)
    clearTimeout(this.throttleCheckTimeoutId)
    this.throttleCheckTimeoutId = null
  }

  canSendSocketRequestImmediately() {
    const shouldEnqueue =
      (this.maxInFlightRequests != null && this.inflight.size >= this.maxInFlightRequests) ||
      this.throttledUntil > Date.now()

    return !shouldEnqueue
  }

  /**
   * Check and process pending requests either now or in the future
   *
   * This function will send out as many pending requests as possible taking throttling and
   * in-flight limits into account.
   */
  checkPendingRequests() {
    while (this.pending.length > 0 && this.canSendSocketRequestImmediately()) {
      const pendingRequest = this.pending.shift() // first in first out
      this.sendSocketRequest(pendingRequest)

      this.logger.debug(`Consumed pending request`, {
        clientId: this.clientId,
        broker: this.broker,
        correlationId: pendingRequest.correlationId,
        pendingDuration: pendingRequest.pendingDuration,
        currentPendingQueueSize: this.pending.length,
      })

      this[PRIVATE.EMIT_QUEUE_SIZE_EVENT]()
    }

    this.scheduleCheckPendingRequests()
  }

  /**
   * Ensure that pending requests will be checked in the future
   *
   * If there is a client-side throttling in place this will ensure that we will check
   * the pending request queue eventually.
   */
  scheduleCheckPendingRequests() {
    // If we're throttled: Schedule checkPendingRequests when the throttle
    // should be resolved. If there is already something scheduled we assume that that
    // will be fine, and potentially fix up a new timeout if needed at that time.
    // Note that if we're merely "overloaded" by having too many inflight requests
    // we will anyways check the queue when one of them gets fulfilled.
    let scheduleAt = this.throttledUntil - Date.now()
    if (!this.throttleCheckTimeoutId) {
      if (this.pending.length > 0) {
        scheduleAt = scheduleAt > 0 ? scheduleAt : CHECK_PENDING_REQUESTS_INTERVAL
      }
      this.throttleCheckTimeoutId = setTimeout(() => {
        this.throttleCheckTimeoutId = null
        this.checkPendingRequests()
      }, scheduleAt)
    }
  }
}
