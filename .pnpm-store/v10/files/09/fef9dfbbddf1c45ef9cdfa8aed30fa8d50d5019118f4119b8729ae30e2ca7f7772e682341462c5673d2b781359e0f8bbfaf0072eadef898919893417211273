'use strict'

const { Transform } = require('node:stream')
const zlib = require('node:zlib')
const { redirectStatusSet, referrerPolicySet: referrerPolicyTokens, badPortsSet } = require('./constants')
const { getGlobalOrigin } = require('./global')
const { collectASequenceOfCodePoints, collectAnHTTPQuotedString, removeChars, parseMIMEType } = require('./data-url')
const { performance } = require('node:perf_hooks')
const { isBlobLike, ReadableStreamFrom, isValidHTTPToken, normalizedMethodRecordsBase } = require('../../core/util')
const assert = require('node:assert')
const { isUint8Array } = require('node:util/types')
const { webidl } = require('./webidl')

let supportedHashes = []

// https://nodejs.org/api/crypto.html#determining-if-crypto-support-is-unavailable
/** @type {import('crypto')} */
let crypto
try {
  crypto = require('node:crypto')
  const possibleRelevantHashes = ['sha256', 'sha384', 'sha512']
  supportedHashes = crypto.getHashes().filter((hash) => possibleRelevantHashes.includes(hash))
/* c8 ignore next 3 */
} catch {

}

function responseURL (response) {
  // https://fetch.spec.whatwg.org/#responses
  // A response has an associated URL. It is a pointer to the last URL
  // in response’s URL list and null if response’s URL list is empty.
  const urlList = response.urlList
  const length = urlList.length
  return length === 0 ? null : urlList[length - 1].toString()
}

// https://fetch.spec.whatwg.org/#concept-response-location-url
function responseLocationURL (response, requestFragment) {
  // 1. If response’s status is not a redirect status, then return null.
  if (!redirectStatusSet.has(response.status)) {
    return null
  }

  // 2. Let location be the result of extracting header list values given
  // `Location` and response’s header list.
  let location = response.headersList.get('location', true)

  // 3. If location is a header value, then set location to the result of
  //    parsing location with response’s URL.
  if (location !== null && isValidHeaderValue(location)) {
    if (!isValidEncodedURL(location)) {
      // Some websites respond location header in UTF-8 form without encoding them as ASCII
      // and major browsers redirect them to correctly UTF-8 encoded addresses.
      // Here, we handle that behavior in the same way.
      location = normalizeBinaryStringToUtf8(location)
    }
    location = new URL(location, responseURL(response))
  }

  // 4. If location is a URL whose fragment is null, then set location’s
  // fragment to requestFragment.
  if (location && !location.hash) {
    location.hash = requestFragment
  }

  // 5. Return location.
  return location
}

/**
 * @see https://www.rfc-editor.org/rfc/rfc1738#section-2.2
 * @param {string} url
 * @returns {boolean}
 */
function isValidEncodedURL (url) {
  for (let i = 0; i < url.length; ++i) {
    const code = url.charCodeAt(i)

    if (
      code > 0x7E || // Non-US-ASCII + DEL
      code < 0x20 // Control characters NUL - US
    ) {
      return false
    }
  }
  return true
}

/**
 * If string contains non-ASCII characters, assumes it's UTF-8 encoded and decodes it.
 * Since UTF-8 is a superset of ASCII, this will work for ASCII strings as well.
 * @param {string} value
 * @returns {string}
 */
function normalizeBinaryStringToUtf8 (value) {
  return Buffer.from(value, 'binary').toString('utf8')
}

/** @returns {URL} */
function requestCurrentURL (request) {
  return request.urlList[request.urlList.length - 1]
}

function requestBadPort (request) {
  // 1. Let url be request’s current URL.
  const url = requestCurrentURL(request)

  // 2. If url’s scheme is an HTTP(S) scheme and url’s port is a bad port,
  // then return blocked.
  if (urlIsHttpHttpsScheme(url) && badPortsSet.has(url.port)) {
    return 'blocked'
  }

  // 3. Return allowed.
  return 'allowed'
}

function isErrorLike (object) {
  return object instanceof Error || (
    object?.constructor?.name === 'Error' ||
    object?.constructor?.name === 'DOMException'
  )
}

// Check whether |statusText| is a ByteString and
// matches the Reason-Phrase token production.
// RFC 2616: https://tools.ietf.org/html/rfc2616
// RFC 7230: https://tools.ietf.org/html/rfc7230
// "reason-phrase = *( HTAB / SP / VCHAR / obs-text )"
// https://github.com/chromium/chromium/blob/94.0.4604.1/third_party/blink/renderer/core/fetch/response.cc#L116
function isValidReasonPhrase (statusText) {
  for (let i = 0; i < statusText.length; ++i) {
    const c = statusText.charCodeAt(i)
    if (
      !(
        (
          c === 0x09 || // HTAB
          (c >= 0x20 && c <= 0x7e) || // SP / VCHAR
          (c >= 0x80 && c <= 0xff)
        ) // obs-text
      )
    ) {
      return false
    }
  }
  return true
}

/**
 * @see https://fetch.spec.whatwg.org/#header-name
 * @param {string} potentialValue
 */
const isValidHeaderName = isValidHTTPToken

/**
 * @see https://fetch.spec.whatwg.org/#header-value
 * @param {string} potentialValue
 */
function isValidHeaderValue (potentialValue) {
  // - Has no leading or trailing HTTP tab or space bytes.
  // - Contains no 0x00 (NUL) or HTTP newline bytes.
  return (
    potentialValue[0] === '\t' ||
    potentialValue[0] === ' ' ||
    potentialValue[potentialValue.length - 1] === '\t' ||
    potentialValue[potentialValue.length - 1] === ' ' ||
    potentialValue.includes('\n') ||
    potentialValue.includes('\r') ||
    potentialValue.includes('\0')
  ) === false
}

// https://w3c.github.io/webappsec-referrer-policy/#set-requests-referrer-policy-on-redirect
function setRequestReferrerPolicyOnRedirect (request, actualResponse) {
  //  Given a request request and a response actualResponse, this algorithm
  //  updates request’s referrer policy according to the Referrer-Policy
  //  header (if any) in actualResponse.

  // 1. Let policy be the result of executing § 8.1 Parse a referrer policy
  // from a Referrer-Policy header on actualResponse.

  // 8.1 Parse a referrer policy from a Referrer-Policy header
  // 1. Let policy-tokens be the result of extracting header list values given `Referrer-Policy` and response’s header list.
  const { headersList } = actualResponse
  // 2. Let policy be the empty string.
  // 3. For each token in policy-tokens, if token is a referrer policy and token is not the empty string, then set policy to token.
  // 4. Return policy.
  const policyHeader = (headersList.get('referrer-policy', true) ?? '').split(',')

  // Note: As the referrer-policy can contain multiple policies
  // separated by comma, we need to loop through all of them
  // and pick the first valid one.
  // Ref: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy#specify_a_fallback_policy
  let policy = ''
  if (policyHeader.length > 0) {
    // The right-most policy takes precedence.
    // The left-most policy is the fallback.
    for (let i = policyHeader.length; i !== 0; i--) {
      const token = policyHeader[i - 1].trim()
      if (referrerPolicyTokens.has(token)) {
        policy = token
        break
      }
    }
  }

  // 2. If policy is not the empty string, then set request’s referrer policy to policy.
  if (policy !== '') {
    request.referrerPolicy = policy
  }
}

// https://fetch.spec.whatwg.org/#cross-origin-resource-policy-check
function crossOriginResourcePolicyCheck () {
  // TODO
  return 'allowed'
}

// https://fetch.spec.whatwg.org/#concept-cors-check
function corsCheck () {
  // TODO
  return 'success'
}

// https://fetch.spec.whatwg.org/#concept-tao-check
function TAOCheck () {
  // TODO
  return 'success'
}

function appendFetchMetadata (httpRequest) {
  //  https://w3c.github.io/webappsec-fetch-metadata/#sec-fetch-dest-header
  //  TODO

  //  https://w3c.github.io/webappsec-fetch-metadata/#sec-fetch-mode-header

  //  1. Assert: r’s url is a potentially trustworthy URL.
  //  TODO

  //  2. Let header be a Structured Header whose value is a token.
  let header = null

  //  3. Set header’s value to r’s mode.
  header = httpRequest.mode

  //  4. Set a structured field value `Sec-Fetch-Mode`/header in r’s header list.
  httpRequest.headersList.set('sec-fetch-mode', header, true)

  //  https://w3c.github.io/webappsec-fetch-metadata/#sec-fetch-site-header
  //  TODO

  //  https://w3c.github.io/webappsec-fetch-metadata/#sec-fetch-user-header
  //  TODO
}

// https://fetch.spec.whatwg.org/#append-a-request-origin-header
function appendRequestOriginHeader (request) {
  // 1. Let serializedOrigin be the result of byte-serializing a request origin
  //    with request.
  // TODO: implement "byte-serializing a request origin"
  let serializedOrigin = request.origin

  // - "'client' is changed to an origin during fetching."
  //   This doesn't happen in undici (in most cases) because undici, by default,
  //   has no concept of origin.
  // - request.origin can also be set to request.client.origin (client being
  //   an environment settings object), which is undefined without using
  //   setGlobalOrigin.
  if (serializedOrigin === 'client' || serializedOrigin === undefined) {
    return
  }

  // 2. If request’s response tainting is "cors" or request’s mode is "websocket",
  //    then append (`Origin`, serializedOrigin) to request’s header list.
  // 3. Otherwise, if request’s method is neither `GET` nor `HEAD`, then:
  if (request.responseTainting === 'cors' || request.mode === 'websocket') {
    request.headersList.append('origin', serializedOrigin, true)
  } else if (request.method !== 'GET' && request.method !== 'HEAD') {
    // 1. Switch on request’s referrer policy:
    switch (request.referrerPolicy) {
      case 'no-referrer':
        // Set serializedOrigin to `null`.
        serializedOrigin = null
        break
      case 'no-referrer-when-downgrade':
      case 'strict-origin':
      case 'strict-origin-when-cross-origin':
        // If request’s origin is a tuple origin, its scheme is "https", and
        // request’s current URL’s scheme is not "https", then set
        // serializedOrigin to `null`.
        if (request.origin && urlHasHttpsScheme(request.origin) && !urlHasHttpsScheme(requestCurrentURL(request))) {
          serializedOrigin = null
        }
        break
      case 'same-origin':
        // If request’s origin is not same origin with request’s current URL’s
        // origin, then set serializedOrigin to `null`.
        if (!sameOrigin(request, requestCurrentURL(request))) {
          serializedOrigin = null
        }
        break
      default:
        // Do nothing.
    }

    // 2. Append (`Origin`, serializedOrigin) to request’s header list.
    request.headersList.append('origin', serializedOrigin, true)
  }
}

// https://w3c.github.io/hr-time/#dfn-coarsen-time
function coarsenTime (timestamp, crossOriginIsolatedCapability) {
  // TODO
  return timestamp
}

// https://fetch.spec.whatwg.org/#clamp-and-coarsen-connection-timing-info
function clampAndCoarsenConnectionTimingInfo (connectionTimingInfo, defaultStartTime, crossOriginIsolatedCapability) {
  if (!connectionTimingInfo?.startTime || connectionTimingInfo.startTime < defaultStartTime) {
    return {
      domainLookupStartTime: defaultStartTime,
      domainLookupEndTime: defaultStartTime,
      connectionStartTime: defaultStartTime,
      connectionEndTime: defaultStartTime,
      secureConnectionStartTime: defaultStartTime,
      ALPNNegotiatedProtocol: connectionTimingInfo?.ALPNNegotiatedProtocol
    }
  }

  return {
    domainLookupStartTime: coarsenTime(connectionTimingInfo.domainLookupStartTime, crossOriginIsolatedCapability),
    domainLookupEndTime: coarsenTime(connectionTimingInfo.domainLookupEndTime, crossOriginIsolatedCapability),
    connectionStartTime: coarsenTime(connectionTimingInfo.connectionStartTime, crossOriginIsolatedCapability),
    connectionEndTime: coarsenTime(connectionTimingInfo.connectionEndTime, crossOriginIsolatedCapability),
    secureConnectionStartTime: coarsenTime(connectionTimingInfo.secureConnectionStartTime, crossOriginIsolatedCapability),
    ALPNNegotiatedProtocol: connectionTimingInfo.ALPNNegotiatedProtocol
  }
}

// https://w3c.github.io/hr-time/#dfn-coarsened-shared-current-time
function coarsenedSharedCurrentTime (crossOriginIsolatedCapability) {
  return coarsenTime(performance.now(), crossOriginIsolatedCapability)
}

// https://fetch.spec.whatwg.org/#create-an-opaque-timing-info
function createOpaqueTimingInfo (timingInfo) {
  return {
    startTime: timingInfo.startTime ?? 0,
    redirectStartTime: 0,
    redirectEndTime: 0,
    postRedirectStartTime: timingInfo.startTime ?? 0,
    finalServiceWorkerStartTime: 0,
    finalNetworkResponseStartTime: 0,
    finalNetworkRequestStartTime: 0,
    endTime: 0,
    encodedBodySize: 0,
    decodedBodySize: 0,
    finalConnectionTimingInfo: null
  }
}

// https://html.spec.whatwg.org/multipage/origin.html#policy-container
function makePolicyContainer () {
  // Note: the fetch spec doesn't make use of embedder policy or CSP list
  return {
    referrerPolicy: 'strict-origin-when-cross-origin'
  }
}

// https://html.spec.whatwg.org/multipage/origin.html#clone-a-policy-container
function clonePolicyContainer (policyContainer) {
  return {
    referrerPolicy: policyContainer.referrerPolicy
  }
}

// https://w3c.github.io/webappsec-referrer-policy/#determine-requests-referrer
function determineRequestsReferrer (request) {
  // 1. Let policy be request's referrer policy.
  const policy = request.referrerPolicy

  // Note: policy cannot (shouldn't) be null or an empty string.
  assert(policy)

  // 2. Let environment be request’s client.

  let referrerSource = null

  // 3. Switch on request’s referrer:
  if (request.referrer === 'client') {
    // Note: node isn't a browser and doesn't implement document/iframes,
    // so we bypass this step and replace it with our own.

    const globalOrigin = getGlobalOrigin()

    if (!globalOrigin || globalOrigin.origin === 'null') {
      return 'no-referrer'
    }

    // note: we need to clone it as it's mutated
    referrerSource = new URL(globalOrigin)
  } else if (request.referrer instanceof URL) {
    // Let referrerSource be request’s referrer.
    referrerSource = request.referrer
  }

  // 4. Let request’s referrerURL be the result of stripping referrerSource for
  //    use as a referrer.
  let referrerURL = stripURLForReferrer(referrerSource)

  // 5. Let referrerOrigin be the result of stripping referrerSource for use as
  //    a referrer, with the origin-only flag set to true.
  const referrerOrigin = stripURLForReferrer(referrerSource, true)

  // 6. If the result of serializing referrerURL is a string whose length is
  //    greater than 4096, set referrerURL to referrerOrigin.
  if (referrerURL.toString().length > 4096) {
    referrerURL = referrerOrigin
  }

  const areSameOrigin = sameOrigin(request, referrerURL)
  const isNonPotentiallyTrustWorthy = isURLPotentiallyTrustworthy(referrerURL) &&
    !isURLPotentiallyTrustworthy(request.url)

  // 8. Execute the switch statements corresponding to the value of policy:
  switch (policy) {
    case 'origin': return referrerOrigin != null ? referrerOrigin : stripURLForReferrer(referrerSource, true)
    case 'unsafe-url': return referrerURL
    case 'same-origin':
      return areSameOrigin ? referrerOrigin : 'no-referrer'
    case 'origin-when-cross-origin':
      return areSameOrigin ? referrerURL : referrerOrigin
    case 'strict-origin-when-cross-origin': {
      const currentURL = requestCurrentURL(request)

      // 1. If the origin of referrerURL and the origin of request’s current
      //    URL are the same, then return referrerURL.
      if (sameOrigin(referrerURL, currentURL)) {
        return referrerURL
      }

      // 2. If referrerURL is a potentially trustworthy URL and request’s
      //    current URL is not a potentially trustworthy URL, then return no
      //    referrer.
      if (isURLPotentiallyTrustworthy(referrerURL) && !isURLPotentiallyTrustworthy(currentURL)) {
        return 'no-referrer'
      }

      // 3. Return referrerOrigin.
      return referrerOrigin
    }
    case 'strict-origin': // eslint-disable-line
      /**
         * 1. If referrerURL is a potentially trustworthy URL and
         * request’s current URL is not a potentially trustworthy URL,
         * then return no referrer.
         * 2. Return referrerOrigin
        */
    case 'no-referrer-when-downgrade': // eslint-disable-line
      /**
       * 1. If referrerURL is a potentially trustworthy URL and
       * request’s current URL is not a potentially trustworthy URL,
       * then return no referrer.
       * 2. Return referrerOrigin
      */

    default: // eslint-disable-line
      return isNonPotentiallyTrustWorthy ? 'no-referrer' : referrerOrigin
  }
}

/**
 * @see https://w3c.github.io/webappsec-referrer-policy/#strip-url
 * @param {URL} url
 * @param {boolean|undefined} originOnly
 */
function stripURLForReferrer (url, originOnly) {
  // 1. Assert: url is a URL.
  assert(url instanceof URL)

  url = new URL(url)

  // 2. If url’s scheme is a local scheme, then return no referrer.
  if (url.protocol === 'file:' || url.protocol === 'about:' || url.protocol === 'blank:') {
    return 'no-referrer'
  }

  // 3. Set url’s username to the empty string.
  url.username = ''

  // 4. Set url’s password to the empty string.
  url.password = ''

  // 5. Set url’s fragment to null.
  url.hash = ''

  // 6. If the origin-only flag is true, then:
  if (originOnly) {
    // 1. Set url’s path to « the empty string ».
    url.pathname = ''

    // 2. Set url’s query to null.
    url.search = ''
  }

  // 7. Return url.
  return url
}

function isURLPotentiallyTrustworthy (url) {
  if (!(url instanceof URL)) {
    return false
  }

  // If child of about, return true
  if (url.href === 'about:blank' || url.href === 'about:srcdoc') {
    return true
  }

  // If scheme is data, return true
  if (url.protocol === 'data:') return true

  // If file, return true
  if (url.protocol === 'file:') return true

  return isOriginPotentiallyTrustworthy(url.origin)

  function isOriginPotentiallyTrustworthy (origin) {
    // If origin is explicitly null, return false
    if (origin == null || origin === 'null') return false

    const originAsURL = new URL(origin)

    // If secure, return true
    if (originAsURL.protocol === 'https:' || originAsURL.protocol === 'wss:') {
      return true
    }

    // If localhost or variants, return true
    if (/^127(?:\.[0-9]+){0,2}\.[0-9]+$|^\[(?:0*:)*?:?0*1\]$/.test(originAsURL.hostname) ||
     (originAsURL.hostname === 'localhost' || originAsURL.hostname.includes('localhost.')) ||
     (originAsURL.hostname.endsWith('.localhost'))) {
      return true
    }

    // If any other, return false
    return false
  }
}

/**
 * @see https://w3c.github.io/webappsec-subresource-integrity/#does-response-match-metadatalist
 * @param {Uint8Array} bytes
 * @param {string} metadataList
 */
function bytesMatch (bytes, metadataList) {
  // If node is not built with OpenSSL support, we cannot check
  // a request's integrity, so allow it by default (the spec will
  // allow requests if an invalid hash is given, as precedence).
  /* istanbul ignore if: only if node is built with --without-ssl */
  if (crypto === undefined) {
    return true
  }

  // 1. Let parsedMetadata be the result of parsing metadataList.
  const parsedMetadata = parseMetadata(metadataList)

  // 2. If parsedMetadata is no metadata, return true.
  if (parsedMetadata === 'no metadata') {
    return true
  }

  // 3. If response is not eligible for integrity validation, return false.
  // TODO

  // 4. If parsedMetadata is the empty set, return true.
  if (parsedMetadata.length === 0) {
    return true
  }

  // 5. Let metadata be the result of getting the strongest
  //    metadata from parsedMetadata.
  const strongest = getStrongestMetadata(parsedMetadata)
  const metadata = filterMetadataListByAlgorithm(parsedMetadata, strongest)

  // 6. For each item in metadata:
  for (const item of metadata) {
    // 1. Let algorithm be the alg component of item.
    const algorithm = item.algo

    // 2. Let expectedValue be the val component of item.
    const expectedValue = item.hash

    // See https://github.com/web-platform-tests/wpt/commit/e4c5cc7a5e48093220528dfdd1c4012dc3837a0e
    // "be liberal with padding". This is annoying, and it's not even in the spec.

    // 3. Let actualValue be the result of applying algorithm to bytes.
    let actualValue = crypto.createHash(algorithm).update(bytes).digest('base64')

    if (actualValue[actualValue.length - 1] === '=') {
      if (actualValue[actualValue.length - 2] === '=') {
        actualValue = actualValue.slice(0, -2)
      } else {
        actualValue = actualValue.slice(0, -1)
      }
    }

    // 4. If actualValue is a case-sensitive match for expectedValue,
    //    return true.
    if (compareBase64Mixed(actualValue, expectedValue)) {
      return true
    }
  }

  // 7. Return false.
  return false
}

// https://w3c.github.io/webappsec-subresource-integrity/#grammardef-hash-with-options
// https://www.w3.org/TR/CSP2/#source-list-syntax
// https://www.rfc-editor.org/rfc/rfc5234#appendix-B.1
const parseHashWithOptions = /(?<algo>sha256|sha384|sha512)-((?<hash>[A-Za-z0-9+/]+|[A-Za-z0-9_-]+)={0,2}(?:\s|$)( +[!-~]*)?)?/i

/**
 * @see https://w3c.github.io/webappsec-subresource-integrity/#parse-metadata
 * @param {string} metadata
 */
function parseMetadata (metadata) {
  // 1. Let result be the empty set.
  /** @type {{ algo: string, hash: string }[]} */
  const result = []

  // 2. Let empty be equal to true.
  let empty = true

  // 3. For each token returned by splitting metadata on spaces:
  for (const token of metadata.split(' ')) {
    // 1. Set empty to false.
    empty = false

    // 2. Parse token as a hash-with-options.
    const parsedToken = parseHashWithOptions.exec(token)

    // 3. If token does not parse, continue to the next token.
    if (
      parsedToken === null ||
      parsedToken.groups === undefined ||
      parsedToken.groups.algo === undefined
    ) {
      // Note: Chromium blocks the request at this point, but Firefox
      // gives a warning that an invalid integrity was given. The
      // correct behavior is to ignore these, and subsequently not
      // check the integrity of the resource.
      continue
    }

    // 4. Let algorithm be the hash-algo component of token.
    const algorithm = parsedToken.groups.algo.toLowerCase()

    // 5. If algorithm is a hash function recognized by the user
    //    agent, add the parsed token to result.
    if (supportedHashes.includes(algorithm)) {
      result.push(parsedToken.groups)
    }
  }

  // 4. Return no metadata if empty is true, otherwise return result.
  if (empty === true) {
    return 'no metadata'
  }

  return result
}

/**
 * @param {{ algo: 'sha256' | 'sha384' | 'sha512' }[]} metadataList
 */
function getStrongestMetadata (metadataList) {
  // Let algorithm be the algo component of the first item in metadataList.
  // Can be sha256
  let algorithm = metadataList[0].algo
  // If the algorithm is sha512, then it is the strongest
  // and we can return immediately
  if (algorithm[3] === '5') {
    return algorithm
  }

  for (let i = 1; i < metadataList.length; ++i) {
    const metadata = metadataList[i]
    // If the algorithm is sha512, then it is the strongest
    // and we can break the loop immediately
    if (metadata.algo[3] === '5') {
      algorithm = 'sha512'
      break
    // If the algorithm is sha384, then a potential sha256 or sha384 is ignored
    } else if (algorithm[3] === '3') {
      continue
    // algorithm is sha256, check if algorithm is sha384 and if so, set it as
    // the strongest
    } else if (metadata.algo[3] === '3') {
      algorithm = 'sha384'
    }
  }
  return algorithm
}

function filterMetadataListByAlgorithm (metadataList, algorithm) {
  if (metadataList.length === 1) {
    return metadataList
  }

  let pos = 0
  for (let i = 0; i < metadataList.length; ++i) {
    if (metadataList[i].algo === algorithm) {
      metadataList[pos++] = metadataList[i]
    }
  }

  metadataList.length = pos

  return metadataList
}

/**
 * Compares two base64 strings, allowing for base64url
 * in the second string.
 *
* @param {string} actualValue always base64
 * @param {string} expectedValue base64 or base64url
 * @returns {boolean}
 */
function compareBase64Mixed (actualValue, expectedValue) {
  if (actualValue.length !== expectedValue.length) {
    return false
  }
  for (let i = 0; i < actualValue.length; ++i) {
    if (actualValue[i] !== expectedValue[i]) {
      if (
        (actualValue[i] === '+' && expectedValue[i] === '-') ||
        (actualValue[i] === '/' && expectedValue[i] === '_')
      ) {
        continue
      }
      return false
    }
  }

  return true
}

// https://w3c.github.io/webappsec-upgrade-insecure-requests/#upgrade-request
function tryUpgradeRequestToAPotentiallyTrustworthyURL (request) {
  // TODO
}

/**
 * @link {https://html.spec.whatwg.org/multipage/origin.html#same-origin}
 * @param {URL} A
 * @param {URL} B
 */
function sameOrigin (A, B) {
  // 1. If A and B are the same opaque origin, then return true.
  if (A.origin === B.origin && A.origin === 'null') {
    return true
  }

  // 2. If A and B are both tuple origins and their schemes,
  //    hosts, and port are identical, then return true.
  if (A.protocol === B.protocol && A.hostname === B.hostname && A.port === B.port) {
    return true
  }

  // 3. Return false.
  return false
}

function createDeferredPromise () {
  let res
  let rej
  const promise = new Promise((resolve, reject) => {
    res = resolve
    rej = reject
  })

  return { promise, resolve: res, reject: rej }
}

function isAborted (fetchParams) {
  return fetchParams.controller.state === 'aborted'
}

function isCancelled (fetchParams) {
  return fetchParams.controller.state === 'aborted' ||
    fetchParams.controller.state === 'terminated'
}

/**
 * @see https://fetch.spec.whatwg.org/#concept-method-normalize
 * @param {string} method
 */
function normalizeMethod (method) {
  return normalizedMethodRecordsBase[method.toLowerCase()] ?? method
}

// https://infra.spec.whatwg.org/#serialize-a-javascript-value-to-a-json-string
function serializeJavascriptValueToJSONString (value) {
  // 1. Let result be ? Call(%JSON.stringify%, undefined, « value »).
  const result = JSON.stringify(value)

  // 2. If result is undefined, then throw a TypeError.
  if (result === undefined) {
    throw new TypeError('Value is not JSON serializable')
  }

  // 3. Assert: result is a string.
  assert(typeof result === 'string')

  // 4. Return result.
  return result
}

// https://tc39.es/ecma262/#sec-%25iteratorprototype%25-object
const esIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()))

/**
 * @see https://webidl.spec.whatwg.org/#dfn-iterator-prototype-object
 * @param {string} name name of the instance
 * @param {symbol} kInternalIterator
 * @param {string | number} [keyIndex]
 * @param {string | number} [valueIndex]
 */
function createIterator (name, kInternalIterator, keyIndex = 0, valueIndex = 1) {
  class FastIterableIterator {
    /** @type {any} */
    #target
    /** @type {'key' | 'value' | 'key+value'} */
    #kind
    /** @type {number} */
    #index

    /**
     * @see https://webidl.spec.whatwg.org/#dfn-default-iterator-object
     * @param {unknown} target
     * @param {'key' | 'value' | 'key+value'} kind
     */
    constructor (target, kind) {
      this.#target = target
      this.#kind = kind
      this.#index = 0
    }

    next () {
      // 1. Let interface be the interface for which the iterator prototype object exists.
      // 2. Let thisValue be the this value.
      // 3. Let object be ? ToObject(thisValue).
      // 4. If object is a platform object, then perform a security
      //    check, passing:
      // 5. If object is not a default iterator object for interface,
      //    then throw a TypeError.
      if (typeof this !== 'object' || this === null || !(#target in this)) {
        throw new TypeError(
          `'next' called on an object that does not implement interface ${name} Iterator.`
        )
      }

      // 6. Let index be object’s index.
      // 7. Let kind be object’s kind.
      // 8. Let values be object’s target's value pairs to iterate over.
      const index = this.#index
      const values = this.#target[kInternalIterator]

      // 9. Let len be the length of values.
      const len = values.length

      // 10. If index is greater than or equal to len, then return
      //     CreateIterResultObject(undefined, true).
      if (index >= len) {
        return {
          value: undefined,
          done: true
        }
      }

      // 11. Let pair be the entry in values at index index.
      const { [keyIndex]: key, [valueIndex]: value } = values[index]

      // 12. Set object’s index to index + 1.
      this.#index = index + 1

      // 13. Return the iterator result for pair and kind.

      // https://webidl.spec.whatwg.org/#iterator-result

      // 1. Let result be a value determined by the value of kind:
      let result
      switch (this.#kind) {
        case 'key':
          // 1. Let idlKey be pair’s key.
          // 2. Let key be the result of converting idlKey to an
          //    ECMAScript value.
          // 3. result is key.
          result = key
          break
        case 'value':
          // 1. Let idlValue be pair’s value.
          // 2. Let value be the result of converting idlValue to
          //    an ECMAScript value.
          // 3. result is value.
          result = value
          break
        case 'key+value':
          // 1. Let idlKey be pair’s key.
          // 2. Let idlValue be pair’s value.
          // 3. Let key be the result of converting idlKey to an
          //    ECMAScript value.
          // 4. Let value be the result of converting idlValue to
          //    an ECMAScript value.
          // 5. Let array be ! ArrayCreate(2).
          // 6. Call ! CreateDataProperty(array, "0", key).
          // 7. Call ! CreateDataProperty(array, "1", value).
          // 8. result is array.
          result = [key, value]
          break
      }

      // 2. Return CreateIterResultObject(result, false).
      return {
        value: result,
        done: false
      }
    }
  }

  // https://webidl.spec.whatwg.org/#dfn-iterator-prototype-object
  // @ts-ignore
  delete FastIterableIterator.prototype.constructor

  Object.setPrototypeOf(FastIterableIterator.prototype, esIteratorPrototype)

  Object.defineProperties(FastIterableIterator.prototype, {
    [Symbol.toStringTag]: {
      writable: false,
      enumerable: false,
      configurable: true,
      value: `${name} Iterator`
    },
    next: { writable: true, enumerable: true, configurable: true }
  })

  /**
   * @param {unknown} target
   * @param {'key' | 'value' | 'key+value'} kind
   * @returns {IterableIterator<any>}
   */
  return function (target, kind) {
    return new FastIterableIterator(target, kind)
  }
}

/**
 * @see https://webidl.spec.whatwg.org/#dfn-iterator-prototype-object
 * @param {string} name name of the instance
 * @param {any} object class
 * @param {symbol} kInternalIterator
 * @param {string | number} [keyIndex]
 * @param {string | number} [valueIndex]
 */
function iteratorMixin (name, object, kInternalIterator, keyIndex = 0, valueIndex = 1) {
  const makeIterator = createIterator(name, kInternalIterator, keyIndex, valueIndex)

  const properties = {
    keys: {
      writable: true,
      enumerable: true,
      configurable: true,
      value: function keys () {
        webidl.brandCheck(this, object)
        return makeIterator(this, 'key')
      }
    },
    values: {
      writable: true,
      enumerable: true,
      configurable: true,
      value: function values () {
        webidl.brandCheck(this, object)
        return makeIterator(this, 'value')
      }
    },
    entries: {
      writable: true,
      enumerable: true,
      configurable: true,
      value: function entries () {
        webidl.brandCheck(this, object)
        return makeIterator(this, 'key+value')
      }
    },
    forEach: {
      writable: true,
      enumerable: true,
      configurable: true,
      value: function forEach (callbackfn, thisArg = globalThis) {
        webidl.brandCheck(this, object)
        webidl.argumentLengthCheck(arguments, 1, `${name}.forEach`)
        if (typeof callbackfn !== 'function') {
          throw new TypeError(
            `Failed to execute 'forEach' on '${name}': parameter 1 is not of type 'Function'.`
          )
        }
        for (const { 0: key, 1: value } of makeIterator(this, 'key+value')) {
          callbackfn.call(thisArg, value, key, this)
        }
      }
    }
  }

  return Object.defineProperties(object.prototype, {
    ...properties,
    [Symbol.iterator]: {
      writable: true,
      enumerable: false,
      configurable: true,
      value: properties.entries.value
    }
  })
}

/**
 * @see https://fetch.spec.whatwg.org/#body-fully-read
 */
async function fullyReadBody (body, processBody, processBodyError) {
  // 1. If taskDestination is null, then set taskDestination to
  //    the result of starting a new parallel queue.

  // 2. Let successSteps given a byte sequence bytes be to queue a
  //    fetch task to run processBody given bytes, with taskDestination.
  const successSteps = processBody

  // 3. Let errorSteps be to queue a fetch task to run processBodyError,
  //    with taskDestination.
  const errorSteps = processBodyError

  // 4. Let reader be the result of getting a reader for body’s stream.
  //    If that threw an exception, then run errorSteps with that
  //    exception and return.
  let reader

  try {
    reader = body.stream.getReader()
  } catch (e) {
    errorSteps(e)
    return
  }

  // 5. Read all bytes from reader, given successSteps and errorSteps.
  try {
    successSteps(await readAllBytes(reader))
  } catch (e) {
    errorSteps(e)
  }
}

function isReadableStreamLike (stream) {
  return stream instanceof ReadableStream || (
    stream[Symbol.toStringTag] === 'ReadableStream' &&
    typeof stream.tee === 'function'
  )
}

/**
 * @param {ReadableStreamController<Uint8Array>} controller
 */
function readableStreamClose (controller) {
  try {
    controller.close()
    controller.byobRequest?.respond(0)
  } catch (err) {
    // TODO: add comment explaining why this error occurs.
    if (!err.message.includes('Controller is already closed') && !err.message.includes('ReadableStream is already closed')) {
      throw err
    }
  }
}

const invalidIsomorphicEncodeValueRegex = /[^\x00-\xFF]/ // eslint-disable-line

/**
 * @see https://infra.spec.whatwg.org/#isomorphic-encode
 * @param {string} input
 */
function isomorphicEncode (input) {
  // 1. Assert: input contains no code points greater than U+00FF.
  assert(!invalidIsomorphicEncodeValueRegex.test(input))

  // 2. Return a byte sequence whose length is equal to input’s code
  //    point length and whose bytes have the same values as the
  //    values of input’s code points, in the same order
  return input
}

/**
 * @see https://streams.spec.whatwg.org/#readablestreamdefaultreader-read-all-bytes
 * @see https://streams.spec.whatwg.org/#read-loop
 * @param {ReadableStreamDefaultReader} reader
 */
async function readAllBytes (reader) {
  const bytes = []
  let byteLength = 0

  while (true) {
    const { done, value: chunk } = await reader.read()

    if (done) {
      // 1. Call successSteps with bytes.
      return Buffer.concat(bytes, byteLength)
    }

    // 1. If chunk is not a Uint8Array object, call failureSteps
    //    with a TypeError and abort these steps.
    if (!isUint8Array(chunk)) {
      throw new TypeError('Received non-Uint8Array chunk')
    }

    // 2. Append the bytes represented by chunk to bytes.
    bytes.push(chunk)
    byteLength += chunk.length

    // 3. Read-loop given reader, bytes, successSteps, and failureSteps.
  }
}

/**
 * @see https://fetch.spec.whatwg.org/#is-local
 * @param {URL} url
 */
function urlIsLocal (url) {
  assert('protocol' in url) // ensure it's a url object

  const protocol = url.protocol

  return protocol === 'about:' || protocol === 'blob:' || protocol === 'data:'
}

/**
 * @param {string|URL} url
 * @returns {boolean}
 */
function urlHasHttpsScheme (url) {
  return (
    (
      typeof url === 'string' &&
      url[5] === ':' &&
      url[0] === 'h' &&
      url[1] === 't' &&
      url[2] === 't' &&
      url[3] === 'p' &&
      url[4] === 's'
    ) ||
    url.protocol === 'https:'
  )
}

/**
 * @see https://fetch.spec.whatwg.org/#http-scheme
 * @param {URL} url
 */
function urlIsHttpHttpsScheme (url) {
  assert('protocol' in url) // ensure it's a url object

  const protocol = url.protocol

  return protocol === 'http:' || protocol === 'https:'
}

/**
 * @see https://fetch.spec.whatwg.org/#simple-range-header-value
 * @param {string} value
 * @param {boolean} allowWhitespace
 */
function simpleRangeHeaderValue (value, allowWhitespace) {
  // 1. Let data be the isomorphic decoding of value.
  // Note: isomorphic decoding takes a sequence of bytes (ie. a Uint8Array) and turns it into a string,
  // nothing more. We obviously don't need to do that if value is a string already.
  const data = value

  // 2. If data does not start with "bytes", then return failure.
  if (!data.startsWith('bytes')) {
    return 'failure'
  }

  // 3. Let position be a position variable for data, initially pointing at the 5th code point of data.
  const position = { position: 5 }

  // 4. If allowWhitespace is true, collect a sequence of code points that are HTTP tab or space,
  //    from data given position.
  if (allowWhitespace) {
    collectASequenceOfCodePoints(
      (char) => char === '\t' || char === ' ',
      data,
      position
    )
  }

  // 5. If the code point at position within data is not U+003D (=), then return failure.
  if (data.charCodeAt(position.position) !== 0x3D) {
    return 'failure'
  }

  // 6. Advance position by 1.
  position.position++

  // 7. If allowWhitespace is true, collect a sequence of code points that are HTTP tab or space, from
  //    data given position.
  if (allowWhitespace) {
    collectASequenceOfCodePoints(
      (char) => char === '\t' || char === ' ',
      data,
      position
    )
  }

  // 8. Let rangeStart be the result of collecting a sequence of code points that are ASCII digits,
  //    from data given position.
  const rangeStart = collectASequenceOfCodePoints(
    (char) => {
      const code = char.charCodeAt(0)

      return code >= 0x30 && code <= 0x39
    },
    data,
    position
  )

  // 9. Let rangeStartValue be rangeStart, interpreted as decimal number, if rangeStart is not the
  //    empty string; otherwise null.
  const rangeStartValue = rangeStart.length ? Number(rangeStart) : null

  // 10. If allowWhitespace is true, collect a sequence of code points that are HTTP tab or space,
  //     from data given position.
  if (allowWhitespace) {
    collectASequenceOfCodePoints(
      (char) => char === '\t' || char === ' ',
      data,
      position
    )
  }

  // 11. If the code point at position within data is not U+002D (-), then return failure.
  if (data.charCodeAt(position.position) !== 0x2D) {
    return 'failure'
  }

  // 12. Advance position by 1.
  position.position++

  // 13. If allowWhitespace is true, collect a sequence of code points that are HTTP tab
  //     or space, from data given position.
  // Note from Khafra: its the same step as in #8 again lol
  if (allowWhitespace) {
    collectASequenceOfCodePoints(
      (char) => char === '\t' || char === ' ',
      data,
      position
    )
  }

  // 14. Let rangeEnd be the result of collecting a sequence of code points that are
  //     ASCII digits, from data given position.
  // Note from Khafra: you wouldn't guess it, but this is also the same step as #8
  const rangeEnd = collectASequenceOfCodePoints(
    (char) => {
      const code = char.charCodeAt(0)

      return code >= 0x30 && code <= 0x39
    },
    data,
    position
  )

  // 15. Let rangeEndValue be rangeEnd, interpreted as decimal number, if rangeEnd
  //     is not the empty string; otherwise null.
  // Note from Khafra: THE SAME STEP, AGAIN!!!
  // Note: why interpret as a decimal if we only collect ascii digits?
  const rangeEndValue = rangeEnd.length ? Number(rangeEnd) : null

  // 16. If position is not past the end of data, then return failure.
  if (position.position < data.length) {
    return 'failure'
  }

  // 17. If rangeEndValue and rangeStartValue are null, then return failure.
  if (rangeEndValue === null && rangeStartValue === null) {
    return 'failure'
  }

  // 18. If rangeStartValue and rangeEndValue are numbers, and rangeStartValue is
  //     greater than rangeEndValue, then return failure.
  // Note: ... when can they not be numbers?
  if (rangeStartValue > rangeEndValue) {
    return 'failure'
  }

  // 19. Return (rangeStartValue, rangeEndValue).
  return { rangeStartValue, rangeEndValue }
}

/**
 * @see https://fetch.spec.whatwg.org/#build-a-content-range
 * @param {number} rangeStart
 * @param {number} rangeEnd
 * @param {number} fullLength
 */
function buildContentRange (rangeStart, rangeEnd, fullLength) {
  // 1. Let contentRange be `bytes `.
  let contentRange = 'bytes '

  // 2. Append rangeStart, serialized and isomorphic encoded, to contentRange.
  contentRange += isomorphicEncode(`${rangeStart}`)

  // 3. Append 0x2D (-) to contentRange.
  contentRange += '-'

  // 4. Append rangeEnd, serialized and isomorphic encoded to contentRange.
  contentRange += isomorphicEncode(`${rangeEnd}`)

  // 5. Append 0x2F (/) to contentRange.
  contentRange += '/'

  // 6. Append fullLength, serialized and isomorphic encoded to contentRange.
  contentRange += isomorphicEncode(`${fullLength}`)

  // 7. Return contentRange.
  return contentRange
}

// A Stream, which pipes the response to zlib.createInflate() or
// zlib.createInflateRaw() depending on the first byte of the Buffer.
// If the lower byte of the first byte is 0x08, then the stream is
// interpreted as a zlib stream, otherwise it's interpreted as a
// raw deflate stream.
class InflateStream extends Transform {
  #zlibOptions

  /** @param {zlib.ZlibOptions} [zlibOptions] */
  constructor (zlibOptions) {
    super()
    this.#zlibOptions = zlibOptions
  }

  _transform (chunk, encoding, callback) {
    if (!this._inflateStream) {
      if (chunk.length === 0) {
        callback()
        return
      }
      this._inflateStream = (chunk[0] & 0x0F) === 0x08
        ? zlib.createInflate(this.#zlibOptions)
        : zlib.createInflateRaw(this.#zlibOptions)

      this._inflateStream.on('data', this.push.bind(this))
      this._inflateStream.on('end', () => this.push(null))
      this._inflateStream.on('error', (err) => this.destroy(err))
    }

    this._inflateStream.write(chunk, encoding, callback)
  }

  _final (callback) {
    if (this._inflateStream) {
      this._inflateStream.end()
      this._inflateStream = null
    }
    callback()
  }
}

/**
 * @param {zlib.ZlibOptions} [zlibOptions]
 * @returns {InflateStream}
 */
function createInflate (zlibOptions) {
  return new InflateStream(zlibOptions)
}

/**
 * @see https://fetch.spec.whatwg.org/#concept-header-extract-mime-type
 * @param {import('./headers').HeadersList} headers
 */
function extractMimeType (headers) {
  // 1. Let charset be null.
  let charset = null

  // 2. Let essence be null.
  let essence = null

  // 3. Let mimeType be null.
  let mimeType = null

  // 4. Let values be the result of getting, decoding, and splitting `Content-Type` from headers.
  const values = getDecodeSplit('content-type', headers)

  // 5. If values is null, then return failure.
  if (values === null) {
    return 'failure'
  }

  // 6. For each value of values:
  for (const value of values) {
    // 6.1. Let temporaryMimeType be the result of parsing value.
    const temporaryMimeType = parseMIMEType(value)

    // 6.2. If temporaryMimeType is failure or its essence is "*/*", then continue.
    if (temporaryMimeType === 'failure' || temporaryMimeType.essence === '*/*') {
      continue
    }

    // 6.3. Set mimeType to temporaryMimeType.
    mimeType = temporaryMimeType

    // 6.4. If mimeType’s essence is not essence, then:
    if (mimeType.essence !== essence) {
      // 6.4.1. Set charset to null.
      charset = null

      // 6.4.2. If mimeType’s parameters["charset"] exists, then set charset to
      //        mimeType’s parameters["charset"].
      if (mimeType.parameters.has('charset')) {
        charset = mimeType.parameters.get('charset')
      }

      // 6.4.3. Set essence to mimeType’s essence.
      essence = mimeType.essence
    } else if (!mimeType.parameters.has('charset') && charset !== null) {
      // 6.5. Otherwise, if mimeType’s parameters["charset"] does not exist, and
      //      charset is non-null, set mimeType’s parameters["charset"] to charset.
      mimeType.parameters.set('charset', charset)
    }
  }

  // 7. If mimeType is null, then return failure.
  if (mimeType == null) {
    return 'failure'
  }

  // 8. Return mimeType.
  return mimeType
}

/**
 * @see https://fetch.spec.whatwg.org/#header-value-get-decode-and-split
 * @param {string|null} value
 */
function gettingDecodingSplitting (value) {
  // 1. Let input be the result of isomorphic decoding value.
  const input = value

  // 2. Let position be a position variable for input, initially pointing at the start of input.
  const position = { position: 0 }

  // 3. Let values be a list of strings, initially empty.
  const values = []

  // 4. Let temporaryValue be the empty string.
  let temporaryValue = ''

  // 5. While position is not past the end of input:
  while (position.position < input.length) {
    // 5.1. Append the result of collecting a sequence of code points that are not U+0022 (")
    //      or U+002C (,) from input, given position, to temporaryValue.
    temporaryValue += collectASequenceOfCodePoints(
      (char) => char !== '"' && char !== ',',
      input,
      position
    )

    // 5.2. If position is not past the end of input, then:
    if (position.position < input.length) {
      // 5.2.1. If the code point at position within input is U+0022 ("), then:
      if (input.charCodeAt(position.position) === 0x22) {
        // 5.2.1.1. Append the result of collecting an HTTP quoted string from input, given position, to temporaryValue.
        temporaryValue += collectAnHTTPQuotedString(
          input,
          position
        )

        // 5.2.1.2. If position is not past the end of input, then continue.
        if (position.position < input.length) {
          continue
        }
      } else {
        // 5.2.2. Otherwise:

        // 5.2.2.1. Assert: the code point at position within input is U+002C (,).
        assert(input.charCodeAt(position.position) === 0x2C)

        // 5.2.2.2. Advance position by 1.
        position.position++
      }
    }

    // 5.3. Remove all HTTP tab or space from the start and end of temporaryValue.
    temporaryValue = removeChars(temporaryValue, true, true, (char) => char === 0x9 || char === 0x20)

    // 5.4. Append temporaryValue to values.
    values.push(temporaryValue)

    // 5.6. Set temporaryValue to the empty string.
    temporaryValue = ''
  }

  // 6. Return values.
  return values
}

/**
 * @see https://fetch.spec.whatwg.org/#concept-header-list-get-decode-split
 * @param {string} name lowercase header name
 * @param {import('./headers').HeadersList} list
 */
function getDecodeSplit (name, list) {
  // 1. Let value be the result of getting name from list.
  const value = list.get(name, true)

  // 2. If value is null, then return null.
  if (value === null) {
    return null
  }

  // 3. Return the result of getting, decoding, and splitting value.
  return gettingDecodingSplitting(value)
}

const textDecoder = new TextDecoder()

/**
 * @see https://encoding.spec.whatwg.org/#utf-8-decode
 * @param {Buffer} buffer
 */
function utf8DecodeBytes (buffer) {
  if (buffer.length === 0) {
    return ''
  }

  // 1. Let buffer be the result of peeking three bytes from
  //    ioQueue, converted to a byte sequence.

  // 2. If buffer is 0xEF 0xBB 0xBF, then read three
  //    bytes from ioQueue. (Do nothing with those bytes.)
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    buffer = buffer.subarray(3)
  }

  // 3. Process a queue with an instance of UTF-8’s
  //    decoder, ioQueue, output, and "replacement".
  const output = textDecoder.decode(buffer)

  // 4. Return output.
  return output
}

class EnvironmentSettingsObjectBase {
  get baseUrl () {
    return getGlobalOrigin()
  }

  get origin () {
    return this.baseUrl?.origin
  }

  policyContainer = makePolicyContainer()
}

class EnvironmentSettingsObject {
  settingsObject = new EnvironmentSettingsObjectBase()
}

const environmentSettingsObject = new EnvironmentSettingsObject()

module.exports = {
  isAborted,
  isCancelled,
  isValidEncodedURL,
  createDeferredPromise,
  ReadableStreamFrom,
  tryUpgradeRequestToAPotentiallyTrustworthyURL,
  clampAndCoarsenConnectionTimingInfo,
  coarsenedSharedCurrentTime,
  determineRequestsReferrer,
  makePolicyContainer,
  clonePolicyContainer,
  appendFetchMetadata,
  appendRequestOriginHeader,
  TAOCheck,
  corsCheck,
  crossOriginResourcePolicyCheck,
  createOpaqueTimingInfo,
  setRequestReferrerPolicyOnRedirect,
  isValidHTTPToken,
  requestBadPort,
  requestCurrentURL,
  responseURL,
  responseLocationURL,
  isBlobLike,
  isURLPotentiallyTrustworthy,
  isValidReasonPhrase,
  sameOrigin,
  normalizeMethod,
  serializeJavascriptValueToJSONString,
  iteratorMixin,
  createIterator,
  isValidHeaderName,
  isValidHeaderValue,
  isErrorLike,
  fullyReadBody,
  bytesMatch,
  isReadableStreamLike,
  readableStreamClose,
  isomorphicEncode,
  urlIsLocal,
  urlHasHttpsScheme,
  urlIsHttpHttpsScheme,
  readAllBytes,
  simpleRangeHeaderValue,
  buildContentRange,
  parseMetadata,
  createInflate,
  extractMimeType,
  getDecodeSplit,
  utf8DecodeBytes,
  environmentSettingsObject
}
