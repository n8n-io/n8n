'use strict'

const assert = require('assert')
const { kDestroyed, kBodyUsed } = require('./symbols')
const { IncomingMessage } = require('http')
const stream = require('stream')
const net = require('net')
const { InvalidArgumentError } = require('./errors')
const { Blob } = require('buffer')
const nodeUtil = require('util')
const { stringify } = require('querystring')
const { headerNameLowerCasedRecord } = require('./constants')

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(v => Number(v))

function nop () {}

function isStream (obj) {
  return obj && typeof obj === 'object' && typeof obj.pipe === 'function' && typeof obj.on === 'function'
}

// based on https://github.com/node-fetch/fetch-blob/blob/8ab587d34080de94140b54f07168451e7d0b655e/index.js#L229-L241 (MIT License)
function isBlobLike (object) {
  return (Blob && object instanceof Blob) || (
    object &&
    typeof object === 'object' &&
    (typeof object.stream === 'function' ||
      typeof object.arrayBuffer === 'function') &&
    /^(Blob|File)$/.test(object[Symbol.toStringTag])
  )
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

function parseURL (url) {
  if (typeof url === 'string') {
    url = new URL(url)

    if (!/^https?:/.test(url.origin || url.protocol)) {
      throw new InvalidArgumentError('Invalid URL protocol: the URL must start with `http:` or `https:`.')
    }

    return url
  }

  if (!url || typeof url !== 'object') {
    throw new InvalidArgumentError('Invalid URL: The URL argument must be a non-null object.')
  }

  if (!/^https?:/.test(url.origin || url.protocol)) {
    throw new InvalidArgumentError('Invalid URL protocol: the URL must start with `http:` or `https:`.')
  }

  if (!(url instanceof URL)) {
    if (url.port != null && url.port !== '' && !Number.isFinite(parseInt(url.port))) {
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

    const port = url.port != null
      ? url.port
      : (url.protocol === 'https:' ? 443 : 80)
    let origin = url.origin != null
      ? url.origin
      : `${url.protocol}//${url.hostname}:${port}`
    let path = url.path != null
      ? url.path
      : `${url.pathname || ''}${url.search || ''}`

    if (origin.endsWith('/')) {
      origin = origin.substring(0, origin.length - 1)
    }

    if (path && !path.startsWith('/')) {
      path = `/${path}`
    }
    // new URL(path, origin) is unsafe when `path` contains an absolute URL
    // From https://developer.mozilla.org/en-US/docs/Web/API/URL/URL:
    // If first parameter is a relative URL, second param is required, and will be used as the base URL.
    // If first parameter is an absolute URL, a given second param will be ignored.
    url = new URL(origin + path)
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

  assert.strictEqual(typeof host, 'string')

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

function isDestroyed (stream) {
  return !stream || !!(stream.destroyed || stream[kDestroyed])
}

function isReadableAborted (stream) {
  const state = stream && stream._readableState
  return isDestroyed(stream) && state && !state.endEmitted
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
    process.nextTick((stream, err) => {
      stream.emit('error', err)
    }, stream, err)
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
  return headerNameLowerCasedRecord[value] || value.toLowerCase()
}

function parseHeaders (headers, obj = {}) {
  // For H2 support
  if (!Array.isArray(headers)) return headers

  for (let i = 0; i < headers.length; i += 2) {
    const key = headers[i].toString().toLowerCase()
    let val = obj[key]

    if (!val) {
      if (Array.isArray(headers[i + 1])) {
        obj[key] = headers[i + 1].map(x => x.toString('utf8'))
      } else {
        obj[key] = headers[i + 1].toString('utf8')
      }
    } else {
      if (!Array.isArray(val)) {
        val = [val]
        obj[key] = val
      }
      val.push(headers[i + 1].toString('utf8'))
    }
  }

  // See https://github.com/nodejs/node/pull/46528
  if ('content-length' in obj && 'content-disposition' in obj) {
    obj['content-disposition'] = Buffer.from(obj['content-disposition']).toString('latin1')
  }

  return obj
}

function parseRawHeaders (headers) {
  const ret = []
  let hasContentLength = false
  let contentDispositionIdx = -1

  for (let n = 0; n < headers.length; n += 2) {
    const key = headers[n + 0].toString()
    const val = headers[n + 1].toString('utf8')

    if (key.length === 14 && (key === 'content-length' || key.toLowerCase() === 'content-length')) {
      ret.push(key, val)
      hasContentLength = true
    } else if (key.length === 19 && (key === 'content-disposition' || key.toLowerCase() === 'content-disposition')) {
      contentDispositionIdx = ret.push(key, val) - 1
    } else {
      ret.push(key, val)
    }
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
  return !!(body && (
    stream.isDisturbed
      ? stream.isDisturbed(body) || body[kBodyUsed] // TODO (fix): Why is body[kBodyUsed] needed?
      : body[kBodyUsed] ||
        body.readableDidRead ||
        (body._readableState && body._readableState.dataEmitted) ||
        isReadableAborted(body)
  ))
}

function isErrored (body) {
  return !!(body && (
    stream.isErrored
      ? stream.isErrored(body)
      : /state: 'errored'/.test(nodeUtil.inspect(body)
      )))
}

function isReadable (body) {
  return !!(body && (
    stream.isReadable
      ? stream.isReadable(body)
      : /state: 'readable'/.test(nodeUtil.inspect(body)
      )))
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

async function * convertIterableToBuffer (iterable) {
  for await (const chunk of iterable) {
    yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
  }
}

let ReadableStream
function ReadableStreamFrom (iterable) {
  if (!ReadableStream) {
    ReadableStream = require('stream/web').ReadableStream
  }

  if (ReadableStream.from) {
    return ReadableStream.from(convertIterableToBuffer(iterable))
  }

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
          })
        } else {
          const buf = Buffer.isBuffer(value) ? value : Buffer.from(value)
          controller.enqueue(new Uint8Array(buf))
        }
        return controller.desiredSize > 0
      },
      async cancel (reason) {
        await iterator.return()
      }
    },
    0
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

function throwIfAborted (signal) {
  if (!signal) { return }
  if (typeof signal.throwIfAborted === 'function') {
    signal.throwIfAborted()
  } else {
    if (signal.aborted) {
      // DOMException not available < v17.0.0
      const err = new Error('The operation was aborted')
      err.name = 'AbortError'
      throw err
    }
  }
}

function addAbortListener (signal, listener) {
  if ('addEventListener' in signal) {
    signal.addEventListener('abort', listener, { once: true })
    return () => signal.removeEventListener('abort', listener)
  }
  signal.addListener('abort', listener)
  return () => signal.removeListener('abort', listener)
}

const hasToWellFormed = !!String.prototype.toWellFormed

/**
 * @param {string} val
 */
function toUSVString (val) {
  if (hasToWellFormed) {
    return `${val}`.toWellFormed()
  } else if (nodeUtil.toUSVString) {
    return nodeUtil.toUSVString(val)
  }

  return `${val}`
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

const kEnumerableProperty = Object.create(null)
kEnumerableProperty.enumerable = true

module.exports = {
  kEnumerableProperty,
  nop,
  isDisturbed,
  isErrored,
  isReadable,
  toUSVString,
  isReadableAborted,
  isBlobLike,
  parseOrigin,
  parseURL,
  getServerName,
  isStream,
  isIterable,
  isAsyncIterable,
  isDestroyed,
  headerNameToString,
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
  throwIfAborted,
  addAbortListener,
  parseRangeHeader,
  nodeMajor,
  nodeMinor,
  nodeHasAutoSelectFamily: nodeMajor > 18 || (nodeMajor === 18 && nodeMinor >= 13),
  safeHTTPMethods: ['GET', 'HEAD', 'OPTIONS', 'TRACE']
}
