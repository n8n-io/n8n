'use strict'
const diagnosticsChannel = require('node:diagnostics_channel')
const util = require('node:util')

const undiciDebugLog = util.debuglog('undici')
const fetchDebuglog = util.debuglog('fetch')
const websocketDebuglog = util.debuglog('websocket')
let isClientSet = false
const channels = {
  // Client
  beforeConnect: diagnosticsChannel.channel('undici:client:beforeConnect'),
  connected: diagnosticsChannel.channel('undici:client:connected'),
  connectError: diagnosticsChannel.channel('undici:client:connectError'),
  sendHeaders: diagnosticsChannel.channel('undici:client:sendHeaders'),
  // Request
  create: diagnosticsChannel.channel('undici:request:create'),
  bodySent: diagnosticsChannel.channel('undici:request:bodySent'),
  headers: diagnosticsChannel.channel('undici:request:headers'),
  trailers: diagnosticsChannel.channel('undici:request:trailers'),
  error: diagnosticsChannel.channel('undici:request:error'),
  // WebSocket
  open: diagnosticsChannel.channel('undici:websocket:open'),
  close: diagnosticsChannel.channel('undici:websocket:close'),
  socketError: diagnosticsChannel.channel('undici:websocket:socket_error'),
  ping: diagnosticsChannel.channel('undici:websocket:ping'),
  pong: diagnosticsChannel.channel('undici:websocket:pong')
}

if (undiciDebugLog.enabled || fetchDebuglog.enabled) {
  const debuglog = fetchDebuglog.enabled ? fetchDebuglog : undiciDebugLog

  // Track all Client events
  diagnosticsChannel.channel('undici:client:beforeConnect').subscribe(evt => {
    const {
      connectParams: { version, protocol, port, host }
    } = evt
    debuglog(
      'connecting to %s using %s%s',
      `${host}${port ? `:${port}` : ''}`,
      protocol,
      version
    )
  })

  diagnosticsChannel.channel('undici:client:connected').subscribe(evt => {
    const {
      connectParams: { version, protocol, port, host }
    } = evt
    debuglog(
      'connected to %s using %s%s',
      `${host}${port ? `:${port}` : ''}`,
      protocol,
      version
    )
  })

  diagnosticsChannel.channel('undici:client:connectError').subscribe(evt => {
    const {
      connectParams: { version, protocol, port, host },
      error
    } = evt
    debuglog(
      'connection to %s using %s%s errored - %s',
      `${host}${port ? `:${port}` : ''}`,
      protocol,
      version,
      error.message
    )
  })

  diagnosticsChannel.channel('undici:client:sendHeaders').subscribe(evt => {
    const {
      request: { method, path, origin }
    } = evt
    debuglog('sending request to %s %s/%s', method, origin, path)
  })

  // Track Request events
  diagnosticsChannel.channel('undici:request:headers').subscribe(evt => {
    const {
      request: { method, path, origin },
      response: { statusCode }
    } = evt
    debuglog(
      'received response to %s %s/%s - HTTP %d',
      method,
      origin,
      path,
      statusCode
    )
  })

  diagnosticsChannel.channel('undici:request:trailers').subscribe(evt => {
    const {
      request: { method, path, origin }
    } = evt
    debuglog('trailers received from %s %s/%s', method, origin, path)
  })

  diagnosticsChannel.channel('undici:request:error').subscribe(evt => {
    const {
      request: { method, path, origin },
      error
    } = evt
    debuglog(
      'request to %s %s/%s errored - %s',
      method,
      origin,
      path,
      error.message
    )
  })

  isClientSet = true
}

if (websocketDebuglog.enabled) {
  if (!isClientSet) {
    const debuglog = undiciDebugLog.enabled ? undiciDebugLog : websocketDebuglog
    diagnosticsChannel.channel('undici:client:beforeConnect').subscribe(evt => {
      const {
        connectParams: { version, protocol, port, host }
      } = evt
      debuglog(
        'connecting to %s%s using %s%s',
        host,
        port ? `:${port}` : '',
        protocol,
        version
      )
    })

    diagnosticsChannel.channel('undici:client:connected').subscribe(evt => {
      const {
        connectParams: { version, protocol, port, host }
      } = evt
      debuglog(
        'connected to %s%s using %s%s',
        host,
        port ? `:${port}` : '',
        protocol,
        version
      )
    })

    diagnosticsChannel.channel('undici:client:connectError').subscribe(evt => {
      const {
        connectParams: { version, protocol, port, host },
        error
      } = evt
      debuglog(
        'connection to %s%s using %s%s errored - %s',
        host,
        port ? `:${port}` : '',
        protocol,
        version,
        error.message
      )
    })

    diagnosticsChannel.channel('undici:client:sendHeaders').subscribe(evt => {
      const {
        request: { method, path, origin }
      } = evt
      debuglog('sending request to %s %s/%s', method, origin, path)
    })
  }

  // Track all WebSocket events
  diagnosticsChannel.channel('undici:websocket:open').subscribe(evt => {
    const {
      address: { address, port }
    } = evt
    websocketDebuglog('connection opened %s%s', address, port ? `:${port}` : '')
  })

  diagnosticsChannel.channel('undici:websocket:close').subscribe(evt => {
    const { websocket, code, reason } = evt
    websocketDebuglog(
      'closed connection to %s - %s %s',
      websocket.url,
      code,
      reason
    )
  })

  diagnosticsChannel.channel('undici:websocket:socket_error').subscribe(err => {
    websocketDebuglog('connection errored - %s', err.message)
  })

  diagnosticsChannel.channel('undici:websocket:ping').subscribe(evt => {
    websocketDebuglog('ping received')
  })

  diagnosticsChannel.channel('undici:websocket:pong').subscribe(evt => {
    websocketDebuglog('pong received')
  })
}

module.exports = {
  channels
}
