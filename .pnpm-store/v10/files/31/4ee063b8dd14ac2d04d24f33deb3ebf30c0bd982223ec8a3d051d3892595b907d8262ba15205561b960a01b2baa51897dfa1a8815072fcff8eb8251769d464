const createSocket = require('./socket')
const createRequest = require('../protocol/request')
const Decoder = require('../protocol/decoder')
const { KafkaJSConnectionError, KafkaJSConnectionClosedError } = require('../errors')
const { INT_32_MAX_VALUE } = require('../constants')
const getEnv = require('../env')
const RequestQueue = require('./requestQueue')
const { CONNECTION_STATUS, CONNECTED_STATUS } = require('./connectionStatus')
const sharedPromiseTo = require('../utils/sharedPromiseTo')
const Long = require('../utils/long')
const SASLAuthenticator = require('../broker/saslAuthenticator')
const apiKeys = require('../protocol/requests/apiKeys')

const requestInfo = ({ apiName, apiKey, apiVersion }) =>
  `${apiName}(key: ${apiKey}, version: ${apiVersion})`

/**
 * @param request - request from protocol
 * @returns {boolean}
 */
const isAuthenticatedRequest = request => {
  return ![apiKeys.ApiVersions, apiKeys.SaslHandshake, apiKeys.SaslAuthenticate].includes(
    request.apiKey
  )
}

const PRIVATE = {
  SHOULD_REAUTHENTICATE: Symbol('private:Connection:shouldReauthenticate'),
  AUTHENTICATE: Symbol('private:Connection:authenticate'),
}

module.exports = class Connection {
  /**
   * @param {Object} options
   * @param {string} options.host
   * @param {number} options.port
   * @param {import("../../types").Logger} options.logger
   * @param {import("../../types").ISocketFactory} options.socketFactory
   * @param {string} [options.clientId='kafkajs']
   * @param {number} options.requestTimeout The maximum amount of time the client will wait for the response of a request,
   *                                in milliseconds
   * @param {string} [options.rack=null]
   * @param {Object} [options.ssl=null] Options for the TLS Secure Context. It accepts all options,
   *                            usually "cert", "key" and "ca". More information at
   *                            https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options
   * @param {Object} [options.sasl=null] Attributes used for SASL authentication. Options based on the
   *                             key "mechanism". Connection is not actively using the SASL attributes
   *                             but acting as a data object for this information
   * @param {number} [options.reauthenticationThreshold=10000]
   * @param {number} options.connectionTimeout The connection timeout, in milliseconds
   * @param {boolean} [options.enforceRequestTimeout]
   * @param {number} [options.maxInFlightRequests=null] The maximum number of unacknowledged requests on a connection before
   *                                            enqueuing
   * @param {import("../instrumentation/emitter")} [options.instrumentationEmitter=null]
   */
  constructor({
    host,
    port,
    logger,
    socketFactory,
    requestTimeout,
    reauthenticationThreshold = 10000,
    rack = null,
    ssl = null,
    sasl = null,
    clientId = 'kafkajs',
    connectionTimeout,
    enforceRequestTimeout = true,
    maxInFlightRequests = null,
    instrumentationEmitter = null,
  }) {
    this.host = host
    this.port = port
    this.rack = rack
    this.clientId = clientId
    this.broker = `${this.host}:${this.port}`
    this.logger = logger.namespace('Connection')

    this.socketFactory = socketFactory
    this.ssl = ssl
    this.sasl = sasl

    this.requestTimeout = requestTimeout
    this.connectionTimeout = connectionTimeout
    this.reauthenticationThreshold = reauthenticationThreshold

    this.bytesBuffered = 0
    this.bytesNeeded = Decoder.int32Size()
    this.chunks = []

    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED
    this.correlationId = 0
    this.requestQueue = new RequestQueue({
      instrumentationEmitter,
      maxInFlightRequests,
      requestTimeout,
      enforceRequestTimeout,
      clientId,
      broker: this.broker,
      logger: logger.namespace('RequestQueue'),
      isConnected: () => this.isConnected(),
    })

    this.versions = null

    this.authHandlers = null
    this.authExpectResponse = false

    const log = level => (message, extra = {}) => {
      const logFn = this.logger[level]
      logFn(message, { broker: this.broker, clientId, ...extra })
    }

    this.logDebug = log('debug')
    this.logError = log('error')

    const env = getEnv()
    this.shouldLogBuffers = env.KAFKAJS_DEBUG_PROTOCOL_BUFFERS === '1'
    this.shouldLogFetchBuffer =
      this.shouldLogBuffers && env.KAFKAJS_DEBUG_EXTENDED_PROTOCOL_BUFFERS === '1'

    this.authenticatedAt = null
    this.sessionLifetime = Long.ZERO
    this.supportAuthenticationProtocol = null

    /**
     * @private
     * @returns {Promise}
     */
    this[PRIVATE.AUTHENTICATE] = sharedPromiseTo(async () => {
      if (this.sasl && !this.isAuthenticated()) {
        const authenticator = new SASLAuthenticator(
          this,
          this.logger,
          this.versions,
          this.supportAuthenticationProtocol
        )

        await authenticator.authenticate()
        this.authenticatedAt = process.hrtime()
        this.sessionLifetime = Long.fromValue(authenticator.sessionLifetime)
      }
    })
  }

  getSupportAuthenticationProtocol() {
    return this.supportAuthenticationProtocol
  }

  setSupportAuthenticationProtocol(isSupported) {
    this.supportAuthenticationProtocol = isSupported
  }

  setVersions(versions) {
    this.versions = versions
  }

  isConnected() {
    return CONNECTED_STATUS.includes(this.connectionStatus)
  }

  /**
   * @public
   * @returns {Promise}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        return resolve(true)
      }

      this.authenticatedAt = null

      let timeoutId

      const onConnect = () => {
        clearTimeout(timeoutId)
        this.connectionStatus = CONNECTION_STATUS.CONNECTED
        this.requestQueue.scheduleRequestTimeoutCheck()
        resolve(true)
      }

      const onData = data => {
        this.processData(data)
      }

      const onEnd = async () => {
        clearTimeout(timeoutId)

        const wasConnected = this.isConnected()

        if (this.authHandlers) {
          this.authHandlers.onError()
        } else if (wasConnected) {
          this.logDebug('Kafka server has closed connection')
          this.rejectRequests(
            new KafkaJSConnectionClosedError('Closed connection', {
              host: this.host,
              port: this.port,
            })
          )
        }

        await this.disconnect()
      }

      const onError = async e => {
        clearTimeout(timeoutId)

        const error = new KafkaJSConnectionError(`Connection error: ${e.message}`, {
          broker: `${this.host}:${this.port}`,
          code: e.code,
        })

        this.logError(error.message, { stack: e.stack })
        this.rejectRequests(error)
        await this.disconnect()

        reject(error)
      }

      const onTimeout = async () => {
        const error = new KafkaJSConnectionError('Connection timeout', {
          broker: `${this.host}:${this.port}`,
        })

        this.logError(error.message)
        this.rejectRequests(error)
        await this.disconnect()
        reject(error)
      }

      this.logDebug(`Connecting`, {
        ssl: !!this.ssl,
        sasl: !!this.sasl,
      })

      try {
        timeoutId = setTimeout(onTimeout, this.connectionTimeout)
        this.socket = createSocket({
          socketFactory: this.socketFactory,
          host: this.host,
          port: this.port,
          ssl: this.ssl,
          onConnect,
          onData,
          onEnd,
          onError,
          onTimeout,
        })
      } catch (e) {
        clearTimeout(timeoutId)
        reject(
          new KafkaJSConnectionError(`Failed to connect: ${e.message}`, {
            broker: `${this.host}:${this.port}`,
          })
        )
      }
    })
  }

  /**
   * @public
   * @returns {Promise}
   */
  async disconnect() {
    this.authenticatedAt = null
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTING
    this.logDebug('disconnecting...')

    await this.requestQueue.waitForPendingRequests()
    this.requestQueue.destroy()

    if (this.socket) {
      this.socket.end()
      this.socket.unref()
    }

    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED
    this.logDebug('disconnected')
    return true
  }

  /**
   * @public
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.authenticatedAt != null && !this[PRIVATE.SHOULD_REAUTHENTICATE]()
  }

  /***
   * @private
   */
  [PRIVATE.SHOULD_REAUTHENTICATE]() {
    if (this.sessionLifetime.equals(Long.ZERO)) {
      return false
    }

    if (this.authenticatedAt == null) {
      return true
    }

    const [secondsSince, remainingNanosSince] = process.hrtime(this.authenticatedAt)
    const millisSince = Long.fromValue(secondsSince)
      .multiply(1000)
      .add(Long.fromValue(remainingNanosSince).divide(1000000))

    const reauthenticateAt = millisSince.add(this.reauthenticationThreshold)
    return reauthenticateAt.greaterThanOrEqual(this.sessionLifetime)
  }

  /** @public */
  async authenticate() {
    await this[PRIVATE.AUTHENTICATE]()
  }

  /**
   * @public
   * @returns {Promise}
   */
  sendAuthRequest({ request, response }) {
    this.authExpectResponse = !!response

    /**
     * TODO: rewrite removing the async promise executor
     */

    /* eslint-disable no-async-promise-executor */
    return new Promise(async (resolve, reject) => {
      this.authHandlers = {
        onSuccess: rawData => {
          this.authHandlers = null
          this.authExpectResponse = false

          response
            .decode(rawData)
            .then(data => response.parse(data))
            .then(resolve)
            .catch(reject)
        },
        onError: () => {
          this.authHandlers = null
          this.authExpectResponse = false

          reject(
            new KafkaJSConnectionError('Connection closed by the server', {
              broker: `${this.host}:${this.port}`,
            })
          )
        },
      }

      try {
        const requestPayload = await request.encode()

        this.failIfNotConnected()
        this.socket.write(requestPayload, 'binary')
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * @public
   * @param {object} protocol
   * @param {object} protocol.request It is defined by the protocol and consists of an object with "apiKey",
   *                         "apiVersion", "apiName" and an "encode" function. The encode function
   *                         must return an instance of Encoder
   *
   * @param {object} protocol.response It is defined by the protocol and consists of an object with two functions:
   *                          "decode" and "parse"
   *
   * @param {number} [protocol.requestTimeout=null] Override for the default requestTimeout
   * @param {boolean} [protocol.logResponseError=true] Whether to log errors
   * @returns {Promise<data>} where data is the return of "response#parse"
   */
  async send({ request, response, requestTimeout = null, logResponseError = true }) {
    if (!this.isAuthenticated() && isAuthenticatedRequest(request)) {
      await this[PRIVATE.AUTHENTICATE]()
    }

    this.failIfNotConnected()

    const expectResponse = !request.expectResponse || request.expectResponse()
    const sendRequest = async () => {
      const { clientId } = this
      const correlationId = this.nextCorrelationId()

      const requestPayload = await createRequest({ request, correlationId, clientId })
      const { apiKey, apiName, apiVersion } = request
      this.logDebug(`Request ${requestInfo(request)}`, {
        correlationId,
        expectResponse,
        size: Buffer.byteLength(requestPayload.buffer),
      })

      return new Promise((resolve, reject) => {
        try {
          this.failIfNotConnected()
          const entry = { apiKey, apiName, apiVersion, correlationId, resolve, reject }

          this.requestQueue.push({
            entry,
            expectResponse,
            requestTimeout,
            sendRequest: () => {
              this.socket.write(requestPayload.buffer, 'binary')
            },
          })
        } catch (e) {
          reject(e)
        }
      })
    }

    const { correlationId, size, entry, payload } = await sendRequest()

    if (!expectResponse) {
      return
    }

    try {
      const payloadDecoded = await response.decode(payload)

      /**
       * @see KIP-219
       * If the response indicates that the client-side needs to throttle, do that.
       */
      this.requestQueue.maybeThrottle(payloadDecoded.clientSideThrottleTime)

      const data = await response.parse(payloadDecoded)
      const isFetchApi = entry.apiName === 'Fetch'
      this.logDebug(`Response ${requestInfo(entry)}`, {
        correlationId,
        size,
        data: isFetchApi && !this.shouldLogFetchBuffer ? '[filtered]' : data,
      })

      return data
    } catch (e) {
      if (logResponseError) {
        this.logError(`Response ${requestInfo(entry)}`, {
          error: e.message,
          correlationId,
          size,
        })
      }

      const isBuffer = Buffer.isBuffer(payload)
      this.logDebug(`Response ${requestInfo(entry)}`, {
        error: e.message,
        correlationId,
        payload:
          isBuffer && !this.shouldLogBuffers ? { type: 'Buffer', data: '[filtered]' } : payload,
      })

      throw e
    }
  }

  /**
   * @private
   */
  failIfNotConnected() {
    if (!this.isConnected()) {
      throw new KafkaJSConnectionError('Not connected', {
        broker: `${this.host}:${this.port}`,
      })
    }
  }

  /**
   * @private
   */
  nextCorrelationId() {
    if (this.correlationId >= INT_32_MAX_VALUE) {
      this.correlationId = 0
    }

    return this.correlationId++
  }

  /**
   * @private
   */
  processData(rawData) {
    if (this.authHandlers && !this.authExpectResponse) {
      return this.authHandlers.onSuccess(rawData)
    }

    // Accumulate the new chunk
    this.chunks.push(rawData)
    this.bytesBuffered += Buffer.byteLength(rawData)

    // Process data if there are enough bytes to read the expected response size,
    // otherwise keep buffering
    while (this.bytesNeeded <= this.bytesBuffered) {
      const buffer = this.chunks.length > 1 ? Buffer.concat(this.chunks) : this.chunks[0]
      const decoder = new Decoder(buffer)
      const expectedResponseSize = decoder.readInt32()

      // Return early if not enough bytes to read the full response
      if (!decoder.canReadBytes(expectedResponseSize)) {
        this.chunks = [buffer]
        this.bytesBuffered = Buffer.byteLength(buffer)
        this.bytesNeeded = Decoder.int32Size() + expectedResponseSize
        return
      }

      const response = new Decoder(decoder.readBytes(expectedResponseSize))

      // Reset the buffered chunks as the rest of the bytes
      const remainderBuffer = decoder.readAll()
      this.chunks = [remainderBuffer]
      this.bytesBuffered = Buffer.byteLength(remainderBuffer)
      this.bytesNeeded = Decoder.int32Size()

      if (this.authHandlers) {
        const rawResponseSize = Decoder.int32Size() + expectedResponseSize
        const rawResponseBuffer = buffer.slice(0, rawResponseSize)
        return this.authHandlers.onSuccess(rawResponseBuffer)
      }

      const correlationId = response.readInt32()
      const payload = response.readAll()

      this.requestQueue.fulfillRequest({
        size: expectedResponseSize,
        correlationId,
        payload,
      })
    }
  }

  /**
   * @private
   */
  rejectRequests(error) {
    this.requestQueue.rejectAll(error)
  }
}
