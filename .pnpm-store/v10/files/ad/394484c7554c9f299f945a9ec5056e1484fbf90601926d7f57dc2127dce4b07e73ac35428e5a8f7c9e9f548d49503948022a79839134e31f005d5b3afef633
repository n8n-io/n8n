import {createParser, type EventSourceMessage, type EventSourceParser} from 'eventsource-parser'

import {ErrorEvent, flattenError, syntaxError} from './errors.js'
import type {
  AddEventListenerOptions,
  EventListenerOptions,
  EventListenerOrEventListenerObject,
  EventSourceEventMap,
  EventSourceFetchInit,
  EventSourceInit,
  FetchLike,
  FetchLikeResponse,
} from './types.js'

/**
 * An `EventSource` instance opens a persistent connection to an HTTP server, which sends events
 * in `text/event-stream` format. The connection remains open until closed by calling `.close()`.
 *
 * @public
 * @example
 * ```js
 * const eventSource = new EventSource('https://example.com/stream')
 * eventSource.addEventListener('error', (error) => {
 *   console.error(error)
 * })
 * eventSource.addEventListener('message', (event) => {
 *  console.log('Received message:', event.data)
 * })
 * ```
 */
export class EventSource extends EventTarget {
  /**
   * ReadyState representing an EventSource currently trying to connect
   *
   * @public
   */
  static CONNECTING = 0 as const

  /**
   * ReadyState representing an EventSource connection that is open (eg connected)
   *
   * @public
   */
  static OPEN = 1 as const

  /**
   * ReadyState representing an EventSource connection that is closed (eg disconnected)
   *
   * @public
   */
  static CLOSED = 2 as const

  /**
   * ReadyState representing an EventSource currently trying to connect
   *
   * @public
   */
  readonly CONNECTING = 0 as const

  /**
   * ReadyState representing an EventSource connection that is open (eg connected)
   *
   * @public
   */
  readonly OPEN = 1 as const

  /**
   * ReadyState representing an EventSource connection that is closed (eg disconnected)
   *
   * @public
   */
  readonly CLOSED = 2 as const

  /**
   * Returns the state of this EventSource object's connection. It can have the values described below.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/readyState)
   *
   * Note: typed as `number` instead of `0 | 1 | 2` for compatibility with the `EventSource` interface,
   * defined in the TypeScript `dom` library.
   *
   * @public
   */
  public get readyState(): number {
    return this.#readyState
  }

  /**
   * Returns the URL providing the event stream.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/url)
   *
   * @public
   */
  public get url(): string {
    return this.#url.href
  }

  /**
   * Returns true if the credentials mode for connection requests to the URL providing the event stream is set to "include", and false otherwise.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/withCredentials)
   */
  public get withCredentials(): boolean {
    return this.#withCredentials
  }

  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/error_event) */
  public get onerror(): ((ev: ErrorEvent) => unknown) | null {
    return this.#onError
  }
  public set onerror(value: ((ev: ErrorEvent) => unknown) | null) {
    this.#onError = value
  }

  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/message_event) */
  public get onmessage(): ((ev: MessageEvent) => unknown) | null {
    return this.#onMessage
  }
  public set onmessage(value: ((ev: MessageEvent) => unknown) | null) {
    this.#onMessage = value
  }

  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/open_event) */
  public get onopen(): ((ev: Event) => unknown) | null {
    return this.#onOpen
  }
  public set onopen(value: ((ev: Event) => unknown) | null) {
    this.#onOpen = value
  }

  override addEventListener<K extends keyof EventSourceEventMap>(
    type: K,
    listener: (this: EventSource, ev: EventSourceEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void
  override addEventListener(
    type: string,
    listener: (this: EventSource, event: MessageEvent) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void
  override addEventListener(
    type: string,
    listener:
      | ((this: EventSource, event: MessageEvent) => unknown)
      | EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const listen = listener as (this: EventSource, event: Event) => unknown
    super.addEventListener(type, listen, options)
  }

  override removeEventListener<K extends keyof EventSourceEventMap>(
    type: K,
    listener: (this: EventSource, ev: EventSourceEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void
  override removeEventListener(
    type: string,
    listener: (this: EventSource, event: MessageEvent) => unknown,
    options?: boolean | EventListenerOptions,
  ): void
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void
  override removeEventListener(
    type: string,
    listener:
      | ((this: EventSource, event: MessageEvent) => unknown)
      | EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void {
    const listen = listener as (this: EventSource, event: Event) => unknown
    super.removeEventListener(type, listen, options)
  }

  constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
    super()

    try {
      if (url instanceof URL) {
        this.#url = url
      } else if (typeof url === 'string') {
        this.#url = new URL(url, getBaseURL())
      } else {
        throw new Error('Invalid URL')
      }
    } catch (err) {
      throw syntaxError('An invalid or illegal string was specified')
    }

    this.#parser = createParser({
      onEvent: this.#onEvent,
      onRetry: this.#onRetryChange,
    })

    this.#readyState = this.CONNECTING
    this.#reconnectInterval = 3000
    this.#fetch = eventSourceInitDict?.fetch ?? globalThis.fetch
    this.#withCredentials = eventSourceInitDict?.withCredentials ?? false

    this.#connect()
  }

  /**
   * Aborts any instances of the fetch algorithm started for this EventSource object, and sets the readyState attribute to CLOSED.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/close)
   *
   * @public
   */
  close(): void {
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer)
    if (this.#readyState === this.CLOSED) return
    if (this.#controller) this.#controller.abort()
    this.#readyState = this.CLOSED
    this.#controller = undefined
  }

  // PRIVATES FOLLOW

  /**
   * Current connection state
   *
   * @internal
   */
  #readyState: number

  /**
   * Original URL used to connect.
   *
   * Note that this will stay the same even after a redirect.
   *
   * @internal
   */
  #url: URL

  /**
   * The destination URL after a redirect. Is reset on reconnection.
   *
   * @internal
   */
  #redirectUrl: URL | undefined

  /**
   * Whether to include credentials in the request
   *
   * @internal
   */
  #withCredentials: boolean

  /**
   * The fetch implementation to use
   *
   * @internal
   */
  #fetch: FetchLike

  /**
   * The reconnection time in milliseconds
   *
   * @internal
   */
  #reconnectInterval: number

  /**
   * Reference to an ongoing reconnect attempt, if any
   *
   * @internal
   */
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * The last event ID seen by the EventSource, which will be sent as `Last-Event-ID` in the
   * request headers on a reconnection attempt.
   *
   * @internal
   */
  #lastEventId: string | null = null

  /**
   * The AbortController instance used to abort the fetch request
   *
   * @internal
   */
  #controller: AbortController | undefined

  /**
   * Instance of an EventSource parser (`eventsource-parser` npm module)
   *
   * @internal
   */
  #parser: EventSourceParser

  /**
   * Holds the current error handler, attached through `onerror` property directly.
   * Note that `addEventListener('error', …)` will not be stored here.
   *
   * @internal
   */
  #onError: ((ev: ErrorEvent) => unknown) | null = null

  /**
   * Holds the current message handler, attached through `onmessage` property directly.
   * Note that `addEventListener('message', …)` will not be stored here.
   *
   * @internal
   */
  #onMessage: ((ev: MessageEvent) => unknown) | null = null

  /**
   * Holds the current open handler, attached through `onopen` property directly.
   * Note that `addEventListener('open', …)` will not be stored here.
   *
   * @internal
   */
  #onOpen: ((ev: Event) => unknown) | null = null

  /**
   * Connect to the given URL and start receiving events
   *
   * @internal
   */
  #connect() {
    this.#readyState = this.CONNECTING
    this.#controller = new AbortController()

    // Browser tests are failing if we directly call `this.#fetch()`, thus the indirection.
    const fetch = this.#fetch
    fetch(this.#url, this.#getRequestOptions())
      .then(this.#onFetchResponse)
      .catch(this.#onFetchError)
  }

  /**
   * Handles the fetch response
   *
   * @param response - The Fetch(ish) response
   * @internal
   */
  #onFetchResponse = async (response: FetchLikeResponse) => {
    this.#parser.reset()

    const {body, redirected, status, headers} = response

    // [spec] a client can be told to stop reconnecting using the HTTP 204 No Content response code.
    if (status === 204) {
      // We still need to emit an error event - this mirrors the browser behavior,
      // and without it there is no way to tell the user that the connection was closed.
      this.#failConnection('Server sent HTTP 204, not reconnecting', 204)
      this.close()
      return
    }

    // [spec] …Event stream requests can be redirected using HTTP 301 and 307 redirects as with
    // [spec] normal HTTP requests.
    // Spec does not say anything about other redirect codes (302, 308), but this seems an
    // unintended omission, rather than a feature. Browsers will happily redirect on other 3xxs's.
    if (redirected) {
      this.#redirectUrl = new URL(response.url)
    } else {
      this.#redirectUrl = undefined
    }

    // [spec] if res's status is not 200, …, then fail the connection.
    if (status !== 200) {
      this.#failConnection(`Non-200 status code (${status})`, status)
      return
    }

    // [spec] …or if res's `Content-Type` is not `text/event-stream`, then fail the connection.
    const contentType = headers.get('content-type') || ''
    if (!contentType.startsWith('text/event-stream')) {
      this.#failConnection('Invalid content type, expected "text/event-stream"', status)
      return
    }

    // [spec] …if the readyState attribute is set to a value other than CLOSED…
    if (this.#readyState === this.CLOSED) {
      return
    }

    // [spec] …sets the readyState attribute to OPEN and fires an event
    // [spec] …named open at the EventSource object.
    this.#readyState = this.OPEN

    const openEvent = new Event('open')
    this.#onOpen?.(openEvent)
    this.dispatchEvent(openEvent)

    // Ensure that the response stream is a web stream
    if (typeof body !== 'object' || !body || !('getReader' in body)) {
      this.#failConnection('Invalid response body, expected a web ReadableStream', status)
      this.close() // This should only happen if `fetch` provided is "faulty" - don't reconnect
      return
    }

    const decoder = new TextDecoder()

    const reader = body.getReader()
    let open = true

    do {
      const {done, value} = await reader.read()
      if (value) {
        this.#parser.feed(decoder.decode(value, {stream: !done}))
      }

      if (!done) {
        continue
      }

      open = false
      this.#parser.reset()

      this.#scheduleReconnect()
    } while (open)
  }

  /**
   * Handles rejected requests for the EventSource endpoint
   *
   * @param err - The error from `fetch()`
   * @internal
   */
  #onFetchError = (err: Error & {type?: string}) => {
    this.#controller = undefined

    // We expect abort errors when the user manually calls `close()` - ignore those
    if (err.name === 'AbortError' || err.type === 'aborted') {
      return
    }

    this.#scheduleReconnect(flattenError(err))
  }

  /**
   * Get request options for the `fetch()` request
   *
   * @returns The request options
   * @internal
   */
  #getRequestOptions(): EventSourceFetchInit {
    const lastEvent = this.#lastEventId ? {'Last-Event-ID': this.#lastEventId} : undefined

    const init: EventSourceFetchInit = {
      // [spec] Let `corsAttributeState` be `Anonymous`…
      // [spec] …will have their mode set to "cors"…
      mode: 'cors',
      redirect: 'follow',
      headers: {Accept: 'text/event-stream', ...lastEvent},
      cache: 'no-store',
      signal: this.#controller?.signal,
    }

    // Some environments crash if attempting to set `credentials` where it is not supported,
    // eg on Cloudflare Workers. To avoid this, we only set it in browser-like environments.
    if ('window' in globalThis) {
      // [spec] …and their credentials mode set to "same-origin"
      // [spec] …if the `withCredentials` attribute is `true`, set the credentials mode to "include"…
      init.credentials = this.withCredentials ? 'include' : 'same-origin'
    }

    return init
  }

  /**
   * Called by EventSourceParser instance when an event has successfully been parsed
   * and is ready to be processed.
   *
   * @param event - The parsed event
   * @internal
   */
  #onEvent = (event: EventSourceMessage) => {
    if (typeof event.id === 'string') {
      this.#lastEventId = event.id
    }

    const messageEvent = new MessageEvent(event.event || 'message', {
      data: event.data,
      origin: this.#redirectUrl ? this.#redirectUrl.origin : this.#url.origin,
      lastEventId: event.id || '',
    })

    // The `onmessage` property of the EventSource instance only triggers on messages without an
    // `event` field, or ones that explicitly set `message`.
    if (this.#onMessage && (!event.event || event.event === 'message')) {
      this.#onMessage(messageEvent)
    }

    this.dispatchEvent(messageEvent)
  }

  /**
   * Called by EventSourceParser instance when a new reconnection interval is received
   * from the EventSource endpoint.
   *
   * @param value - The new reconnection interval in milliseconds
   * @internal
   */
  #onRetryChange = (value: number) => {
    this.#reconnectInterval = value
  }

  /**
   * Handles the process referred to in the EventSource specification as "failing a connection".
   *
   * @param error - The error causing the connection to fail
   * @param code - The HTTP status code, if available
   * @internal
   */
  #failConnection(message?: string, code?: number) {
    // [spec] …if the readyState attribute is set to a value other than CLOSED,
    // [spec] sets the readyState attribute to CLOSED…
    if (this.#readyState !== this.CLOSED) {
      this.#readyState = this.CLOSED
    }

    // [spec] …and fires an event named `error` at the `EventSource` object.
    // [spec] Once the user agent has failed the connection, it does not attempt to reconnect.
    // [spec] > Implementations are especially encouraged to report detailed information
    // [spec] > to their development consoles whenever an error event is fired, since little
    // [spec] > to no information can be made available in the events themselves.
    // Printing to console is not very programatically helpful, though, so we emit a custom event.
    const errorEvent = new ErrorEvent('error', {code, message})

    this.#onError?.(errorEvent)
    this.dispatchEvent(errorEvent)
  }

  /**
   * Schedules a reconnection attempt against the EventSource endpoint.
   *
   * @param message - The error causing the connection to fail
   * @param code - The HTTP status code, if available
   * @internal
   */
  #scheduleReconnect(message?: string, code?: number) {
    // [spec] If the readyState attribute is set to CLOSED, abort the task.
    if (this.#readyState === this.CLOSED) {
      return
    }

    // [spec] Set the readyState attribute to CONNECTING.
    this.#readyState = this.CONNECTING

    // [spec] Fire an event named `error` at the EventSource object.
    const errorEvent = new ErrorEvent('error', {code, message})
    this.#onError?.(errorEvent)
    this.dispatchEvent(errorEvent)

    // [spec] Wait a delay equal to the reconnection time of the event source.
    this.#reconnectTimer = setTimeout(this.#reconnect, this.#reconnectInterval)
  }

  /**
   * Reconnects to the EventSource endpoint after a disconnect/failure
   *
   * @internal
   */
  #reconnect = () => {
    this.#reconnectTimer = undefined

    // [spec] If the EventSource's readyState attribute is not set to CONNECTING, then return.
    if (this.#readyState !== this.CONNECTING) {
      return
    }

    this.#connect()
  }
}

/**
 * According to spec, when constructing a URL:
 * > 1. Let baseURL be environment's base URL, if environment is a Document object
 * > 2. Return the result of applying the URL parser to url, with baseURL.
 *
 * Thus we should use `document.baseURI` if available, since it can be set through a base tag.
 *
 * @returns The base URL, if available - otherwise `undefined`
 * @internal
 */
function getBaseURL(): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = 'document' in globalThis ? (globalThis as any).document : undefined
  return doc && typeof doc === 'object' && 'baseURI' in doc && typeof doc.baseURI === 'string'
    ? doc.baseURI
    : undefined
}
