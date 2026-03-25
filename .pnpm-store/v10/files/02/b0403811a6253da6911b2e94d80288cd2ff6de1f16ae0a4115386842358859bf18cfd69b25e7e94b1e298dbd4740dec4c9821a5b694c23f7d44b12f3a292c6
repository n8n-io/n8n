'use strict'

const { EventEmitter } = require('events')
const { socket: debug } = require('./debug')

module.exports = class Socket extends EventEmitter {
  constructor(options) {
    super()

    // Pretend this is a TLSSocket
    if (options.proto === 'https') {
      // https://github.com/nock/nock/issues/158
      this.authorized = true
      // https://github.com/nock/nock/issues/2147
      this.encrypted = true
    }

    this.bufferSize = 0
    this.writableLength = 0
    this.writable = true
    this.readable = true
    this.pending = false
    this.destroyed = false
    this.connecting = true

    // Undocumented flag used by ClientRequest to ensure errors aren't double-fired
    this._hadError = false

    // Maximum allowed delay. 0 means unlimited.
    this.timeout = 0

    const ipv6 = options.family === 6
    this.remoteFamily = ipv6 ? 'IPv6' : 'IPv4'
    this.localAddress = this.remoteAddress = ipv6 ? '::1' : '127.0.0.1'
    this.localPort = this.remotePort = parseInt(options.port)
  }

  setNoDelay() {}
  setKeepAlive() {}
  resume() {}
  ref() {}
  unref() {}
  write() {}

  address() {
    return {
      port: this.remotePort,
      family: this.remoteFamily,
      address: this.remoteAddress,
    }
  }

  setTimeout(timeoutMs, fn) {
    this.timeout = timeoutMs
    if (fn) {
      this.once('timeout', fn)
    }
    return this
  }

  /**
   * Artificial delay that will trip socket timeouts when appropriate.
   *
   * Doesn't actually wait for time to pass.
   * Timeout events don't necessarily end the request.
   * While many clients choose to abort the request upon a timeout, Node itself does not.
   */
  applyDelay(delayMs) {
    if (this.timeout && delayMs > this.timeout) {
      debug('socket timeout')
      this.emit('timeout')
    }
  }

  getPeerCertificate() {
    return Buffer.from(
      (Math.random() * 10000 + Date.now()).toString(),
    ).toString('base64')
  }

  /**
   * Denotes that no more I/O activity should happen on this socket.
   *
   * The implementation in Node if far more complex as it juggles underlying async streams.
   * For the purposes of Nock, we just need it to set some flags and on the first call
   * emit a 'close' and optional 'error' event. Both events propagate through the request object.
   */
  destroy(err) {
    if (this.destroyed) {
      return this
    }

    debug('socket destroy')
    this.destroyed = true
    this.readable = this.writable = false
    this.readableEnded = this.writableFinished = true

    process.nextTick(() => {
      if (err) {
        this._hadError = true
        this.emit('error', err)
      }
      this.emit('close')
    })

    return this
  }
}
