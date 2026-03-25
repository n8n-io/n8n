'use strict'

const { request_overrider: debug } = require('./debug')
const { IncomingMessage, ClientRequest } = require('http')
const propagate = require('propagate')
const common = require('./common')
const globalEmitter = require('./global_emitter')
const Socket = require('./socket')
const { playbackInterceptor } = require('./playback_interceptor')

function socketOnClose(req) {
  debug('socket close')

  if (!req.res && !req.socket._hadError) {
    // If we don't have a response then we know that the socket
    // ended prematurely and we need to emit an error on the request.
    req.socket._hadError = true
    const err = new Error('socket hang up')
    err.code = 'ECONNRESET'
    req.emit('error', err)
  }
  req.emit('close')
}

/**
 * Given a group of interceptors, appropriately route an outgoing request.
 * Identify which interceptor ought to respond, if any, then delegate to
 * `playbackInterceptor()` to consume the request itself.
 */
class InterceptedRequestRouter {
  constructor({ req, options, interceptors }) {
    this.req = req
    this.options = {
      // We may be changing the options object and we don't want those changes
      // affecting the user so we use a clone of the object.
      ...options,
      // We use lower-case header field names throughout Nock.
      headers: common.headersFieldNamesToLowerCase(
        options.headers || {},
        false,
      ),
    }
    this.interceptors = interceptors

    this.socket = new Socket(options)

    // support setting `timeout` using request `options`
    // https://nodejs.org/docs/latest-v12.x/api/http.html#http_http_request_url_options_callback
    // any timeout in the request options override any timeout in the agent options.
    // per https://github.com/nodejs/node/pull/21204
    const timeout =
      options.timeout ||
      (options.agent && options.agent.options && options.agent.options.timeout)

    if (timeout) {
      this.socket.setTimeout(timeout)
    }

    this.response = new IncomingMessage(this.socket)
    this.requestBodyBuffers = []
    this.playbackStarted = false

    // For parity with Node, it's important the socket event is emitted before we begin playback.
    // This flag is set when playback is triggered if we haven't yet gotten the
    // socket event to indicate that playback should start as soon as it comes in.
    this.readyToStartPlaybackOnSocketEvent = false

    this.attachToReq()

    // Emit a fake socket event on the next tick to mimic what would happen on a real request.
    // Some clients listen for a 'socket' event to be emitted before calling end(),
    // which causes Nock to hang.
    process.nextTick(() => this.connectSocket())
  }

  attachToReq() {
    const { req, options } = this

    for (const [name, val] of Object.entries(options.headers)) {
      req.setHeader(name.toLowerCase(), val)
    }

    if (options.auth && !options.headers.authorization) {
      req.setHeader(
        // We use lower-case header field names throughout Nock.
        'authorization',
        `Basic ${Buffer.from(options.auth).toString('base64')}`,
      )
    }

    req.path = options.path
    req.method = options.method

    req.write = (...args) => this.handleWrite(...args)
    req.end = (...args) => this.handleEnd(...args)
    req.flushHeaders = (...args) => this.handleFlushHeaders(...args)

    // https://github.com/nock/nock/issues/256
    if (options.headers.expect === '100-continue') {
      common.setImmediate(() => {
        debug('continue')
        req.emit('continue')
      })
    }
  }

  connectSocket() {
    const { req, socket } = this

    if (common.isRequestDestroyed(req)) {
      return
    }

    // ClientRequest.connection is an alias for ClientRequest.socket
    // https://nodejs.org/api/http.html#http_request_socket
    // https://github.com/nodejs/node/blob/b0f75818f39ed4e6bd80eb7c4010c1daf5823ef7/lib/_http_client.js#L640-L641
    // The same Socket is shared between the request and response to mimic native behavior.
    req.socket = req.connection = socket

    propagate(['error', 'timeout'], socket, req)
    socket.on('close', () => socketOnClose(req))

    socket.connecting = false
    req.emit('socket', socket)

    // https://nodejs.org/api/net.html#net_event_connect
    socket.emit('connect')

    // https://nodejs.org/api/tls.html#tls_event_secureconnect
    if (socket.authorized) {
      socket.emit('secureConnect')
    }

    if (this.readyToStartPlaybackOnSocketEvent) {
      this.maybeStartPlayback()
    }
  }

  // from docs: When write function is called with empty string or buffer, it does nothing and waits for more input.
  // However, actually implementation checks the state of finished and aborted before checking if the first arg is empty.
  handleWrite(...args) {
    debug('request write')

    let [buffer, encoding] = args

    const { req } = this

    if (req.finished) {
      const err = new Error('write after end')
      err.code = 'ERR_STREAM_WRITE_AFTER_END'
      process.nextTick(() => req.emit('error', err))

      // It seems odd to return `true` here, not sure why you'd want to have
      // the stream potentially written to more, but it's what Node does.
      // https://github.com/nodejs/node/blob/a9270dcbeba4316b1e179b77ecb6c46af5aa8c20/lib/_http_outgoing.js#L662-L665
      return true
    }

    if (req.socket && req.socket.destroyed) {
      return false
    }

    if (!buffer) {
      return true
    }

    if (!Buffer.isBuffer(buffer)) {
      buffer = Buffer.from(buffer, encoding)
    }
    this.requestBodyBuffers.push(buffer)

    // writable.write encoding param is optional
    // so if callback is present it's the last argument
    const callback = args.length > 1 ? args[args.length - 1] : undefined
    // can't use instanceof Function because some test runners
    // run tests in vm.runInNewContext where Function is not same
    // as that in the current context
    // https://github.com/nock/nock/pull/1754#issuecomment-571531407
    if (typeof callback === 'function') {
      callback()
    }

    common.setImmediate(function () {
      req.emit('drain')
    })

    return false
  }

  handleEnd(chunk, encoding, callback) {
    debug('request end')
    const { req } = this

    // handle the different overloaded arg signatures
    if (typeof chunk === 'function') {
      callback = chunk
      chunk = null
    } else if (typeof encoding === 'function') {
      callback = encoding
      encoding = null
    }

    if (typeof callback === 'function') {
      req.once('finish', callback)
    }

    if (chunk) {
      req.write(chunk, encoding)
    }
    req.finished = true
    this.maybeStartPlayback()

    return req
  }

  handleFlushHeaders() {
    debug('request flushHeaders')
    this.maybeStartPlayback()
  }

  /**
   * Set request headers of the given request. This is needed both during the
   * routing phase, in case header filters were specified, and during the
   * interceptor-playback phase, to correctly pass mocked request headers.
   * TODO There are some problems with this; see https://github.com/nock/nock/issues/1718
   */
  setHostHeaderUsingInterceptor(interceptor) {
    const { req, options } = this

    // If a filtered scope is being used we have to use scope's host in the
    // header, otherwise 'host' header won't match.
    // NOTE: We use lower-case header field names throughout Nock.
    const HOST_HEADER = 'host'
    if (interceptor.__nock_filteredScope && interceptor.__nock_scopeHost) {
      options.headers[HOST_HEADER] = interceptor.__nock_scopeHost
      req.setHeader(HOST_HEADER, interceptor.__nock_scopeHost)
    } else {
      // For all other cases, we always add host header equal to the requested
      // host unless it was already defined.
      if (options.host && !req.getHeader(HOST_HEADER)) {
        let hostHeader = options.host

        if (options.port === 80 || options.port === 443) {
          hostHeader = hostHeader.split(':')[0]
        }

        req.setHeader(HOST_HEADER, hostHeader)
      }
    }
  }

  maybeStartPlayback() {
    const { req, socket, playbackStarted } = this

    // In order to get the events in the right order we need to delay playback
    // if we get here before the `socket` event is emitted.
    if (socket.connecting) {
      this.readyToStartPlaybackOnSocketEvent = true
      return
    }

    if (!common.isRequestDestroyed(req) && !playbackStarted) {
      this.startPlayback()
    }
  }

  startPlayback() {
    debug('ending')
    this.playbackStarted = true

    const { req, response, socket, options, interceptors } = this

    Object.assign(options, {
      // Re-update `options` with the current value of `req.path` because badly
      // behaving agents like superagent like to change `req.path` mid-flight.
      path: req.path,
      // Similarly, node-http-proxy will modify headers in flight, so we have
      // to put the headers back into options.
      // https://github.com/nock/nock/pull/1484
      headers: req.getHeaders(),
      // Fixes https://github.com/nock/nock/issues/976
      protocol: `${options.proto}:`,
    })

    interceptors.forEach(interceptor => {
      this.setHostHeaderUsingInterceptor(interceptor)
    })

    const requestBodyBuffer = Buffer.concat(this.requestBodyBuffers)
    // When request body is a binary buffer we internally use in its hexadecimal
    // representation.
    const requestBodyIsUtf8Representable =
      common.isUtf8Representable(requestBodyBuffer)
    const requestBodyString = requestBodyBuffer.toString(
      requestBodyIsUtf8Representable ? 'utf8' : 'hex',
    )

    const matchedInterceptor = interceptors.find(i =>
      i.match(req, options, requestBodyString),
    )

    if (matchedInterceptor) {
      matchedInterceptor.scope.logger(
        'interceptor identified, starting mocking',
      )

      matchedInterceptor.markConsumed()

      // wait to emit the finish event until we know for sure an Interceptor is going to playback.
      // otherwise an unmocked request might emit finish twice.
      req.emit('finish')

      playbackInterceptor({
        req,
        socket,
        options,
        requestBodyString,
        requestBodyIsUtf8Representable,
        response,
        interceptor: matchedInterceptor,
      })
    } else {
      globalEmitter.emit('no match', req, options, requestBodyString)

      // Try to find a hostname match that allows unmocked.
      const allowUnmocked = interceptors.some(
        i => i.matchHostName(options) && i.options.allowUnmocked,
      )

      if (allowUnmocked && req instanceof ClientRequest) {
        req.emit('real-request')
      } else {
        const reqStr = common.stringifyRequest(options, requestBodyString)
        const err = new Error(`Nock: No match for request ${reqStr}`)
        err.code = 'ERR_NOCK_NO_MATCH'
        err.statusCode = err.status = 404
        req.destroy(err)
      }
    }
  }
}

module.exports = { InterceptedRequestRouter }
