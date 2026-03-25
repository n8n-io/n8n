'use strict'

const assert = require('node:assert')
const { kDestroyed, kBodyUsed, kListeners, kBody } = require('./symbols')
const { IncomingMessage } = require('node:http')
const stream = require('node:stream')
const net = require('node:net')
const { Blob } = require('node:buffer')
const nodeUtil = require('node:util')
const { stringify } = require('node:querystring')
const { EventEmitter: EE } = require('node:events')
const { InvalidArgumentError } = require('./errors')
const { headerNameLowerCasedRecord } = require('./constants')
const { tree } = require('./tree')

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(v => Number(v))

class BodyAsyncIterable {
  constructor (body) {
    this[kBody] = body
    this[kBodyUsed] = false
  }

  async * [Symbol.asyncIterator] () {
    assert(!this[kBodyUsed], 'disturbed')
    this[kBodyUsed] = true
    yield * this[kBody]
  }
}

function wrapRequestBody (body) {
  if (isStream(body)) {
    // TODO (fix): Provide some way for the user to cache the file to e.g. /tmp
    // so that it can be dispatched again?
    // TODO (fix): Do we need 100-expect support to provide a way to do this properly?
    if (bodyLength(body) === 0) {
      body
        .on('data', function () {
          assert(false)
        })
    }

    if (typeof body.readableDidRead !== 'boolean') {
      body[kBodyUsed] = false
      EE.prototype.on.call(body, 'data', function () {
        this[kBodyUsed] = true
      })
    }

    return body
  } else if (body && typeof body.pipeTo === 'function') {
    // TODO (fix): We can't access ReadableStream internal state
    // to determine whether or not it has been disturbed. This is just
    // a workaround.
    return new BodyAsyncIterable(body)
  } else if (
    body &&
    typeof body !== 'string' &&
    !ArrayBuffer.isView(body) &&
    isIterable(body)
  ) {
    // TODO: Should we allow re-using iterable if !this.opts.idempotent
    // or through some other flag?
    return new BodyAsyncIterable(body)
  } else {
    return body
  }
}

function nop () {}

function isStream (obj) {
  return obj && typeof obj === 'object' && typeof obj.pipe === 'function' && typeof obj.on === 'function'
}

// based on https://github.com/node-fetch/fetch-blob/blob/8ab587d34080de94140b54f07168451e7d0b655e/index.js#L229-L241 (MIT License)
function isBlobLike (object) {
  if (object === null) {
    return false
  } else if (object instanceof Blob) {
    return true
  } else if (typeof object !== 'object') {
    return false
  } else {
    const sTag = object[Symbol.toStringTag]

    return (sTag === 'Blob' || sTag === 'File') && (
      ('stream' in object && typeof object.stream === 'function') ||
      ('arrayBuffer' in object && typeof object.arrayBuffer === 'function')
    )
  }
}

function buildURL (url, queryParams) {
  if (url.includes('?') || url.includes('#')) {
    throw new Error('Query params cannot be passed when url already contains "?" or "#".')
  }

  const stringified = stringify(queryParams)

  if (stringified) {
    url += '?' + stringified
  }

  return url
}

function isValidPort (port) {
  const value = parseInt(port, 10)
  return (
    value === Number(port) &&
    value >= 0 &&
    value <= 65535
  )
}

function isHttpOrHttpsPrefixed (value) {
  return (
    value != null &&
    value[0] === 'h' &&
    value[1] === 't' &&
    value[2] === 't' &&
    value[3] === 'p' &&
    (
      value[4] === ':' ||
      (
        value[4] === 's' &&
        value[5] === ':'
      )
    )
  )
}

function parseURL (url) {
  if (typeof url === 'string') {
    url = new URL(url)

    if (!isHttpOrHttpsPrefixed(url.origin || url.protocol)) {
      throw new InvalidArgumentError('Invalid URL protocol: the URL must start with `http:` or `https:`.')
    }

    return url
  }

  if (!url || typeof url !== 'object') {
    throw new InvalidArgumentError('Invalid URL: The URL argument must be a non-null object.')
  }

  if (!(url instanceof URL)) {
    if (url.port != null && url.port !== '' && isValidPort(url.port) === false) {
      throw new InvalidArgumentError('Invalid URL: port must be a valid integer or a string representation of an integer.')
    }

    if (url.path != null && typeof url.path !== 'string') {
      throw new InvalidArgumentError('Invalid URL path: the path must be a string or null/undefined.')
    }

    if (url.pathname != null && typeof url.pathname !== 'string') {
      throw new InvalidArgumentError('Invalid URL pathname: the pathname must be a string or null/undefined.')
    }

    if (url.hostname != null && typeof url.hostname !== 'string') {
      throw new InvalidArgumentError('Invalid URL hostname: the hostname must be a string or null/undefined.')
    }

    if (url.origin != null && typeof url.origin !== 'string') {
      throw new InvalidArgumentError('Invalid URL origin: the origin must be a string or null/undefined.')
    }

    if (!isHttpOrHttpsPrefixed(url.origin || url.protocol)) {
      throw new InvalidArgumentError('Invalid URL protocol: the URL must start with `http:` or `https:`.')
    }

    const port = url.port != null
      ? url.port
      : (url.protocol === 'https:' ? 443 : 80)
    let origin = url.origin != null
      ? url.origin
      : `${url.protocol || ''}//${url.hostname || ''}:${port}`
    let path = url.path != null
      ? url.path
      : `${url.pathname || ''}${url.search || ''}`

    if (origin[origin.length - 1] === '/') {
      origin = origin.slice(0, origin.length - 1)
    }

    if (path && path[0] !== '/') {
      path = `/${path}`
    }
    // new URL(path, origin) is unsafe when `path` contains an absolute URL
    // From https://developer.mozilla.org/en-US/docs/Web/API/URL/URL:
    // If first parameter is a relative URL, second param is required, and will be used as the base URL.
    // If first parameter is an absolute URL, a given second param will be ignored.
    return new URL(`${origin}${path}`)
  }

  if (!isHttpOrHttpsPrefixed(url.origin || url.protocol)) {
    throw new InvalidArgumentError('Invalid URL protocol: the URL must start with `http:` or `https:`.')
  }

  return url
}

function parseOrigin (url) {
  url = parseURL(url)

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new InvalidArgumentError('invalid url')
  }

  return url
}

function getHostname (host) {
  if (host[0] === '[') {
    const idx = host.indexOf(']')

    assert(idx !== -1)
    return host.substring(1, idx)
  }

  const idx = host.indexOf(':')
  if (idx === -1) return host

  return host.substring(0, idx)
}

// IP addresses are not valid server names per RFC6066
// > Currently, the only server names supported are DNS hostnames
function getServerName (host) {
  if (!host) {
    return null
  }

  assert(typeof host === 'string')

  const servername = getHostname(host)
  if (net.isIP(servername)) {
    return ''
  }

  return servername
}

function deepClone (obj) {
  return JSON.parse(JSON.stringify(obj))
}

function isAsyncIterable (obj) {
  return !!(obj != null && typeof obj[Symbol.asyncIterator] === 'function')
}

function isIterable (obj) {
  return !!(obj != null && (typeof obj[Symbol.iterator] === 'function' || typeof obj[Symbol.asyncIterator] === 'function'))
}

function bodyLength (body) {
  if (body == null) {
    return 0
  } else if (isStream(body)) {
    const state = body._readableState
    return state && state.objectMode === false && state.ended === true && Number.isFinite(state.length)
      ? state.length
      : null
  } else if (isBlobLike(body)) {
    return body.size != null ? body.size : null
  } else if (isBuffer(body)) {
    return body.byteLength
  }

  return null
}

function isDestroyed (body) {
  return body && !!(body.destroyed || body[kDestroyed] || (stream.isDestroyed?.(body)))
}

function destroy (stream, err) {
  if (stream == null || !isStream(stream) || isDestroyed(stream)) {
    return
  }

  if (typeof stream.destroy === 'function') {
    if (Object.getPrototypeOf(stream).constructor === IncomingMessage) {
      // See: https://github.com/nodejs/node/pull/38505/files
      stream.socket = null
    }

    stream.destroy(err)
  } else if (err) {
    queueMicrotask(() => {
      stream.emit('error', err)
    })
  }

  if (stream.destroyed !== true) {
    stream[kDestroyed] = true
  }
}

const KEEPALIVE_TIMEOUT_EXPR = /timeout=(\d+)/
function parseKeepAliveTimeout (val) {
  const m = val.toString().match(KEEPALIVE_TIMEOUT_EXPR)
  return m ? parseInt(m[1], 10) * 1000 : null
}

/**
 * Retrieves a header name and returns its lowercase value.
 * @param {string | Buffer} value Header name
 * @returns {string}
 */
function headerNameToString (value) {
  return typeof value === 'string'
    ? headerNameLowerCasedRecord[value] ?? value.toLowerCase()
    : tree.lookup(value) ?? value.toString('latin1').toLowerCase()
}

/**
 * Receive the buffer as a string and return its lowercase value.
 * @param {Buffer} value Header name
 * @returns {string}
 */
function bufferToLowerCasedHeaderName (value) {
  return tree.lookup(value) ?? value.toString('latin1').toLowerCase()
}

/**
 * @param {Record<string, string | string[]> | (Buffer | string | (Buffer | string)[])[]} headers
 * @param {Record<string, string | string[]>} [obj]
 * @returns {Record<string, string | string[]>}
 */
function parseHeaders (headers, obj) {
  if (obj === undefined) obj = {}
  for (let i = 0; i < headers.length; i += 2) {
    const key = headerNameToString(headers[i])
    let val = obj[key]

    if (val) {
      if (typeof val === 'string') {
        val = [val]
        obj[key] = val
      }
      val.push(headers[i + 1].toString('utf8'))
    } else {
      const headersValue = headers[i + 1]
      if (typeof headersValue === 'string') {
        obj[key] = headersValue
      } else {
        obj[key] = Array.isArray(headersValue) ? headersValue.map(x => x.toString('utf8')) : headersValue.toString('utf8')
      }
    }
  }

  // See https://github.com/nodejs/node/pull/46528
  if ('content-length' in obj && 'content-disposition' in obj) {
    obj['content-disposition'] = Buffer.from(obj['content-disposition']).toString('latin1')
  }

  return obj
}

function parseRawHeaders (headers) {
  const len = headers.length
  const ret = new Array(len)

  let hasContentLength = false
  let contentDispositionIdx = -1
  let key
  let val
  let kLen = 0

  for (let n = 0; n < headers.length; n += 2) {
    key = headers[n]
    val = headers[n + 1]

    typeof key !== 'string' && (key = key.toString())
    typeof val !== 'string' && (val = val.toString('utf8'))

    kLen = key.length
    if (kLen === 14 && key[7] === '-' && (key === 'content-length' || key.toLowerCase() === 'content-length')) {
      hasContentLength = true
    } else if (kLen === 19 && key[7] === '-' && (key === 'content-disposition' || key.toLowerCase() === 'content-disposition')) {
      contentDispositionIdx = n + 1
    }
    ret[n] = key
    ret[n + 1] = val
  }

  // See https://github.com/nodejs/node/pull/46528
  if (hasContentLength && contentDispositionIdx !== -1) {
    ret[contentDispositionIdx] = Buffer.from(ret[contentDispositionIdx]).toString('latin1')
  }

  return ret
}

function isBuffer (buffer) {
  // See, https://github.com/mcollina/undici/pull/319
  return buffer instanceof Uint8Array || Buffer.isBuffer(buffer)
}

function validateHandler (handler, method, upgrade) {
  if (!handler || typeof handler !== 'object') {
    throw new InvalidArgumentError('handler must be an object')
  }

  if (typeof handler.onConnect !== 'function') {
    throw new InvalidArgumentError('invalid onConnect method')
  }

  if (typeof handler.onError !== 'function') {
    throw new InvalidArgumentError('invalid onError method')
  }

  if (typeof handler.onBodySent !== 'function' && handler.onBodySent !== undefined) {
    throw new InvalidArgumentError('invalid onBodySent method')
  }

  if (upgrade || method === 'CONNECT') {
    if (typeof handler.onUpgrade !== 'function') {
      throw new InvalidArgumentError('invalid onUpgrade method')
    }
  } else {
    if (typeof handler.onHeaders !== 'function') {
      throw new InvalidArgumentError('invalid onHeaders method')
    }

    if (typeof handler.onData !== 'function') {
      throw new InvalidArgumentError('invalid onData method')
    }

    if (typeof handler.onComplete !== 'function') {
      throw new InvalidArgumentError('invalid onComplete method')
    }
  }
}

// A body is disturbed if it has been read from and it cannot
// be re-used without losing state or data.
function isDisturbed (body) {
  // TODO (fix): Why is body[kBodyUsed] needed?
  return !!(body && (stream.isDisturbed(body) || body[kBodyUsed]))
}

function isErrored (body) {
  return !!(body && stream.isErrored(body))
}

function isReadable (body) {
  return !!(body && stream.isReadable(body))
}

function getSocketInfo (socket) {
  return {
    localAddress: socket.localAddress,
    localPort: socket.localPort,
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
    remoteFamily: socket.remoteFamily,
    timeout: socket.timeout,
    bytesWritten: socket.bytesWritten,
    bytesRead: socket.bytesRead
  }
}

/** @type {globalThis['ReadableStream']} */
function ReadableStreamFrom (iterable) {
  // We cannot use ReadableStream.from here because it does not return a byte stream.

  let iterator
  return new ReadableStream(
    {
      async start () {
        iterator = iterable[Symbol.asyncIterator]()
      },
      async pull (controller) {
        const { done, value } = await iterator.next()
        if (done) {
          queueMicrotask(() => {
            controller.close()
            controller.byobRequest?.respond(0)
          })
        } else {
          const buf = Buffer.isBuffer(value) ? value : Buffer.from(value)
          if (buf.byteLength) {
            controller.enqueue(new Uint8Array(buf))
          }
        }
        return controller.desiredSize > 0
      },
      async cancel (reason) {
        await iterator.return()
      },
      type: 'bytes'
    }
  )
}

// The chunk should be a FormData instance and contains
// all the required methods.
function isFormDataLike (object) {
  return (
    object &&
    typeof object === 'object' &&
    typeof object.append === 'function' &&
    typeof object.delete === 'function' &&
    typeof object.get === 'function' &&
    typeof object.getAll === 'function' &&
    typeof object.has === 'function' &&
    typeof object.set === 'function' &&
    object[Symbol.toStringTag] === 'FormData'
  )
}

function addAbortListener (signal, listener) {
  if ('addEventListener' in signal) {
    signal.addEventListener('abort', listener, { once: true })
    return () => signal.removeEventListener('abort', listener)
  }
  signal.addListener('abort', listener)
  return () => signal.removeListener('abort', listener)
}

const hasToWellFormed = typeof String.prototype.toWellFormed === 'function'
const hasIsWellFormed = typeof String.prototype.isWellFormed === 'function'

/**
 * @param {string} val
 */
function toUSVString (val) {
  return hasToWellFormed ? `${val}`.toWellFormed() : nodeUtil.toUSVString(val)
}

/**
 * @param {string} val
 */
// TODO: move this to webidl
function isUSVString (val) {
  return hasIsWellFormed ? `${val}`.isWellFormed() : toUSVString(val) === `${val}`
}

/**
 * @see https://tools.ietf.org/html/rfc7230#section-3.2.6
 * @param {number} c
 */
function isTokenCharCode (c) {
  switch (c) {
    case 0x22:
    case 0x28:
    case 0x29:
    case 0x2c:
    case 0x2f:
    case 0x3a:
    case 0x3b:
    case 0x3c:
    case 0x3d:
    case 0x3e:
    case 0x3f:
    case 0x40:
    case 0x5b:
    case 0x5c:
    case 0x5d:
    case 0x7b:
    case 0x7d:
      // DQUOTE and "(),/:;<=>?@[\]{}"
      return false
    default:
      // VCHAR %x21-7E
      return c >= 0x21 && c <= 0x7e
  }
}

/**
 * @param {string} characters
 */
function isValidHTTPToken (characters) {
  if (characters.length === 0) {
    return false
  }
  for (let i = 0; i < characters.length; ++i) {
    if (!isTokenCharCode(characters.charCodeAt(i))) {
      return false
    }
  }
  return true
}

// headerCharRegex have been lifted from
// https://github.com/nodejs/node/blob/main/lib/_http_common.js

/**
 * Matches if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 */
const headerCharRegex = /[^\t\x20-\x7e\x80-\xff]/

/**
 * @param {string} characters
 */
function isValidHeaderValue (characters) {
  return !headerCharRegex.test(characters)
}

// Parsed accordingly to RFC 9110
// https://www.rfc-editor.org/rfc/rfc9110#field.content-range
function parseRangeHeader (range) {
  if (range == null || range === '') return { start: 0, end: null, size: null }

  const m = range ? range.match(/^bytes (\d+)-(\d+)\/(\d+)?$/) : null
  return m
    ? {
        start: parseInt(m[1]),
        end: m[2] ? parseInt(m[2]) : null,
        size: m[3] ? parseInt(m[3]) : null
      }
    : null
}

function addListener (obj, name, listener) {
  const listeners = (obj[kListeners] ??= [])
  listeners.push([name, listener])
  obj.on(name, listener)
  return obj
}

function removeAllListeners (obj) {
  for (const [name, listener] of obj[kListeners] ?? []) {
    obj.removeListener(name, listener)
  }
  obj[kListeners] = null
}

function errorRequest (client, request, err) {
  try {
    request.onError(err)
    assert(request.aborted)
  } catch (err) {
    client.emit('error', err)
  }
}

const kEnumerableProperty = Object.create(null)
kEnumerableProperty.enumerable = true

const normalizedMethodRecordsBase = {
  delete: 'DELETE',
  DELETE: 'DELETE',
  get: 'GET',
  GET: 'GET',
  head: 'HEAD',
  HEAD: 'HEAD',
  options: 'OPTIONS',
  OPTIONS: 'OPTIONS',
  post: 'POST',
  POST: 'POST',
  put: 'PUT',
  PUT: 'PUT'
}

const normalizedMethodRecords = {
  ...normalizedMethodRecordsBase,
  patch: 'patch',
  PATCH: 'PATCH'
}

// Note: object prototypes should not be able to be referenced. e.g. `Object#hasOwnProperty`.
Object.setPrototypeOf(normalizedMethodRecordsBase, null)
Object.setPrototypeOf(normalizedMethodRecords, null)

module.exports = {
  kEnumerableProperty,
  nop,
  isDisturbed,
  isErrored,
  isReadable,
  toUSVString,
  isUSVString,
  isBlobLike,
  parseOrigin,
  parseURL,
  getServerName,
  isStream,
  isIterable,
  isAsyncIterable,
  isDestroyed,
  headerNameToString,
  bufferToLowerCasedHeaderName,
  addListener,
  removeAllListeners,
  errorRequest,
  parseRawHeaders,
  parseHeaders,
  parseKeepAliveTimeout,
  destroy,
  bodyLength,
  deepClone,
  ReadableStreamFrom,
  isBuffer,
  validateHandler,
  getSocketInfo,
  isFormDataLike,
  buildURL,
  addAbortListener,
  isValidHTTPToken,
  isValidHeaderValue,
  isTokenCharCode,
  parseRangeHeader,
  normalizedMethodRecordsBase,
  normalizedMethodRecords,
  isValidPort,
  isHttpOrHttpsPrefixed,
  nodeMajor,
  nodeMinor,
  safeHTTPMethods: ['GET', 'HEAD', 'OPTIONS', 'TRACE'],
  wrapRequestBody
}
