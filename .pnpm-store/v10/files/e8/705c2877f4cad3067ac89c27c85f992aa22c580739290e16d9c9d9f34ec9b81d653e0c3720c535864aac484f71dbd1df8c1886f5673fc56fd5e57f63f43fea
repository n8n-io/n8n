type HeaderTuple = [string, string]
type RawHeaders = Array<HeaderTuple>
type SetHeaderBehavior = 'set' | 'append'

const kRawHeaders = Symbol('kRawHeaders')
const kRestorePatches = Symbol('kRestorePatches')

function recordRawHeader(
  headers: Headers,
  args: HeaderTuple,
  behavior: SetHeaderBehavior
) {
  ensureRawHeadersSymbol(headers, [])
  const rawHeaders = Reflect.get(headers, kRawHeaders) as RawHeaders

  if (behavior === 'set') {
    // When recording a set header, ensure we remove any matching existing headers.
    for (let index = rawHeaders.length - 1; index >= 0; index--) {
      if (rawHeaders[index][0].toLowerCase() === args[0].toLowerCase()) {
        rawHeaders.splice(index, 1)
      }
    }
  }

  rawHeaders.push(args)
}

/**
 * Define the raw headers symbol on the given `Headers` instance.
 * If the symbol already exists, this function does nothing.
 */
function ensureRawHeadersSymbol(
  headers: Headers,
  rawHeaders: RawHeaders
): void {
  if (Reflect.has(headers, kRawHeaders)) {
    return
  }

  defineRawHeadersSymbol(headers, rawHeaders)
}

/**
 * Define the raw headers symbol on the given `Headers` instance.
 * If the symbol already exists, it gets overridden.
 */
function defineRawHeadersSymbol(headers: Headers, rawHeaders: RawHeaders) {
  Object.defineProperty(headers, kRawHeaders, {
    value: rawHeaders,
    enumerable: false,
    // Mark the symbol as configurable so its value can be overridden.
    // Overrides happen when merging raw headers from multiple sources.
    // E.g. new Request(new Request(url, { headers }), { headers })
    configurable: true,
  })
}

/**
 * Patch the global `Headers` class to store raw headers.
 * This is for compatibility with `IncomingMessage.prototype.rawHeaders`.
 *
 * @note Node.js has their own raw headers symbol but it
 * only records the first header name in case of multi-value headers.
 * Any other headers are normalized before comparing. This makes it
 * incompatible with the `rawHeaders` format.
 *
 * let h = new Headers()
 * h.append('X-Custom', 'one')
 * h.append('x-custom', 'two')
 * h[Symbol('headers map')] // Map { 'X-Custom' => 'one, two' }
 */
export function recordRawFetchHeaders() {
  // Prevent patching the Headers prototype multiple times.
  if (Reflect.get(Headers, kRestorePatches)) {
    return Reflect.get(Headers, kRestorePatches)
  }

  const {
    Headers: OriginalHeaders,
    Request: OriginalRequest,
    Response: OriginalResponse,
  } = globalThis
  const { set, append, delete: headersDeleteMethod } = Headers.prototype

  Object.defineProperty(Headers, kRestorePatches, {
    value: () => {
      Headers.prototype.set = set
      Headers.prototype.append = append
      Headers.prototype.delete = headersDeleteMethod
      globalThis.Headers = OriginalHeaders

      globalThis.Request = OriginalRequest
      globalThis.Response = OriginalResponse

      Reflect.deleteProperty(Headers, kRestorePatches)
    },
    enumerable: false,
    /**
     * @note Mark this property as configurable
     * so we can delete it using `Reflect.delete` during cleanup.
     */
    configurable: true,
  })

  Object.defineProperty(globalThis, 'Headers', {
    enumerable: true,
    writable: true,
    value: new Proxy(Headers, {
      construct(target, args, newTarget) {
        const headersInit = args[0] || []

        if (
          headersInit instanceof Headers &&
          Reflect.has(headersInit, kRawHeaders)
        ) {
          const headers = Reflect.construct(
            target,
            [Reflect.get(headersInit, kRawHeaders)],
            newTarget
          )
          ensureRawHeadersSymbol(headers, [
            /**
             * @note Spread the retrieved headers to clone them.
             * This prevents multiple Headers instances from pointing
             * at the same internal "rawHeaders" array.
             */
            ...Reflect.get(headersInit, kRawHeaders),
          ])
          return headers
        }

        const headers = Reflect.construct(target, args, newTarget)

        // Request/Response constructors will set the symbol
        // upon creating a new instance, using the raw developer
        // input as the raw headers. Skip the symbol altogether
        // in those cases because the input to Headers will be normalized.
        if (!Reflect.has(headers, kRawHeaders)) {
          const rawHeadersInit = Array.isArray(headersInit)
            ? headersInit
            : Object.entries(headersInit)
          ensureRawHeadersSymbol(headers, rawHeadersInit)
        }

        return headers
      },
    }),
  })

  Headers.prototype.set = new Proxy(Headers.prototype.set, {
    apply(target, thisArg, args: HeaderTuple) {
      recordRawHeader(thisArg, args, 'set')
      return Reflect.apply(target, thisArg, args)
    },
  })

  Headers.prototype.append = new Proxy(Headers.prototype.append, {
    apply(target, thisArg, args: HeaderTuple) {
      recordRawHeader(thisArg, args, 'append')
      return Reflect.apply(target, thisArg, args)
    },
  })

  Headers.prototype.delete = new Proxy(Headers.prototype.delete, {
    apply(target, thisArg, args: [string]) {
      const rawHeaders = Reflect.get(thisArg, kRawHeaders) as RawHeaders

      if (rawHeaders) {
        for (let index = rawHeaders.length - 1; index >= 0; index--) {
          if (rawHeaders[index][0].toLowerCase() === args[0].toLowerCase()) {
            rawHeaders.splice(index, 1)
          }
        }
      }

      return Reflect.apply(target, thisArg, args)
    },
  })

  Object.defineProperty(globalThis, 'Request', {
    enumerable: true,
    writable: true,
    value: new Proxy(Request, {
      construct(target, args, newTarget) {
        const request = Reflect.construct(target, args, newTarget)
        const inferredRawHeaders: RawHeaders = []

        // Infer raw headers from a `Request` instance used as init.
        if (typeof args[0] === 'object' && args[0].headers != null) {
          inferredRawHeaders.push(...inferRawHeaders(args[0].headers))
        }

        // Infer raw headers from the "headers" init argument.
        if (typeof args[1] === 'object' && args[1].headers != null) {
          inferredRawHeaders.push(...inferRawHeaders(args[1].headers))
        }

        if (inferredRawHeaders.length > 0) {
          ensureRawHeadersSymbol(request.headers, inferredRawHeaders)
        }

        return request
      },
    }),
  })

  Object.defineProperty(globalThis, 'Response', {
    enumerable: true,
    writable: true,
    value: new Proxy(Response, {
      construct(target, args, newTarget) {
        const response = Reflect.construct(target, args, newTarget)

        if (typeof args[1] === 'object' && args[1].headers != null) {
          ensureRawHeadersSymbol(
            response.headers,
            inferRawHeaders(args[1].headers)
          )
        }

        return response
      },
    }),
  })
}

export function restoreHeadersPrototype() {
  if (!Reflect.get(Headers, kRestorePatches)) {
    return
  }

  Reflect.get(Headers, kRestorePatches)()
}

export function getRawFetchHeaders(headers: Headers): RawHeaders {
  // If the raw headers recording failed for some reason,
  // use the normalized header entries instead.
  if (!Reflect.has(headers, kRawHeaders)) {
    return Array.from(headers.entries())
  }

  const rawHeaders = Reflect.get(headers, kRawHeaders) as RawHeaders
  return rawHeaders.length > 0 ? rawHeaders : Array.from(headers.entries())
}

/**
 * Infers the raw headers from the given `HeadersInit` provided
 * to the Request/Response constructor.
 *
 * If the `init.headers` is a Headers instance, use it directly.
 * That means the headers were created standalone and already have
 * the raw headers stored.
 * If the `init.headers` is a HeadersInit, create a new Headers
 * instance out of it.
 */
function inferRawHeaders(headers: HeadersInit): RawHeaders {
  if (headers instanceof Headers) {
    return Reflect.get(headers, kRawHeaders) || []
  }

  return Reflect.get(new Headers(headers), kRawHeaders)
}
