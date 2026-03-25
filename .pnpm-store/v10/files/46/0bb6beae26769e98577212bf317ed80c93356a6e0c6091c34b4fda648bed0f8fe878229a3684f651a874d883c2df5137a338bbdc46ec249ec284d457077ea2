'use strict'

const {
  safeHTTPMethods,
  pathHasQueryOrFragment
} = require('../core/util')

const { serializePathWithQuery } = require('../core/util')

/**
 * @param {import('../../types/dispatcher.d.ts').default.DispatchOptions} opts
 */
function makeCacheKey (opts) {
  if (!opts.origin) {
    throw new Error('opts.origin is undefined')
  }

  let fullPath = opts.path || '/'

  if (opts.query && !pathHasQueryOrFragment(opts.path)) {
    fullPath = serializePathWithQuery(fullPath, opts.query)
  }

  return {
    origin: opts.origin.toString(),
    method: opts.method,
    path: fullPath,
    headers: opts.headers
  }
}

/**
 * @param {Record<string, string[] | string>}
 * @returns {Record<string, string[] | string>}
 */
function normalizeHeaders (opts) {
  let headers
  if (opts.headers == null) {
    headers = {}
  } else if (typeof opts.headers[Symbol.iterator] === 'function') {
    headers = {}
    for (const x of opts.headers) {
      if (!Array.isArray(x)) {
        throw new Error('opts.headers is not a valid header map')
      }
      const [key, val] = x
      if (typeof key !== 'string' || typeof val !== 'string') {
        throw new Error('opts.headers is not a valid header map')
      }
      headers[key.toLowerCase()] = val
    }
  } else if (typeof opts.headers === 'object') {
    headers = {}

    for (const key of Object.keys(opts.headers)) {
      headers[key.toLowerCase()] = opts.headers[key]
    }
  } else {
    throw new Error('opts.headers is not an object')
  }

  return headers
}

/**
 * @param {any} key
 */
function assertCacheKey (key) {
  if (typeof key !== 'object') {
    throw new TypeError(`expected key to be object, got ${typeof key}`)
  }

  for (const property of ['origin', 'method', 'path']) {
    if (typeof key[property] !== 'string') {
      throw new TypeError(`expected key.${property} to be string, got ${typeof key[property]}`)
    }
  }

  if (key.headers !== undefined && typeof key.headers !== 'object') {
    throw new TypeError(`expected headers to be object, got ${typeof key}`)
  }
}

/**
 * @param {any} value
 */
function assertCacheValue (value) {
  if (typeof value !== 'object') {
    throw new TypeError(`expected value to be object, got ${typeof value}`)
  }

  for (const property of ['statusCode', 'cachedAt', 'staleAt', 'deleteAt']) {
    if (typeof value[property] !== 'number') {
      throw new TypeError(`expected value.${property} to be number, got ${typeof value[property]}`)
    }
  }

  if (typeof value.statusMessage !== 'string') {
    throw new TypeError(`expected value.statusMessage to be string, got ${typeof value.statusMessage}`)
  }

  if (value.headers != null && typeof value.headers !== 'object') {
    throw new TypeError(`expected value.rawHeaders to be object, got ${typeof value.headers}`)
  }

  if (value.vary !== undefined && typeof value.vary !== 'object') {
    throw new TypeError(`expected value.vary to be object, got ${typeof value.vary}`)
  }

  if (value.etag !== undefined && typeof value.etag !== 'string') {
    throw new TypeError(`expected value.etag to be string, got ${typeof value.etag}`)
  }
}

/**
 * @see https://www.rfc-editor.org/rfc/rfc9111.html#name-cache-control
 * @see https://www.iana.org/assignments/http-cache-directives/http-cache-directives.xhtml

 * @param {string | string[]} header
 * @returns {import('../../types/cache-interceptor.d.ts').default.CacheControlDirectives}
 */
function parseCacheControlHeader (header) {
  /**
   * @type {import('../../types/cache-interceptor.d.ts').default.CacheControlDirectives}
   */
  const output = {}

  let directives
  if (Array.isArray(header)) {
    directives = []

    for (const directive of header) {
      directives.push(...directive.split(','))
    }
  } else {
    directives = header.split(',')
  }

  for (let i = 0; i < directives.length; i++) {
    const directive = directives[i].toLowerCase()
    const keyValueDelimiter = directive.indexOf('=')

    let key
    let value
    if (keyValueDelimiter !== -1) {
      key = directive.substring(0, keyValueDelimiter).trimStart()
      value = directive.substring(keyValueDelimiter + 1)
    } else {
      key = directive.trim()
    }

    switch (key) {
      case 'min-fresh':
      case 'max-stale':
      case 'max-age':
      case 's-maxage':
      case 'stale-while-revalidate':
      case 'stale-if-error': {
        if (value === undefined || value[0] === ' ') {
          continue
        }

        if (
          value.length >= 2 &&
          value[0] === '"' &&
          value[value.length - 1] === '"'
        ) {
          value = value.substring(1, value.length - 1)
        }

        const parsedValue = parseInt(value, 10)
        // eslint-disable-next-line no-self-compare
        if (parsedValue !== parsedValue) {
          continue
        }

        if (key === 'max-age' && key in output && output[key] >= parsedValue) {
          continue
        }

        output[key] = parsedValue

        break
      }
      case 'private':
      case 'no-cache': {
        if (value) {
          // The private and no-cache directives can be unqualified (aka just
          //  `private` or `no-cache`) or qualified (w/ a value). When they're
          //  qualified, it's a list of headers like `no-cache=header1`,
          //  `no-cache="header1"`, or `no-cache="header1, header2"`
          // If we're given multiple headers, the comma messes us up since
          //  we split the full header by commas. So, let's loop through the
          //  remaining parts in front of us until we find one that ends in a
          //  quote. We can then just splice all of the parts in between the
          //  starting quote and the ending quote out of the directives array
          //  and continue parsing like normal.
          // https://www.rfc-editor.org/rfc/rfc9111.html#name-no-cache-2
          if (value[0] === '"') {
            // Something like `no-cache="some-header"` OR `no-cache="some-header, another-header"`.

            // Add the first header on and cut off the leading quote
            const headers = [value.substring(1)]

            let foundEndingQuote = value[value.length - 1] === '"'
            if (!foundEndingQuote) {
              // Something like `no-cache="some-header, another-header"`
              //  This can still be something invalid, e.g. `no-cache="some-header, ...`
              for (let j = i + 1; j < directives.length; j++) {
                const nextPart = directives[j]
                const nextPartLength = nextPart.length

                headers.push(nextPart.trim())

                if (nextPartLength !== 0 && nextPart[nextPartLength - 1] === '"') {
                  foundEndingQuote = true
                  break
                }
              }
            }

            if (foundEndingQuote) {
              let lastHeader = headers[headers.length - 1]
              if (lastHeader[lastHeader.length - 1] === '"') {
                lastHeader = lastHeader.substring(0, lastHeader.length - 1)
                headers[headers.length - 1] = lastHeader
              }

              if (key in output) {
                output[key] = output[key].concat(headers)
              } else {
                output[key] = headers
              }
            }
          } else {
            // Something like `no-cache="some-header"`
            if (key in output) {
              output[key] = output[key].concat(value)
            } else {
              output[key] = [value]
            }
          }

          break
        }
      }
      // eslint-disable-next-line no-fallthrough
      case 'public':
      case 'no-store':
      case 'must-revalidate':
      case 'proxy-revalidate':
      case 'immutable':
      case 'no-transform':
      case 'must-understand':
      case 'only-if-cached':
        if (value) {
          // These are qualified (something like `public=...`) when they aren't
          //  allowed to be, skip
          continue
        }

        output[key] = true
        break
      default:
        // Ignore unknown directives as per https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.3-1
        continue
    }
  }

  return output
}

/**
 * @param {string | string[]} varyHeader Vary header from the server
 * @param {Record<string, string | string[]>} headers Request headers
 * @returns {Record<string, string | string[]>}
 */
function parseVaryHeader (varyHeader, headers) {
  if (typeof varyHeader === 'string' && varyHeader.includes('*')) {
    return headers
  }

  const output = /** @type {Record<string, string | string[] | null>} */ ({})

  const varyingHeaders = typeof varyHeader === 'string'
    ? varyHeader.split(',')
    : varyHeader

  for (const header of varyingHeaders) {
    const trimmedHeader = header.trim().toLowerCase()

    output[trimmedHeader] = headers[trimmedHeader] ?? null
  }

  return output
}

/**
 * Note: this deviates from the spec a little. Empty etags ("", W/"") are valid,
 *  however, including them in cached resposnes serves little to no purpose.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9110.html#name-etag
 *
 * @param {string} etag
 * @returns {boolean}
 */
function isEtagUsable (etag) {
  if (etag.length <= 2) {
    // Shortest an etag can be is two chars (just ""). This is where we deviate
    //  from the spec requiring a min of 3 chars however
    return false
  }

  if (etag[0] === '"' && etag[etag.length - 1] === '"') {
    // ETag: ""asd123"" or ETag: "W/"asd123"", kinda undefined behavior in the
    //  spec. Some servers will accept these while others don't.
    // ETag: "asd123"
    return !(etag[1] === '"' || etag.startsWith('"W/'))
  }

  if (etag.startsWith('W/"') && etag[etag.length - 1] === '"') {
    // ETag: W/"", also where we deviate from the spec & require a min of 3
    //  chars
    // ETag: for W/"", W/"asd123"
    return etag.length !== 4
  }

  // Anything else
  return false
}

/**
 * @param {unknown} store
 * @returns {asserts store is import('../../types/cache-interceptor.d.ts').default.CacheStore}
 */
function assertCacheStore (store, name = 'CacheStore') {
  if (typeof store !== 'object' || store === null) {
    throw new TypeError(`expected type of ${name} to be a CacheStore, got ${store === null ? 'null' : typeof store}`)
  }

  for (const fn of ['get', 'createWriteStream', 'delete']) {
    if (typeof store[fn] !== 'function') {
      throw new TypeError(`${name} needs to have a \`${fn}()\` function`)
    }
  }
}
/**
 * @param {unknown} methods
 * @returns {asserts methods is import('../../types/cache-interceptor.d.ts').default.CacheMethods[]}
 */
function assertCacheMethods (methods, name = 'CacheMethods') {
  if (!Array.isArray(methods)) {
    throw new TypeError(`expected type of ${name} needs to be an array, got ${methods === null ? 'null' : typeof methods}`)
  }

  if (methods.length === 0) {
    throw new TypeError(`${name} needs to have at least one method`)
  }

  for (const method of methods) {
    if (!safeHTTPMethods.includes(method)) {
      throw new TypeError(`element of ${name}-array needs to be one of following values: ${safeHTTPMethods.join(', ')}, got ${method}`)
    }
  }
}

/**
 * Creates a string key for request deduplication purposes.
 * This key is used to identify in-flight requests that can be shared.
 * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} cacheKey
 * @param {Set<string>} [excludeHeaders] Set of lowercase header names to exclude from the key
 * @returns {string}
 */
function makeDeduplicationKey (cacheKey, excludeHeaders) {
  // Create a deterministic string key from the cache key
  // Include origin, method, path, and sorted headers
  let key = `${cacheKey.origin}:${cacheKey.method}:${cacheKey.path}`

  if (cacheKey.headers) {
    const sortedHeaders = Object.keys(cacheKey.headers).sort()
    for (const header of sortedHeaders) {
      // Skip excluded headers
      if (excludeHeaders?.has(header.toLowerCase())) {
        continue
      }
      const value = cacheKey.headers[header]
      key += `:${header}=${Array.isArray(value) ? value.join(',') : value}`
    }
  }

  return key
}

module.exports = {
  makeCacheKey,
  normalizeHeaders,
  assertCacheKey,
  assertCacheValue,
  parseCacheControlHeader,
  parseVaryHeader,
  isEtagUsable,
  assertCacheMethods,
  assertCacheStore,
  makeDeduplicationKey
}
