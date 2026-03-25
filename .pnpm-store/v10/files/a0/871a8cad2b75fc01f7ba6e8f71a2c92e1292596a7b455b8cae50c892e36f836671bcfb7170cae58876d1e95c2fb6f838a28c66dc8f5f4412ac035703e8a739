const events = require('events')
const Socket = require('./')
const WebSocketServer = require('ws').Server

class SocketServer extends events.EventEmitter {
  constructor (opts) {
    super()

    this.opts = {
      clientTracking: false,
      perMessageDeflate: false,
      ...opts
    }

    this.destroyed = false

    this._server = new WebSocketServer(this.opts)
    this._server.on('listening', this._handleListening)
    this._server.on('connection', this._handleConnection)
    this._server.once('error', this._handleError)
  }

  address () {
    return this._server.address()
  }

  close (cb) {
    if (this.destroyed) {
      if (cb) cb(new Error('server is closed'))
      return
    }
    this.destroyed = true

    if (cb) this.once('close', cb)

    this._server.removeListener('listening', this._handleListening)
    this._server.removeListener('connection', this._handleConnection)
    this._server.removeListener('error', this._handleError)
    this._server.on('error', () => {}) // suppress future errors

    this._server.close(() => this.emit('close'))
    this._server = null
  }

  _handleListening = () => {
    this.emit('listening')
  }

  _handleConnection = (conn, req) => {
    const socket = new Socket({ ...this.opts, socket: conn })
    this.emit('connection', socket, req)
  }

  _handleError = (err) => {
    this.emit('error', err)
    this.close()
  }
}

module.exports = SocketServer
