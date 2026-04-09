'use strict'

const { getGlobalDispatcher, setGlobalDispatcher } = require('./lib/global')
const EnvHttpProxyAgent = require('./lib/dispatcher/env-http-proxy-agent')
const fetchImpl = require('./lib/web/fetch').fetch

// Capture __filename at module load time for stack trace augmentation.
// This may be undefined when bundled in environments like Node.js internals.
const currentFilename = typeof __filename !== 'undefined' ? __filename : undefined

function appendFetchStackTrace (err, filename) {
  if (!err || typeof err !== 'object') {
    return
  }

  const stack = typeof err.stack === 'string' ? err.stack : ''
  const normalizedFilename = filename.replace(/\\/g, '/')

  if (stack && (stack.includes(filename) || stack.includes(normalizedFilename))) {
    return
  }

  const capture = {}
  Error.captureStackTrace(capture, appendFetchStackTrace)

  if (!capture.stack) {
    return
  }

  const captureLines = capture.stack.split('\n').slice(1).join('\n')

  err.stack = stack ? `${stack}\n${captureLines}` : capture.stack
}

module.exports.fetch = function fetch (init, options = undefined) {
  return fetchImpl(init, options).catch(err => {
    if (currentFilename) {
      appendFetchStackTrace(err, currentFilename)
    } else if (err && typeof err === 'object') {
      Error.captureStackTrace(err, module.exports.fetch)
    }
    throw err
  })
}
module.exports.FormData = require('./lib/web/fetch/formdata').FormData
module.exports.Headers = require('./lib/web/fetch/headers').Headers
module.exports.Response = require('./lib/web/fetch/response').Response
module.exports.Request = require('./lib/web/fetch/request').Request

const { CloseEvent, ErrorEvent, MessageEvent, createFastMessageEvent } = require('./lib/web/websocket/events')
module.exports.WebSocket = require('./lib/web/websocket/websocket').WebSocket
module.exports.CloseEvent = CloseEvent
module.exports.ErrorEvent = ErrorEvent
module.exports.MessageEvent = MessageEvent
module.exports.createFastMessageEvent = createFastMessageEvent

module.exports.EventSource = require('./lib/web/eventsource/eventsource').EventSource

const api = require('./lib/api')
const Dispatcher = require('./lib/dispatcher/dispatcher')
Object.assign(Dispatcher.prototype, api)
// Expose the fetch implementation to be enabled in Node.js core via a flag
module.exports.EnvHttpProxyAgent = EnvHttpProxyAgent
module.exports.getGlobalDispatcher = getGlobalDispatcher
module.exports.setGlobalDispatcher = setGlobalDispatcher
