'use strict'

const { EventEmitter } = require('node:events')
const { Buffer } = require('node:buffer')
const { InvalidArgumentError, Socks5ProxyError } = require('./errors')
const { debuglog } = require('node:util')
const { parseAddress } = require('./socks5-utils')

const debug = debuglog('undici:socks5')

// SOCKS5 constants
const SOCKS_VERSION = 0x05

// Authentication methods
const AUTH_METHODS = {
  NO_AUTH: 0x00,
  GSSAPI: 0x01,
  USERNAME_PASSWORD: 0x02,
  NO_ACCEPTABLE: 0xFF
}

// SOCKS5 commands
const COMMANDS = {
  CONNECT: 0x01,
  BIND: 0x02,
  UDP_ASSOCIATE: 0x03
}

// Address types
const ADDRESS_TYPES = {
  IPV4: 0x01,
  DOMAIN: 0x03,
  IPV6: 0x04
}

// Reply codes
const REPLY_CODES = {
  SUCCEEDED: 0x00,
  GENERAL_FAILURE: 0x01,
  CONNECTION_NOT_ALLOWED: 0x02,
  NETWORK_UNREACHABLE: 0x03,
  HOST_UNREACHABLE: 0x04,
  CONNECTION_REFUSED: 0x05,
  TTL_EXPIRED: 0x06,
  COMMAND_NOT_SUPPORTED: 0x07,
  ADDRESS_TYPE_NOT_SUPPORTED: 0x08
}

// State machine states
const STATES = {
  INITIAL: 'initial',
  HANDSHAKING: 'handshaking',
  AUTHENTICATING: 'authenticating',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  CLOSED: 'closed'
}

/**
 * SOCKS5 client implementation
 * Handles SOCKS5 protocol negotiation and connection establishment
 */
class Socks5Client extends EventEmitter {
  constructor (socket, options = {}) {
    super()

    if (!socket) {
      throw new InvalidArgumentError('socket is required')
    }

    this.socket = socket
    this.options = options
    this.state = STATES.INITIAL
    this.buffer = Buffer.alloc(0)

    // Authentication settings
    this.authMethods = []
    if (options.username && options.password) {
      this.authMethods.push(AUTH_METHODS.USERNAME_PASSWORD)
    }
    this.authMethods.push(AUTH_METHODS.NO_AUTH)

    // Socket event handlers
    this.socket.on('data', this.onData.bind(this))
    this.socket.on('error', this.onError.bind(this))
    this.socket.on('close', this.onClose.bind(this))
  }

  /**
   * Handle incoming data from the socket
   */
  onData (data) {
    debug('received data', data.length, 'bytes in state', this.state)
    this.buffer = Buffer.concat([this.buffer, data])

    try {
      switch (this.state) {
        case STATES.HANDSHAKING:
          this.handleHandshakeResponse()
          break
        case STATES.AUTHENTICATING:
          this.handleAuthResponse()
          break
        case STATES.CONNECTING:
          this.handleConnectResponse()
          break
      }
    } catch (err) {
      this.onError(err)
    }
  }

  /**
   * Handle socket errors
   */
  onError (err) {
    debug('socket error', err)
    this.state = STATES.ERROR
    this.emit('error', err)
    this.destroy()
  }

  /**
   * Handle socket close
   */
  onClose () {
    debug('socket closed')
    this.state = STATES.CLOSED
    this.emit('close')
  }

  /**
   * Destroy the client and underlying socket
   */
  destroy () {
    if (this.socket && !this.socket.destroyed) {
      this.socket.destroy()
    }
  }

  /**
   * Start the SOCKS5 handshake
   */
  handshake () {
    if (this.state !== STATES.INITIAL) {
      throw new InvalidArgumentError('Handshake already started')
    }

    debug('starting handshake with', this.authMethods.length, 'auth methods')
    this.state = STATES.HANDSHAKING

    // Build handshake request
    // +----+----------+----------+
    // |VER | NMETHODS | METHODS  |
    // +----+----------+----------+
    // | 1  |    1     | 1 to 255 |
    // +----+----------+----------+
    const request = Buffer.alloc(2 + this.authMethods.length)
    request[0] = SOCKS_VERSION
    request[1] = this.authMethods.length
    this.authMethods.forEach((method, i) => {
      request[2 + i] = method
    })

    this.socket.write(request)
  }

  /**
   * Handle handshake response from server
   */
  handleHandshakeResponse () {
    if (this.buffer.length < 2) {
      return // Not enough data yet
    }

    const version = this.buffer[0]
    const method = this.buffer[1]

    if (version !== SOCKS_VERSION) {
      throw new Socks5ProxyError(`Invalid SOCKS version: ${version}`, 'UND_ERR_SOCKS5_VERSION')
    }

    if (method === AUTH_METHODS.NO_ACCEPTABLE) {
      throw new Socks5ProxyError('No acceptable authentication method', 'UND_ERR_SOCKS5_AUTH_REJECTED')
    }

    this.buffer = this.buffer.subarray(2)
    debug('server selected auth method', method)

    if (method === AUTH_METHODS.NO_AUTH) {
      this.emit('authenticated')
    } else if (method === AUTH_METHODS.USERNAME_PASSWORD) {
      this.state = STATES.AUTHENTICATING
      this.sendAuthRequest()
    } else {
      throw new Socks5ProxyError(`Unsupported authentication method: ${method}`, 'UND_ERR_SOCKS5_AUTH_METHOD')
    }
  }

  /**
   * Send username/password authentication request
   */
  sendAuthRequest () {
    const { username, password } = this.options

    if (!username || !password) {
      throw new InvalidArgumentError('Username and password required for authentication')
    }

    debug('sending username/password auth')

    // Username/Password authentication request (RFC 1929)
    // +----+------+----------+------+----------+
    // |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
    // +----+------+----------+------+----------+
    // | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
    // +----+------+----------+------+----------+
    const usernameBuffer = Buffer.from(username)
    const passwordBuffer = Buffer.from(password)

    if (usernameBuffer.length > 255 || passwordBuffer.length > 255) {
      throw new InvalidArgumentError('Username or password too long')
    }

    const request = Buffer.alloc(3 + usernameBuffer.length + passwordBuffer.length)
    request[0] = 0x01 // Sub-negotiation version
    request[1] = usernameBuffer.length
    usernameBuffer.copy(request, 2)
    request[2 + usernameBuffer.length] = passwordBuffer.length
    passwordBuffer.copy(request, 3 + usernameBuffer.length)

    this.socket.write(request)
  }

  /**
   * Handle authentication response
   */
  handleAuthResponse () {
    if (this.buffer.length < 2) {
      return // Not enough data yet
    }

    const version = this.buffer[0]
    const status = this.buffer[1]

    if (version !== 0x01) {
      throw new Socks5ProxyError(`Invalid auth sub-negotiation version: ${version}`, 'UND_ERR_SOCKS5_AUTH_VERSION')
    }

    if (status !== 0x00) {
      throw new Socks5ProxyError('Authentication failed', 'UND_ERR_SOCKS5_AUTH_FAILED')
    }

    this.buffer = this.buffer.subarray(2)
    debug('authentication successful')
    this.emit('authenticated')
  }

  /**
   * Send CONNECT command
   * @param {string} address - Target address (IP or domain)
   * @param {number} port - Target port
   */
  connect (address, port) {
    if (this.state === STATES.CONNECTED) {
      throw new InvalidArgumentError('Already connected')
    }

    debug('connecting to', address, port)
    this.state = STATES.CONNECTING

    const request = this.buildConnectRequest(COMMANDS.CONNECT, address, port)
    this.socket.write(request)
  }

  /**
   * Build a SOCKS5 request
   */
  buildConnectRequest (command, address, port) {
    // Parse address to determine type and buffer
    const { type: addressType, buffer: addressBuffer } = parseAddress(address)

    // Build request
    // +----+-----+-------+------+----------+----------+
    // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
    // +----+-----+-------+------+----------+----------+
    // | 1  |  1  | X'00' |  1   | Variable |    2     |
    // +----+-----+-------+------+----------+----------+
    const request = Buffer.alloc(4 + addressBuffer.length + 2)
    request[0] = SOCKS_VERSION
    request[1] = command
    request[2] = 0x00 // Reserved
    request[3] = addressType
    addressBuffer.copy(request, 4)
    request.writeUInt16BE(port, 4 + addressBuffer.length)

    return request
  }

  /**
   * Handle CONNECT response
   */
  handleConnectResponse () {
    if (this.buffer.length < 4) {
      return // Not enough data for header
    }

    const version = this.buffer[0]
    const reply = this.buffer[1]
    const addressType = this.buffer[3]

    if (version !== SOCKS_VERSION) {
      throw new Socks5ProxyError(`Invalid SOCKS version in reply: ${version}`, 'UND_ERR_SOCKS5_REPLY_VERSION')
    }

    // Calculate the expected response length
    let responseLength = 4 // VER + REP + RSV + ATYP
    if (addressType === ADDRESS_TYPES.IPV4) {
      responseLength += 4 + 2 // IPv4 + port
    } else if (addressType === ADDRESS_TYPES.DOMAIN) {
      if (this.buffer.length < 5) {
        return // Need domain length byte
      }
      responseLength += 1 + this.buffer[4] + 2 // length byte + domain + port
    } else if (addressType === ADDRESS_TYPES.IPV6) {
      responseLength += 16 + 2 // IPv6 + port
    } else {
      throw new Socks5ProxyError(`Invalid address type in reply: ${addressType}`, 'UND_ERR_SOCKS5_ADDR_TYPE')
    }

    if (this.buffer.length < responseLength) {
      return // Not enough data for full response
    }

    if (reply !== REPLY_CODES.SUCCEEDED) {
      const errorMessage = this.getReplyErrorMessage(reply)
      throw new Socks5ProxyError(`SOCKS5 connection failed: ${errorMessage}`, `UND_ERR_SOCKS5_REPLY_${reply}`)
    }

    // Parse bound address and port
    let boundAddress
    let offset = 4

    if (addressType === ADDRESS_TYPES.IPV4) {
      boundAddress = Array.from(this.buffer.subarray(offset, offset + 4)).join('.')
      offset += 4
    } else if (addressType === ADDRESS_TYPES.DOMAIN) {
      const domainLength = this.buffer[offset]
      offset += 1
      boundAddress = this.buffer.subarray(offset, offset + domainLength).toString()
      offset += domainLength
    } else if (addressType === ADDRESS_TYPES.IPV6) {
      // Parse IPv6 address from 16-byte buffer
      const parts = []
      for (let i = 0; i < 8; i++) {
        const value = this.buffer.readUInt16BE(offset + i * 2)
        parts.push(value.toString(16))
      }
      boundAddress = parts.join(':')
      offset += 16
    }

    const boundPort = this.buffer.readUInt16BE(offset)

    this.buffer = this.buffer.subarray(responseLength)
    this.state = STATES.CONNECTED

    debug('connected, bound address:', boundAddress, 'port:', boundPort)
    this.emit('connected', { address: boundAddress, port: boundPort })
  }

  /**
   * Get human-readable error message for reply code
   */
  getReplyErrorMessage (reply) {
    switch (reply) {
      case REPLY_CODES.GENERAL_FAILURE:
        return 'General SOCKS server failure'
      case REPLY_CODES.CONNECTION_NOT_ALLOWED:
        return 'Connection not allowed by ruleset'
      case REPLY_CODES.NETWORK_UNREACHABLE:
        return 'Network unreachable'
      case REPLY_CODES.HOST_UNREACHABLE:
        return 'Host unreachable'
      case REPLY_CODES.CONNECTION_REFUSED:
        return 'Connection refused'
      case REPLY_CODES.TTL_EXPIRED:
        return 'TTL expired'
      case REPLY_CODES.COMMAND_NOT_SUPPORTED:
        return 'Command not supported'
      case REPLY_CODES.ADDRESS_TYPE_NOT_SUPPORTED:
        return 'Address type not supported'
      default:
        return `Unknown error code: ${reply}`
    }
  }
}

module.exports = {
  Socks5Client,
  AUTH_METHODS,
  COMMANDS,
  ADDRESS_TYPES,
  REPLY_CODES,
  STATES
}
