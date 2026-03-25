'use strict'

const { getGlobalDispatcher, setGlobalDispatcher } = require('./lib/global')
const EnvHttpProxyAgent = require('./lib/dispatcher/env-http-proxy-agent')
const fetchImpl = require('./lib/web/fetch').fetch

module.exports.fetch = function fetch (init, options = undefined) {
  return fetchImpl(init, options).catch(err => {
    if (err && typeof err === 'object') {
      Error.captureStackTrace(err)
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
