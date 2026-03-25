import type {ErrorEvent} from './errors.js'

/**
 * Stripped down version of `fetch()`, only defining the parts we care about.
 * This ensures it should work with "most" fetch implementations.
 *
 * @public
 */
export type FetchLike = (url: string | URL, init?: FetchLikeInit) => Promise<FetchLikeResponse>

/**
 * Stripped down version of `RequestInit`, only defining the parts we care about.
 *
 * @public
 */
export interface FetchLikeInit {
  /** An AbortSignal to set request's signal. Typed as `any` because of polyfill inconsistencies. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signal?: {aborted: boolean} | any

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
 * Stripped down version of `ReadableStreamDefaultReader`, only defining the parts we care about.
 *
 * @public
 */
export interface ReaderLike {
  read(): Promise<{done: false; value: unknown} | {done: true; value?: undefined}>
  cancel(): Promise<void>
}

/**
 * Minimal version of the `Response` type returned by `fetch()`.
 *
 * @public
 */
export interface FetchLikeResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly body: {getReader(): ReaderLike} | Response['body'] | null
  readonly url: string
  readonly status: number
  readonly redirected: boolean
  readonly headers: {get(name: string): string | null}
}

/**
 * Mirrors the official DOM typings, with the exception of the extended ErrorEvent.
 *
 * @public
 */
export interface EventSourceEventMap {
  error: ErrorEvent
  message: MessageEvent
  open: Event
}

/**
 * Mirrors the official DOM typings (for the most part)
 *
 * @public
 */
export interface EventSourceInit {
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
 * Mirrors the official DOM typings (sorta).
 *
 * @public
 */
export interface EventListenerOptions {
  /** Not directly used by Node.js. Added for API completeness. Default: `false`. */
  capture?: boolean
}

/**
 * Mirrors the official DOM typings (sorta).
 *
 * @public
 */
export interface AddEventListenerOptions extends EventListenerOptions {
  /** When `true`, the listener is automatically removed when it is first invoked. Default: `false`. */
  once?: boolean
  /** When `true`, serves as a hint that the listener will not call the `Event` object's `preventDefault()` method. Default: false. */
  passive?: boolean
  /** The listener will be removed when the given AbortSignal object's `abort()` method is called. */
  signal?: AbortSignal
}

/**
 * Mirrors the official DOM typings.
 *
 * @public
 */
export type EventListenerOrEventListenerObject = EventListener | EventListenerObject

/**
 * Mirrors the official DOM typings.
 *
 * @public
 */
export interface EventListener {
  (evt: Event | MessageEvent): void
}

/**
 * Mirrors the official DOM typings.
 *
 * @public
 */
export interface EventListenerObject {
  handleEvent(object: Event): void
}
