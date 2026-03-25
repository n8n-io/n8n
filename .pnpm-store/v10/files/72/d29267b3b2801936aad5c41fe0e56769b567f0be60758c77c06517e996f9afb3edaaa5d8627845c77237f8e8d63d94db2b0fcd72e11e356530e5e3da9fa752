'use strict'

const util = require('../core/util')
const {
  parseCacheControlHeader,
  parseVaryHeader,
  isEtagUsable
} = require('../util/cache')
const { parseHttpDate } = require('../util/date.js')

function noop () {}

// Status codes that we can use some heuristics on to cache
const HEURISTICALLY_CACHEABLE_STATUS_CODES = [
  200, 203, 204, 206, 300, 301, 308, 404, 405, 410, 414, 501
]

// Status codes which semantic is not handled by the cache
// https://datatracker.ietf.org/doc/html/rfc9111#section-3
// This list should not grow beyond 206 unless the RFC is updated
// by a newer one including more. Please introduce another list if
// implementing caching of responses with the 'must-understand' directive.
const NOT_UNDERSTOOD_STATUS_CODES = [
  206
]

const MAX_RESPONSE_AGE = 2147483647000

/**
 * @typedef {import('../../types/dispatcher.d.ts').default.DispatchHandler} DispatchHandler
 *
 * @implements {DispatchHandler}
 */
class CacheHandler {
  /**
   * @type {import('../../types/cache-interceptor.d.ts').default.CacheKey}
   */
  #cacheKey

  /**
   * @type {import('../../types/cache-interceptor.d.ts').default.CacheHandlerOptions['type']}
   */
  #cacheType

  /**
   * @type {number | undefined}
   */
  #cacheByDefault

  /**
   * @type {import('../../types/cache-interceptor.d.ts').default.CacheStore}
   */
  #store

  /**
   * @type {import('../../types/dispatcher.d.ts').default.DispatchHandler}
   */
  #handler

  /**
   * @type {import('node:stream').Writable | undefined}
   */
  #writeStream

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheHandlerOptions} opts
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} cacheKey
   * @param {import('../../types/dispatcher.d.ts').default.DispatchHandler} handler
   */
  constructor ({ store, type, cacheByDefault }, cacheKey, handler) {
    this.#store = store
    this.#cacheType = type
    this.#cacheByDefault = cacheByDefault
    this.#cacheKey = cacheKey
    this.#handler = handler
  }

  onRequestStart (controller, context) {
    this.#writeStream?.destroy()
    this.#writeStream = undefined
    this.#handler.onRequestStart?.(controller, context)
  }

  onRequestUpgrade (controller, statusCode, headers, socket) {
    this.#handler.onRequestUpgrade?.(controller, statusCode, headers, socket)
  }

  /**
   * @param {import('../../types/dispatcher.d.ts').default.DispatchController} controller
   * @param {number} statusCode
   * @param {import('../../types/header.d.ts').IncomingHttpHeaders} resHeaders
   * @param {string} statusMessage
   */
  onResponseStart (
    controller,
    statusCode,
    resHeaders,
    statusMessage
  ) {
    const downstreamOnHeaders = () =>
      this.#handler.onResponseStart?.(
        controller,
        statusCode,
        resHeaders,
        statusMessage
      )
    const handler = this

    if (
      !util.safeHTTPMethods.includes(this.#cacheKey.method) &&
      statusCode >= 200 &&
      statusCode <= 399
    ) {
      // Successful response to an unsafe method, delete it from cache
      //  https://www.rfc-editor.org/rfc/rfc9111.html#name-invalidating-stored-response
      try {
        this.#store.delete(this.#cacheKey)?.catch?.(noop)
      } catch {
        // Fail silently
      }
      return downstreamOnHeaders()
    }

    const cacheControlHeader = resHeaders['cache-control']
    const heuristicallyCacheable = resHeaders['last-modified'] && HEURISTICALLY_CACHEABLE_STATUS_CODES.includes(statusCode)
    if (
      !cacheControlHeader &&
      !resHeaders['expires'] &&
      !heuristicallyCacheable &&
      !this.#cacheByDefault
    ) {
      // Don't have anything to tell us this response is cachable and we're not
      //  caching by default
      return downstreamOnHeaders()
    }

    const cacheControlDirectives = cacheControlHeader ? parseCacheControlHeader(cacheControlHeader) : {}
    if (!canCacheResponse(this.#cacheType, statusCode, resHeaders, cacheControlDirectives)) {
      return downstreamOnHeaders()
    }

    const now = Date.now()
    const resAge = resHeaders.age ? getAge(resHeaders.age) : undefined
    if (resAge && resAge >= MAX_RESPONSE_AGE) {
      // Response considered stale
      return downstreamOnHeaders()
    }

    const resDate = typeof resHeaders.date === 'string'
      ? parseHttpDate(resHeaders.date)
      : undefined

    const staleAt =
      determineStaleAt(this.#cacheType, now, resAge, resHeaders, resDate, cacheControlDirectives) ??
      this.#cacheByDefault
    if (staleAt === undefined || (resAge && resAge > staleAt)) {
      return downstreamOnHeaders()
    }

    const baseTime = resDate ? resDate.getTime() : now
    const absoluteStaleAt = staleAt + baseTime
    if (now >= absoluteStaleAt) {
      // Response is already stale
      return downstreamOnHeaders()
    }

    let varyDirectives
    if (this.#cacheKey.headers && resHeaders.vary) {
      varyDirectives = parseVaryHeader(resHeaders.vary, this.#cacheKey.headers)
      if (!varyDirectives) {
        // Parse error
        return downstreamOnHeaders()
      }
    }

    const deleteAt = determineDeleteAt(baseTime, cacheControlDirectives, absoluteStaleAt)
    const strippedHeaders = stripNecessaryHeaders(resHeaders, cacheControlDirectives)

    /**
     * @type {import('../../types/cache-interceptor.d.ts').default.CacheValue}
     */
    const value = {
      statusCode,
      statusMessage,
      headers: strippedHeaders,
      vary: varyDirectives,
      cacheControlDirectives,
      cachedAt: resAge ? now - resAge : now,
      staleAt: absoluteStaleAt,
      deleteAt
    }

    // Not modified, re-use the cached value
    // https://www.rfc-editor.org/rfc/rfc9111.html#name-handling-304-not-modified
    if (statusCode === 304) {
      /**
       * @type {import('../../types/cache-interceptor.d.ts').default.CacheValue}
       */
      const cachedValue = this.#store.get(this.#cacheKey)
      if (!cachedValue) {
        // Do not create a new cache entry, as a 304 won't have a body - so cannot be cached.
        return downstreamOnHeaders()
      }

      // Re-use the cached value: statuscode, statusmessage, headers and body
      value.statusCode = cachedValue.statusCode
      value.statusMessage = cachedValue.statusMessage
      value.etag = cachedValue.etag
      value.headers = { ...cachedValue.headers, ...strippedHeaders }

      downstreamOnHeaders()

      this.#writeStream = this.#store.createWriteStream(this.#cacheKey, value)

      if (!this.#writeStream || !cachedValue?.body) {
        return
      }

      const bodyIterator = cachedValue.body.values()

      const streamCachedBody = () => {
        for (const chunk of bodyIterator) {
          const full = this.#writeStream.write(chunk) === false
          this.#handler.onResponseData?.(controller, chunk)
          // when stream is full stop writing until we get a 'drain' event
          if (full) {
            break
          }
        }
      }

      this.#writeStream
        .on('error', function () {
          handler.#writeStream = undefined
          handler.#store.delete(handler.#cacheKey)
        })
        .on('drain', () => {
          streamCachedBody()
        })
        .on('close', function () {
          if (handler.#writeStream === this) {
            handler.#writeStream = undefined
          }
        })

      streamCachedBody()
    } else {
      if (typeof resHeaders.etag === 'string' && isEtagUsable(resHeaders.etag)) {
        value.etag = resHeaders.etag
      }

      this.#writeStream = this.#store.createWriteStream(this.#cacheKey, value)

      if (!this.#writeStream) {
        return downstreamOnHeaders()
      }

      this.#writeStream
        .on('drain', () => controller.resume())
        .on('error', function () {
          // TODO (fix): Make error somehow observable?
          handler.#writeStream = undefined

          // Delete the value in case the cache store is holding onto state from
          //  the call to createWriteStream
          handler.#store.delete(handler.#cacheKey)
        })
        .on('close', function () {
          if (handler.#writeStream === this) {
            handler.#writeStream = undefined
          }

          // TODO (fix): Should we resume even if was paused downstream?
          controller.resume()
        })

      downstreamOnHeaders()
    }
  }

  onResponseData (controller, chunk) {
    if (this.#writeStream?.write(chunk) === false) {
      controller.pause()
    }

    this.#handler.onResponseData?.(controller, chunk)
  }

  onResponseEnd (controller, trailers) {
    this.#writeStream?.end()
    this.#handler.onResponseEnd?.(controller, trailers)
  }

  onResponseError (controller, err) {
    this.#writeStream?.destroy(err)
    this.#writeStream = undefined
    this.#handler.onResponseError?.(controller, err)
  }
}

/**
 * @see https://www.rfc-editor.org/rfc/rfc9111.html#name-storing-responses-to-authen
 *
 * @param {import('../../types/cache-interceptor.d.ts').default.CacheOptions['type']} cacheType
 * @param {number} statusCode
 * @param {import('../../types/header.d.ts').IncomingHttpHeaders} resHeaders
 * @param {import('../../types/cache-interceptor.d.ts').default.CacheControlDirectives} cacheControlDirectives
 */
function canCacheResponse (cacheType, statusCode, resHeaders, cacheControlDirectives) {
  // Status code must be final and understood.
  if (statusCode < 200 || NOT_UNDERSTOOD_STATUS_CODES.includes(statusCode)) {
    return false
  }
  // Responses with neither status codes that are heuristically cacheable, nor "explicit enough" caching
  // directives, are not cacheable. "Explicit enough": see https://www.rfc-editor.org/rfc/rfc9111.html#section-3
  if (!HEURISTICALLY_CACHEABLE_STATUS_CODES.includes(statusCode) && !resHeaders['expires'] &&
    !cacheControlDirectives.public &&
    cacheControlDirectives['max-age'] === undefined &&
    // RFC 9111: a private response directive, if the cache is not shared
    !(cacheControlDirectives.private && cacheType === 'private') &&
    !(cacheControlDirectives['s-maxage'] !== undefined && cacheType === 'shared')
  ) {
    return false
  }

  if (cacheControlDirectives['no-store']) {
    return false
  }

  if (cacheType === 'shared' && cacheControlDirectives.private === true) {
    return false
  }

  // https://www.rfc-editor.org/rfc/rfc9111.html#section-4.1-5
  if (resHeaders.vary?.includes('*')) {
    return false
  }

  // https://www.rfc-editor.org/rfc/rfc9111.html#name-storing-responses-to-authen
  if (resHeaders.authorization) {
    if (!cacheControlDirectives.public || typeof resHeaders.authorization !== 'string') {
      return false
    }

    if (
      Array.isArray(cacheControlDirectives['no-cache']) &&
      cacheControlDirectives['no-cache'].includes('authorization')
    ) {
      return false
    }

    if (
      Array.isArray(cacheControlDirectives['private']) &&
      cacheControlDirectives['private'].includes('authorization')
    ) {
      return false
    }
  }

  return true
}

/**
 * @param {string | string[]} ageHeader
 * @returns {number | undefined}
 */
function getAge (ageHeader) {
  const age = parseInt(Array.isArray(ageHeader) ? ageHeader[0] : ageHeader)

  return isNaN(age) ? undefined : age * 1000
}

/**
 * @param {import('../../types/cache-interceptor.d.ts').default.CacheOptions['type']} cacheType
 * @param {number} now
 * @param {number | undefined} age
 * @param {import('../../types/header.d.ts').IncomingHttpHeaders} resHeaders
 * @param {Date | undefined} responseDate
 * @param {import('../../types/cache-interceptor.d.ts').default.CacheControlDirectives} cacheControlDirectives
 *
 * @returns {number | undefined} time that the value is stale at in seconds or undefined if it shouldn't be cached
 */
function determineStaleAt (cacheType, now, age, resHeaders, responseDate, cacheControlDirectives) {
  if (cacheType === 'shared') {
    // Prioritize s-maxage since we're a shared cache
    //  s-maxage > max-age > Expire
    //  https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.10-3
    const sMaxAge = cacheControlDirectives['s-maxage']
    if (sMaxAge !== undefined) {
      return sMaxAge > 0 ? sMaxAge * 1000 : undefined
    }
  }

  const maxAge = cacheControlDirectives['max-age']
  if (maxAge !== undefined) {
    return maxAge > 0 ? maxAge * 1000 : undefined
  }

  if (typeof resHeaders.expires === 'string') {
    // https://www.rfc-editor.org/rfc/rfc9111.html#section-5.3
    const expiresDate = parseHttpDate(resHeaders.expires)
    if (expiresDate) {
      if (now >= expiresDate.getTime()) {
        return undefined
      }

      if (responseDate) {
        if (responseDate >= expiresDate) {
          return undefined
        }

        if (age !== undefined && age > (expiresDate - responseDate)) {
          return undefined
        }
      }

      return expiresDate.getTime() - now
    }
  }

  if (typeof resHeaders['last-modified'] === 'string') {
    // https://www.rfc-editor.org/rfc/rfc9111.html#name-calculating-heuristic-fresh
    const lastModified = new Date(resHeaders['last-modified'])
    if (isValidDate(lastModified)) {
      if (lastModified.getTime() >= now) {
        return undefined
      }

      const responseAge = now - lastModified.getTime()

      return responseAge * 0.1
    }
  }

  if (cacheControlDirectives.immutable) {
    // https://www.rfc-editor.org/rfc/rfc8246.html#section-2.2
    return 31536000
  }

  return undefined
}

/**
 * @param {number} now
 * @param {import('../../types/cache-interceptor.d.ts').default.CacheControlDirectives} cacheControlDirectives
 * @param {number} staleAt
 */
function determineDeleteAt (now, cacheControlDirectives, staleAt) {
  let staleWhileRevalidate = -Infinity
  let staleIfError = -Infinity
  let immutable = -Infinity

  if (cacheControlDirectives['stale-while-revalidate']) {
    staleWhileRevalidate = staleAt + (cacheControlDirectives['stale-while-revalidate'] * 1000)
  }

  if (cacheControlDirectives['stale-if-error']) {
    staleIfError = staleAt + (cacheControlDirectives['stale-if-error'] * 1000)
  }

  if (staleWhileRevalidate === -Infinity && staleIfError === -Infinity) {
    immutable = now + 31536000000
  }

  return Math.max(staleAt, staleWhileRevalidate, staleIfError, immutable)
}

/**
 * Strips headers required to be removed in cached responses
 * @param {import('../../types/header.d.ts').IncomingHttpHeaders} resHeaders
 * @param {import('../../types/cache-interceptor.d.ts').default.CacheControlDirectives} cacheControlDirectives
 * @returns {Record<string, string | string []>}
 */
function stripNecessaryHeaders (resHeaders, cacheControlDirectives) {
  const headersToRemove = [
    'connection',
    'proxy-authenticate',
    'proxy-authentication-info',
    'proxy-authorization',
    'proxy-connection',
    'te',
    'transfer-encoding',
    'upgrade',
    // We'll add age back when serving it
    'age'
  ]

  if (resHeaders['connection']) {
    if (Array.isArray(resHeaders['connection'])) {
      // connection: a
      // connection: b
      headersToRemove.push(...resHeaders['connection'].map(header => header.trim()))
    } else {
      // connection: a, b
      headersToRemove.push(...resHeaders['connection'].split(',').map(header => header.trim()))
    }
  }

  if (Array.isArray(cacheControlDirectives['no-cache'])) {
    headersToRemove.push(...cacheControlDirectives['no-cache'])
  }

  if (Array.isArray(cacheControlDirectives['private'])) {
    headersToRemove.push(...cacheControlDirectives['private'])
  }

  let strippedHeaders
  for (const headerName of headersToRemove) {
    if (resHeaders[headerName]) {
      strippedHeaders ??= { ...resHeaders }
      delete strippedHeaders[headerName]
    }
  }

  return strippedHeaders ?? resHeaders
}

/**
 * @param {Date} date
 * @returns {boolean}
 */
function isValidDate (date) {
  return date instanceof Date && Number.isFinite(date.valueOf())
}

module.exports = CacheHandler
