'use strict'

/**
 * @see https://developer.mozilla.org/docs/Web/HTTP/Headers
 */
const wellknownHeaderNames = /** @type {const} */ ([
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Accept-Ranges',
  'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Origin',
  'Access-Control-Expose-Headers',
  'Access-Control-Max-Age',
  'Access-Control-Request-Headers',
  'Access-Control-Request-Method',
  'Age',
  'Allow',
  'Alt-Svc',
  'Alt-Used',
  'Authorization',
  'Cache-Control',
  'Clear-Site-Data',
  'Connection',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Language',
  'Content-Length',
  'Content-Location',
  'Content-Range',
  'Content-Security-Policy',
  'Content-Security-Policy-Report-Only',
  'Content-Type',
  'Cookie',
  'Cross-Origin-Embedder-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy',
  'Date',
  'Device-Memory',
  'Downlink',
  'ECT',
  'ETag',
  'Expect',
  'Expect-CT',
  'Expires',
  'Forwarded',
  'From',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Keep-Alive',
  'Last-Modified',
  'Link',
  'Location',
  'Max-Forwards',
  'Origin',
  'Permissions-Policy',
  'Pragma',
  'Proxy-Authenticate',
  'Proxy-Authorization',
  'RTT',
  'Range',
  'Referer',
  'Referrer-Policy',
  'Refresh',
  'Retry-After',
  'Sec-WebSocket-Accept',
  'Sec-WebSocket-Extensions',
  'Sec-WebSocket-Key',
  'Sec-WebSocket-Protocol',
  'Sec-WebSocket-Version',
  'Server',
  'Server-Timing',
  'Service-Worker-Allowed',
  'Service-Worker-Navigation-Preload',
  'Set-Cookie',
  'SourceMap',
  'Strict-Transport-Security',
  'Supports-Loading-Mode',
  'TE',
  'Timing-Allow-Origin',
  'Trailer',
  'Transfer-Encoding',
  'Upgrade',
  'Upgrade-Insecure-Requests',
  'User-Agent',
  'Vary',
  'Via',
  'WWW-Authenticate',
  'X-Content-Type-Options',
  'X-DNS-Prefetch-Control',
  'X-Frame-Options',
  'X-Permitted-Cross-Domain-Policies',
  'X-Powered-By',
  'X-Requested-With',
  'X-XSS-Protection'
])

/** @type {Record<typeof wellknownHeaderNames[number]|Lowercase<typeof wellknownHeaderNames[number]>, string>} */
const headerNameLowerCasedRecord = {}

// Note: object prototypes should not be able to be referenced. e.g. `Object#hasOwnProperty`.
Object.setPrototypeOf(headerNameLowerCasedRecord, null)

/**
 * @type {Record<Lowercase<typeof wellknownHeaderNames[number]>, Buffer>}
 */
const wellknownHeaderNameBuffers = {}

// Note: object prototypes should not be able to be referenced. e.g. `Object#hasOwnProperty`.
Object.setPrototypeOf(wellknownHeaderNameBuffers, null)

/**
 * @param {string} header Lowercased header
 * @returns {Buffer}
 */
function getHeaderNameAsBuffer (header) {
  let buffer = wellknownHeaderNameBuffers[header]

  if (buffer === undefined) {
    buffer = Buffer.from(header)
  }

  return buffer
}

for (let i = 0; i < wellknownHeaderNames.length; ++i) {
  const key = wellknownHeaderNames[i]
  const lowerCasedKey = key.toLowerCase()
  headerNameLowerCasedRecord[key] = headerNameLowerCasedRecord[lowerCasedKey] =
    lowerCasedKey
}

module.exports = {
  wellknownHeaderNames,
  headerNameLowerCasedRecord,
  getHeaderNameAsBuffer
}
