'use strict'

const diagnosticsChannel = require('node:diagnostics_channel')
const util = require('node:util')

const undiciDebugLog = util.debuglog('undici')
const fetchDebuglog = util.debuglog('fetch')
const websocketDebuglog = util.debuglog('websocket')

const channels = {
  // Client
  beforeConnect: diagnosticsChannel.channel('undici:client:beforeConnect'),
  connected: diagnosticsChannel.channel('undici:client:connected'),
  connectError: diagnosticsChannel.channel('undici:client:connectError'),
  sendHeaders: diagnosticsChannel.channel('undici:client:sendHeaders'),
  // Request
  create: diagnosticsChannel.channel('undici:request:create'),
  bodySent: diagnosticsChannel.channel('undici:request:bodySent'),
  bodyChunkSent: diagnosticsChannel.channel('undici:request:bodyChunkSent'),
  bodyChunkReceived: diagnosticsChannel.channel('undici:request:bodyChunkReceived'),
  headers: diagnosticsChannel.channel('undici:request:headers'),
  trailers: diagnosticsChannel.channel('undici:request:trailers'),
  error: diagnosticsChannel.channel('undici:request:error'),
  // WebSocket
  open: diagnosticsChannel.channel('undici:websocket:open'),
  close: diagnosticsChannel.channel('undici:websocket:close'),
  socketError: diagnosticsChannel.channel('undici:websocket:socket_error'),
  ping: diagnosticsChannel.channel('undici:websocket:ping'),
  pong: diagnosticsChannel.channel('undici:websocket:pong'),
  // ProxyAgent
  proxyConnected: diagnosticsChannel.channel('undici:proxy:connected')
}

let isTrackingClientEvents = false

function trackClientEvents (debugLog = undiciDebugLog) {
  if (isTrackingClientEvents) {
    return
  }

  // Check if any of the channels already have subscribers to prevent duplicate subscriptions
  // This can happen when both Node.js built-in undici and undici as a dependency are present
  if (channels.beforeConnect.hasSubscribers || channels.connected.hasSubscribers ||
      channels.connectError.hasSubscribers || channels.sendHeaders.hasSubscribers) {
    isTrackingClientEvents = true
    return
  }

  isTrackingClientEvents = true

  diagnosticsChannel.subscribe('undici:client:beforeConnect',
    evt => {
      const {
        connectParams: { version, protocol, port, host }
      } = evt
      debugLog(
        'connecting to %s%s using %s%s',
        host,
        port ? `:${port}` : '',
        protocol,
        version
      )
    })

  diagnosticsChannel.subscribe('undici:client:connected',
    evt => {
      const {
        connectParams: { version, protocol, port, host }
      } = evt
      debugLog(
        'connected to %s%s using %s%s',
        host,
        port ? `:${port}` : '',
        protocol,
        version
      )
    })

  diagnosticsChannel.subscribe('undici:client:connectError',
    evt => {
      const {
        connectParams: { version, protocol, port, host },
        error
      } = evt
      debugLog(
        'connection to %s%s using %s%s errored - %s',
        host,
        port ? `:${port}` : '',
        protocol,
        version,
        error.message
      )
    })

  diagnosticsChannel.subscribe('undici:client:sendHeaders',
    evt => {
      const {
        request: { method, path, origin }
      } = evt
      debugLog('sending request to %s %s%s', method, origin, path)
    })
}

let isTrackingRequestEvents = false

function trackRequestEvents (debugLog = undiciDebugLog) {
  if (isTrackingRequestEvents) {
    return
  }

  // Check if any of the channels already have subscribers to prevent duplicate subscriptions
  // This can happen when both Node.js built-in undici and undici as a dependency are present
  if (channels.headers.hasSubscribers || channels.trailers.hasSubscribers ||
      channels.error.hasSubscribers) {
    isTrackingRequestEvents = true
    return
  }

  isTrackingRequestEvents = true

  diagnosticsChannel.subscribe('undici:request:headers',
    evt => {
      const {
        request: { method, path, origin },
        response: { statusCode }
      } = evt
      debugLog(
        'received response to %s %s%s - HTTP %d',
        method,
        origin,
        path,
        statusCode
      )
    })

  diagnosticsChannel.subscribe('undici:request:trailers',
    evt => {
      const {
        request: { method, path, origin }
      } = evt
      debugLog('trailers received from %s %s%s', method, origin, path)
    })

  diagnosticsChannel.subscribe('undici:request:error',
    evt => {
      const {
        request: { method, path, origin },
        error
      } = evt
      debugLog(
        'request to %s %s%s errored - %s',
        method,
        origin,
        path,
        error.message
      )
    })
}

let isTrackingWebSocketEvents = false

function trackWebSocketEvents (debugLog = websocketDebuglog) {
  if (isTrackingWebSocketEvents) {
    return
  }

  // Check if any of the channels already have subscribers to prevent duplicate subscriptions
  // This can happen when both Node.js built-in undici and undici as a dependency are present
  if (channels.open.hasSubscribers || channels.close.hasSubscribers ||
      channels.socketError.hasSubscribers || channels.ping.hasSubscribers ||
      channels.pong.hasSubscribers) {
    isTrackingWebSocketEvents = true
    return
  }

  isTrackingWebSocketEvents = true

  diagnosticsChannel.subscribe('undici:websocket:open',
    evt => {
      const {
        address: { address, port }
      } = evt
      debugLog('connection opened %s%s', address, port ? `:${port}` : '')
    })

  diagnosticsChannel.subscribe('undici:websocket:close',
    evt => {
      const { websocket, code, reason } = evt
      debugLog(
        'closed connection to %s - %s %s',
        websocket.url,
        code,
        reason
      )
    })

  diagnosticsChannel.subscribe('undici:websocket:socket_error',
    err => {
      debugLog('connection errored - %s', err.message)
    })

  diagnosticsChannel.subscribe('undici:websocket:ping',
    evt => {
      debugLog('ping received')
    })

  diagnosticsChannel.subscribe('undici:websocket:pong',
    evt => {
      debugLog('pong received')
    })
}

if (undiciDebugLog.enabled || fetchDebuglog.enabled) {
  trackClientEvents(fetchDebuglog.enabled ? fetchDebuglog : undiciDebugLog)
  trackRequestEvents(fetchDebuglog.enabled ? fetchDebuglog : undiciDebugLog)
}

if (websocketDebuglog.enabled) {
  trackClientEvents(undiciDebugLog.enabled ? undiciDebugLog : websocketDebuglog)
  trackWebSocketEvents(websocketDebuglog)
}

module.exports = {
  channels
}
