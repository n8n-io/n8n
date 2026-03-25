'use strict'

const { pipeline } = require('node:stream')
const { fetching } = require('../fetch')
const { makeRequest } = require('../fetch/request')
const { webidl } = require('../fetch/webidl')
const { EventSourceStream } = require('./eventsource-stream')
const { parseMIMEType } = require('../fetch/data-url')
const { createFastMessageEvent } = require('../websocket/events')
const { isNetworkError } = require('../fetch/response')
const { delay } = require('./util')
const { kEnumerableProperty } = require('../../core/util')
const { environmentSettingsObject } = require('../fetch/util')

let experimentalWarned = false

/**
 * A reconnection time, in milliseconds. This must initially be an implementation-defined value,
 * probably in the region of a few seconds.
 *
 * In Comparison:
 * - Chrome uses 3000ms.
 * - Deno uses 5000ms.
 *
 * @type {3000}
 */
const defaultReconnectionTime = 3000

/**
 * The readyState attribute represents the state of the connection.
 * @enum
 * @readonly
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#dom-eventsource-readystate-dev
 */

/**
 * The connection has not yet been established, or it was closed and the user
 * agent is reconnecting.
 * @type {0}
 */
const CONNECTING = 0

/**
 * The user agent has an open connection and is dispatching events as it
 * receives them.
 * @type {1}
 */
const OPEN = 1

/**
 * The connection is not open, and the user agent is not trying to reconnect.
 * @type {2}
 */
const CLOSED = 2

/**
 * Requests for the element will have their mode set to "cors" and their credentials mode set to "same-origin".
 * @type {'anonymous'}
 */
const ANONYMOUS = 'anonymous'

/**
 * Requests for the element will have their mode set to "cors" and their credentials mode set to "include".
 * @type {'use-credentials'}
 */
const USE_CREDENTIALS = 'use-credentials'

/**
 * The EventSource interface is used to receive server-sent events. It
 * connects to a server over HTTP and receives events in text/event-stream
 * format without closing the connection.
 * @extends {EventTarget}
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events
 * @api public
 */
class EventSource extends EventTarget {
  #events = {
    open: null,
    error: null,
    message: null
  }

  #url = null
  #withCredentials = false

  #readyState = CONNECTING

  #request = null
  #controller = null

  #dispatcher

  /**
   * @type {import('./eventsource-stream').eventSourceSettings}
   */
  #state

  /**
   * Creates a new EventSource object.
   * @param {string} url
   * @param {EventSourceInit} [eventSourceInitDict]
   * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#the-eventsource-interface
   */
  constructor (url, eventSourceInitDict = {}) {
    // 1. Let ev be a new EventSource object.
    super()

    webidl.util.markAsUncloneable(this)

    const prefix = 'EventSource constructor'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    if (!experimentalWarned) {
      experimentalWarned = true
      process.emitWarning('EventSource is experimental, expect them to change at any time.', {
        code: 'UNDICI-ES'
      })
    }

    url = webidl.converters.USVString(url, prefix, 'url')
    eventSourceInitDict = webidl.converters.EventSourceInitDict(eventSourceInitDict, prefix, 'eventSourceInitDict')

    this.#dispatcher = eventSourceInitDict.dispatcher
    this.#state = {
      lastEventId: '',
      reconnectionTime: defaultReconnectionTime
    }

    // 2. Let settings be ev's relevant settings object.
    // https://html.spec.whatwg.org/multipage/webappapis.html#environment-settings-object
    const settings = environmentSettingsObject

    let urlRecord

    try {
      // 3. Let urlRecord be the result of encoding-parsing a URL given url, relative to settings.
      urlRecord = new URL(url, settings.settingsObject.baseUrl)
      this.#state.origin = urlRecord.origin
    } catch (e) {
      // 4. If urlRecord is failure, then throw a "SyntaxError" DOMException.
      throw new DOMException(e, 'SyntaxError')
    }

    // 5. Set ev's url to urlRecord.
    this.#url = urlRecord.href

    // 6. Let corsAttributeState be Anonymous.
    let corsAttributeState = ANONYMOUS

    // 7. If the value of eventSourceInitDict's withCredentials member is true,
    // then set corsAttributeState to Use Credentials and set ev's
    // withCredentials attribute to true.
    if (eventSourceInitDict.withCredentials) {
      corsAttributeState = USE_CREDENTIALS
      this.#withCredentials = true
    }

    // 8. Let request be the result of creating a potential-CORS request given
    // urlRecord, the empty string, and corsAttributeState.
    const initRequest = {
      redirect: 'follow',
      keepalive: true,
      // @see https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes
      mode: 'cors',
      credentials: corsAttributeState === 'anonymous'
        ? 'same-origin'
        : 'omit',
      referrer: 'no-referrer'
    }

    // 9. Set request's client to settings.
    initRequest.client = environmentSettingsObject.settingsObject

    // 10. User agents may set (`Accept`, `text/event-stream`) in request's header list.
    initRequest.headersList = [['accept', { name: 'accept', value: 'text/event-stream' }]]

    // 11. Set request's cache mode to "no-store".
    initRequest.cache = 'no-store'

    // 12. Set request's initiator type to "other".
    initRequest.initiator = 'other'

    initRequest.urlList = [new URL(this.#url)]

    // 13. Set ev's request to request.
    this.#request = makeRequest(initRequest)

    this.#connect()
  }

  /**
   * Returns the state of this EventSource object's connection. It can have the
   * values described below.
   * @returns {0|1|2}
   * @readonly
   */
  get readyState () {
    return this.#readyState
  }

  /**
   * Returns the URL providing the event stream.
   * @readonly
   * @returns {string}
   */
  get url () {
    return this.#url
  }

  /**
   * Returns a boolean indicating whether the EventSource object was
   * instantiated with CORS credentials set (true), or not (false, the default).
   */
  get withCredentials () {
    return this.#withCredentials
  }

  #connect () {
    if (this.#readyState === CLOSED) return

    this.#readyState = CONNECTING

    const fetchParams = {
      request: this.#request,
      dispatcher: this.#dispatcher
    }

    // 14. Let processEventSourceEndOfBody given response res be the following step: if res is not a network error, then reestablish the connection.
    const processEventSourceEndOfBody = (response) => {
      if (isNetworkError(response)) {
        this.dispatchEvent(new Event('error'))
        this.close()
      }

      this.#reconnect()
    }

    // 15. Fetch request, with processResponseEndOfBody set to processEventSourceEndOfBody...
    fetchParams.processResponseEndOfBody = processEventSourceEndOfBody

    // and processResponse set to the following steps given response res:
    fetchParams.processResponse = (response) => {
      // 1. If res is an aborted network error, then fail the connection.

      if (isNetworkError(response)) {
        // 1. When a user agent is to fail the connection, the user agent
        // must queue a task which, if the readyState attribute is set to a
        // value other than CLOSED, sets the readyState attribute to CLOSED
        // and fires an event named error at the EventSource object. Once the
        // user agent has failed the connection, it does not attempt to
        // reconnect.
        if (response.aborted) {
          this.close()
          this.dispatchEvent(new Event('error'))
          return
          // 2. Otherwise, if res is a network error, then reestablish the
          // connection, unless the user agent knows that to be futile, in
          // which case the user agent may fail the connection.
        } else {
          this.#reconnect()
          return
        }
      }

      // 3. Otherwise, if res's status is not 200, or if res's `Content-Type`
      // is not `text/event-stream`, then fail the connection.
      const contentType = response.headersList.get('content-type', true)
      const mimeType = contentType !== null ? parseMIMEType(contentType) : 'failure'
      const contentTypeValid = mimeType !== 'failure' && mimeType.essence === 'text/event-stream'
      if (
        response.status !== 200 ||
        contentTypeValid === false
      ) {
        this.close()
        this.dispatchEvent(new Event('error'))
        return
      }

      // 4. Otherwise, announce the connection and interpret res's body
      // line by line.

      // When a user agent is to announce the connection, the user agent
      // must queue a task which, if the readyState attribute is set to a
      // value other than CLOSED, sets the readyState attribute to OPEN
      // and fires an event named open at the EventSource object.
      // @see https://html.spec.whatwg.org/multipage/server-sent-events.html#sse-processing-model
      this.#readyState = OPEN
      this.dispatchEvent(new Event('open'))

      // If redirected to a different origin, set the origin to the new origin.
      this.#state.origin = response.urlList[response.urlList.length - 1].origin

      const eventSourceStream = new EventSourceStream({
        eventSourceSettings: this.#state,
        push: (event) => {
          this.dispatchEvent(createFastMessageEvent(
            event.type,
            event.options
          ))
        }
      })

      pipeline(response.body.stream,
        eventSourceStream,
        (error) => {
          if (
            error?.aborted === false
          ) {
            this.close()
            this.dispatchEvent(new Event('error'))
          }
        })
    }

    this.#controller = fetching(fetchParams)
  }

  /**
   * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#sse-processing-model
   * @returns {Promise<void>}
   */
  async #reconnect () {
    // When a user agent is to reestablish the connection, the user agent must
    // run the following steps. These steps are run in parallel, not as part of
    // a task. (The tasks that it queues, of course, are run like normal tasks
    // and not themselves in parallel.)

    // 1. Queue a task to run the following steps:

    //   1. If the readyState attribute is set to CLOSED, abort the task.
    if (this.#readyState === CLOSED) return

    //   2. Set the readyState attribute to CONNECTING.
    this.#readyState = CONNECTING

    //   3. Fire an event named error at the EventSource object.
    this.dispatchEvent(new Event('error'))

    // 2. Wait a delay equal to the reconnection time of the event source.
    await delay(this.#state.reconnectionTime)

    // 5. Queue a task to run the following steps:

    //   1. If the EventSource object's readyState attribute is not set to
    //      CONNECTING, then return.
    if (this.#readyState !== CONNECTING) return

    //   2. Let request be the EventSource object's request.
    //   3. If the EventSource object's last event ID string is not the empty
    //      string, then:
    //      1. Let lastEventIDValue be the EventSource object's last event ID
    //         string, encoded as UTF-8.
    //      2. Set (`Last-Event-ID`, lastEventIDValue) in request's header
    //         list.
    if (this.#state.lastEventId.length) {
      this.#request.headersList.set('last-event-id', this.#state.lastEventId, true)
    }

    //   4. Fetch request and process the response obtained in this fashion, if any, as described earlier in this section.
    this.#connect()
  }

  /**
   * Closes the connection, if any, and sets the readyState attribute to
   * CLOSED.
   */
  close () {
    webidl.brandCheck(this, EventSource)

    if (this.#readyState === CLOSED) return
    this.#readyState = CLOSED
    this.#controller.abort()
    this.#request = null
  }

  get onopen () {
    return this.#events.open
  }

  set onopen (fn) {
    if (this.#events.open) {
      this.removeEventListener('open', this.#events.open)
    }

    if (typeof fn === 'function') {
      this.#events.open = fn
      this.addEventListener('open', fn)
    } else {
      this.#events.open = null
    }
  }

  get onmessage () {
    return this.#events.message
  }

  set onmessage (fn) {
    if (this.#events.message) {
      this.removeEventListener('message', this.#events.message)
    }

    if (typeof fn === 'function') {
      this.#events.message = fn
      this.addEventListener('message', fn)
    } else {
      this.#events.message = null
    }
  }

  get onerror () {
    return this.#events.error
  }

  set onerror (fn) {
    if (this.#events.error) {
      this.removeEventListener('error', this.#events.error)
    }

    if (typeof fn === 'function') {
      this.#events.error = fn
      this.addEventListener('error', fn)
    } else {
      this.#events.error = null
    }
  }
}

const constantsPropertyDescriptors = {
  CONNECTING: {
    __proto__: null,
    configurable: false,
    enumerable: true,
    value: CONNECTING,
    writable: false
  },
  OPEN: {
    __proto__: null,
    configurable: false,
    enumerable: true,
    value: OPEN,
    writable: false
  },
  CLOSED: {
    __proto__: null,
    configurable: false,
    enumerable: true,
    value: CLOSED,
    writable: false
  }
}

Object.defineProperties(EventSource, constantsPropertyDescriptors)
Object.defineProperties(EventSource.prototype, constantsPropertyDescriptors)

Object.defineProperties(EventSource.prototype, {
  close: kEnumerableProperty,
  onerror: kEnumerableProperty,
  onmessage: kEnumerableProperty,
  onopen: kEnumerableProperty,
  readyState: kEnumerableProperty,
  url: kEnumerableProperty,
  withCredentials: kEnumerableProperty
})

webidl.converters.EventSourceInitDict = webidl.dictionaryConverter([
  {
    key: 'withCredentials',
    converter: webidl.converters.boolean,
    defaultValue: () => false
  },
  {
    key: 'dispatcher', // undici only
    converter: webidl.converters.any
  }
])

module.exports = {
  EventSource,
  defaultReconnectionTime
}
