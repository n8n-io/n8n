/**
 * Mirrors the official DOM typings (sorta).
 *
 * @public
 */
export declare interface AddEventListenerOptions extends EventListenerOptions {
  /** When `true`, the listener is automatically removed when it is first invoked. Default: `false`. */
  once?: boolean
  /** When `true`, serves as a hint that the listener will not call the `Event` object's `preventDefault()` method. Default: false. */
  passive?: boolean
  /** The listener will be removed when the given AbortSignal object's `abort()` method is called. */
  signal?: AbortSignal
}

/**
 * An extended version of the `Event` emitted by the `EventSource` object when an error occurs.
 * While the spec does not include any additional properties, we intentionally go beyond the spec
 * and provide some (minimal) additional information to aid in debugging.
 *
 * @public
 */
export declare class ErrorEvent extends Event {
  /**
   * HTTP status code, if this was triggered by an HTTP error
   * Note: this is not part of the spec, but is included for better error handling.
   *
   * @public
   */
  code?: number | undefined
  /**
   * Optional message attached to the error.
   * Note: this is not part of the spec, but is included for better error handling.
   *
   * @public
   */
  message?: string | undefined
  /**
   * Constructs a new `ErrorEvent` instance. This is typically not called directly,
   * but rather emitted by the `EventSource` object when an error occurs.
   *
   * @param type - The type of the event (should be "error")
   * @param errorEventInitDict - Optional properties to include in the error event
   */
  constructor(
    type: string,
    errorEventInitDict?: {
      message?: string | undefined
      code?: number | undefined
    },
  )
}

/**
 * Mirrors the official DOM typings.
 *
 * @public
 */
export declare interface EventListener {
  (evt: Event | MessageEvent): void
}

/**
 * Mirrors the official DOM typings.
 *
 * @public
 */
export declare interface EventListenerObject {
  handleEvent(object: Event): void
}

/**
 * Mirrors the official DOM typings (sorta).
 *
 * @public
 */
export declare interface EventListenerOptions {
  /** Not directly used by Node.js. Added for API completeness. Default: `false`. */
  capture?: boolean
}

/**
 * Mirrors the official DOM typings.
 *
 * @public
 */
export declare type EventListenerOrEventListenerObject = EventListener | EventListenerObject

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
declare class EventSource_2 extends EventTarget {
  #private
  /**
   * ReadyState representing an EventSource currently trying to connect
   *
   * @public
   */
  static CONNECTING: 0
  /**
   * ReadyState representing an EventSource connection that is open (eg connected)
   *
   * @public
   */
  static OPEN: 1
  /**
   * ReadyState representing an EventSource connection that is closed (eg disconnected)
   *
   * @public
   */
  static CLOSED: 2
  /**
   * ReadyState representing an EventSource currently trying to connect
   *
   * @public
   */
  readonly CONNECTING: 0
  /**
   * ReadyState representing an EventSource connection that is open (eg connected)
   *
   * @public
   */
  readonly OPEN: 1
  /**
   * ReadyState representing an EventSource connection that is closed (eg disconnected)
   *
   * @public
   */
  readonly CLOSED: 2
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
  get readyState(): number
  /**
   * Returns the URL providing the event stream.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/url)
   *
   * @public
   */
  get url(): string
  /**
   * Returns true if the credentials mode for connection requests to the URL providing the event stream is set to "include", and false otherwise.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/withCredentials)
   */
  get withCredentials(): boolean
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/error_event) */
  get onerror(): ((ev: ErrorEvent) => unknown) | null
  set onerror(value: ((ev: ErrorEvent) => unknown) | null)
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/message_event) */
  get onmessage(): ((ev: MessageEvent) => unknown) | null
  set onmessage(value: ((ev: MessageEvent) => unknown) | null)
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/open_event) */
  get onopen(): ((ev: Event) => unknown) | null
  set onopen(value: ((ev: Event) => unknown) | null)
  addEventListener<K extends keyof EventSourceEventMap>(
    type: K,
    listener: (this: EventSource_2, ev: EventSourceEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: (this: EventSource_2, event: MessageEvent) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener<K extends keyof EventSourceEventMap>(
    type: K,
    listener: (this: EventSource_2, ev: EventSourceEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: (this: EventSource_2, event: MessageEvent) => unknown,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void
  constructor(url: string | URL, eventSourceInitDict?: EventSourceInit)
  /**
   * Aborts any instances of the fetch algorithm started for this EventSource object, and sets the readyState attribute to CLOSED.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/close)
   *
   * @public
   */
  close(): void
}
export {EventSource_2 as EventSource}

/**
 * Mirrors the official DOM typings, with the exception of the extended ErrorEvent.
 *
 * @public
 */
export declare interface EventSourceEventMap {
  error: ErrorEvent
  message: MessageEvent
  open: Event
}

/**
 * Mirrors the official DOM typings (for the most part)
 *
 * @public
 */
export declare interface EventSourceInit {
  /**
   * A boolean value, defaulting to `false`, indicating if CORS should be set to `include` credentials.
   */
  withCredentials?: boolean
  /**
   * Optional fetch implementation to use. Defaults to `globalThis.fetch`.
   * Can also be used for advanced use cases like mocking, proxying, custom certs etc.
   */
  fetch?: FetchLike
}

/**
 * Stripped down version of `fetch()`, only defining the parts we care about.
 * This ensures it should work with "most" fetch implementations.
 *
 * @public
 */
export declare type FetchLike = (
  url: string | URL,
  init?: FetchLikeInit,
) => Promise<FetchLikeResponse>

/**
 * Stripped down version of `RequestInit`, only defining the parts we care about.
 *
 * @public
 */
export declare interface FetchLikeInit {
  /** An AbortSignal to set request's signal. Typed as `any` because of polyfill inconsistencies. */
  signal?:
    | {
        aborted: boolean
      }
    | any
  /** A Headers object, an object literal, or an array of two-item arrays to set request's headers. */
  headers?: Record<string, string>
  /** A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode. */
  mode?: 'cors' | 'no-cors' | 'same-origin'
  /** A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials. */
  credentials?: 'include' | 'omit' | 'same-origin'
  /** Controls how the request is cached. */
  cache?: 'no-store'
  /** A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect. */
  redirect?: 'error' | 'follow' | 'manual'
}

/**
 * Minimal version of the `Response` type returned by `fetch()`.
 *
 * @public
 */
export declare interface FetchLikeResponse {
  readonly body:
    | {
        getReader(): ReaderLike
      }
    | Response['body']
    | null
  readonly url: string
  readonly status: number
  readonly redirected: boolean
  readonly headers: {
    get(name: string): string | null
  }
}

/**
 * Stripped down version of `ReadableStreamDefaultReader`, only defining the parts we care about.
 *
 * @public
 */
export declare interface ReaderLike {
  read(): Promise<
    | {
        done: false
        value: unknown
      }
    | {
        done: true
        value?: undefined
      }
  >
  cancel(): Promise<void>
}

export {}
