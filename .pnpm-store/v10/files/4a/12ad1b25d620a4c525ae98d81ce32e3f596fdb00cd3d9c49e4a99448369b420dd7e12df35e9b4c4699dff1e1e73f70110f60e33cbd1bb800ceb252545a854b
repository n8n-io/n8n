'use strict'

const { Headers, HeadersList, fill, getHeadersGuard, setHeadersGuard, setHeadersList } = require('./headers')
const { extractBody, cloneBody, mixinBody, hasFinalizationRegistry, streamRegistry, bodyUnusable } = require('./body')
const util = require('../../core/util')
const nodeUtil = require('node:util')
const { kEnumerableProperty } = util
const {
  isValidReasonPhrase,
  isCancelled,
  isAborted,
  isBlobLike,
  serializeJavascriptValueToJSONString,
  isErrorLike,
  isomorphicEncode,
  environmentSettingsObject: relevantRealm
} = require('./util')
const {
  redirectStatusSet,
  nullBodyStatus
} = require('./constants')
const { kState, kHeaders } = require('./symbols')
const { webidl } = require('./webidl')
const { FormData } = require('./formdata')
const { URLSerializer } = require('./data-url')
const { kConstruct } = require('../../core/symbols')
const assert = require('node:assert')
const { types } = require('node:util')

const textEncoder = new TextEncoder('utf-8')

// https://fetch.spec.whatwg.org/#response-class
class Response {
  // Creates network error Response.
  static error () {
    // The static error() method steps are to return the result of creating a
    // Response object, given a new network error, "immutable", and this’s
    // relevant Realm.
    const responseObject = fromInnerResponse(makeNetworkError(), 'immutable')

    return responseObject
  }

  // https://fetch.spec.whatwg.org/#dom-response-json
  static json (data, init = {}) {
    webidl.argumentLengthCheck(arguments, 1, 'Response.json')

    if (init !== null) {
      init = webidl.converters.ResponseInit(init)
    }

    // 1. Let bytes the result of running serialize a JavaScript value to JSON bytes on data.
    const bytes = textEncoder.encode(
      serializeJavascriptValueToJSONString(data)
    )

    // 2. Let body be the result of extracting bytes.
    const body = extractBody(bytes)

    // 3. Let responseObject be the result of creating a Response object, given a new response,
    //    "response", and this’s relevant Realm.
    const responseObject = fromInnerResponse(makeResponse({}), 'response')

    // 4. Perform initialize a response given responseObject, init, and (body, "application/json").
    initializeResponse(responseObject, init, { body: body[0], type: 'application/json' })

    // 5. Return responseObject.
    return responseObject
  }

  // Creates a redirect Response that redirects to url with status status.
  static redirect (url, status = 302) {
    webidl.argumentLengthCheck(arguments, 1, 'Response.redirect')

    url = webidl.converters.USVString(url)
    status = webidl.converters['unsigned short'](status)

    // 1. Let parsedURL be the result of parsing url with current settings
    // object’s API base URL.
    // 2. If parsedURL is failure, then throw a TypeError.
    // TODO: base-URL?
    let parsedURL
    try {
      parsedURL = new URL(url, relevantRealm.settingsObject.baseUrl)
    } catch (err) {
      throw new TypeError(`Failed to parse URL from ${url}`, { cause: err })
    }

    // 3. If status is not a redirect status, then throw a RangeError.
    if (!redirectStatusSet.has(status)) {
      throw new RangeError(`Invalid status code ${status}`)
    }

    // 4. Let responseObject be the result of creating a Response object,
    // given a new response, "immutable", and this’s relevant Realm.
    const responseObject = fromInnerResponse(makeResponse({}), 'immutable')

    // 5. Set responseObject’s response’s status to status.
    responseObject[kState].status = status

    // 6. Let value be parsedURL, serialized and isomorphic encoded.
    const value = isomorphicEncode(URLSerializer(parsedURL))

    // 7. Append `Location`/value to responseObject’s response’s header list.
    responseObject[kState].headersList.append('location', value, true)

    // 8. Return responseObject.
    return responseObject
  }

  // https://fetch.spec.whatwg.org/#dom-response
  constructor (body = null, init = {}) {
    webidl.util.markAsUncloneable(this)
    if (body === kConstruct) {
      return
    }

    if (body !== null) {
      body = webidl.converters.BodyInit(body)
    }

    init = webidl.converters.ResponseInit(init)

    // 1. Set this’s response to a new response.
    this[kState] = makeResponse({})

    // 2. Set this’s headers to a new Headers object with this’s relevant
    // Realm, whose header list is this’s response’s header list and guard
    // is "response".
    this[kHeaders] = new Headers(kConstruct)
    setHeadersGuard(this[kHeaders], 'response')
    setHeadersList(this[kHeaders], this[kState].headersList)

    // 3. Let bodyWithType be null.
    let bodyWithType = null

    // 4. If body is non-null, then set bodyWithType to the result of extracting body.
    if (body != null) {
      const [extractedBody, type] = extractBody(body)
      bodyWithType = { body: extractedBody, type }
    }

    // 5. Perform initialize a response given this, init, and bodyWithType.
    initializeResponse(this, init, bodyWithType)
  }

  // Returns response’s type, e.g., "cors".
  get type () {
    webidl.brandCheck(this, Response)

    // The type getter steps are to return this’s response’s type.
    return this[kState].type
  }

  // Returns response’s URL, if it has one; otherwise the empty string.
  get url () {
    webidl.brandCheck(this, Response)

    const urlList = this[kState].urlList

    // The url getter steps are to return the empty string if this’s
    // response’s URL is null; otherwise this’s response’s URL,
    // serialized with exclude fragment set to true.
    const url = urlList[urlList.length - 1] ?? null

    if (url === null) {
      return ''
    }

    return URLSerializer(url, true)
  }

  // Returns whether response was obtained through a redirect.
  get redirected () {
    webidl.brandCheck(this, Response)

    // The redirected getter steps are to return true if this’s response’s URL
    // list has more than one item; otherwise false.
    return this[kState].urlList.length > 1
  }

  // Returns response’s status.
  get status () {
    webidl.brandCheck(this, Response)

    // The status getter steps are to return this’s response’s status.
    return this[kState].status
  }

  // Returns whether response’s status is an ok status.
  get ok () {
    webidl.brandCheck(this, Response)

    // The ok getter steps are to return true if this’s response’s status is an
    // ok status; otherwise false.
    return this[kState].status >= 200 && this[kState].status <= 299
  }

  // Returns response’s status message.
  get statusText () {
    webidl.brandCheck(this, Response)

    // The statusText getter steps are to return this’s response’s status
    // message.
    return this[kState].statusText
  }

  // Returns response’s headers as Headers.
  get headers () {
    webidl.brandCheck(this, Response)

    // The headers getter steps are to return this’s headers.
    return this[kHeaders]
  }

  get body () {
    webidl.brandCheck(this, Response)

    return this[kState].body ? this[kState].body.stream : null
  }

  get bodyUsed () {
    webidl.brandCheck(this, Response)

    return !!this[kState].body && util.isDisturbed(this[kState].body.stream)
  }

  // Returns a clone of response.
  clone () {
    webidl.brandCheck(this, Response)

    // 1. If this is unusable, then throw a TypeError.
    if (bodyUnusable(this)) {
      throw webidl.errors.exception({
        header: 'Response.clone',
        message: 'Body has already been consumed.'
      })
    }

    // 2. Let clonedResponse be the result of cloning this’s response.
    const clonedResponse = cloneResponse(this[kState])

    // Note: To re-register because of a new stream.
    if (hasFinalizationRegistry && this[kState].body?.stream) {
      streamRegistry.register(this, new WeakRef(this[kState].body.stream))
    }

    // 3. Return the result of creating a Response object, given
    // clonedResponse, this’s headers’s guard, and this’s relevant Realm.
    return fromInnerResponse(clonedResponse, getHeadersGuard(this[kHeaders]))
  }

  [nodeUtil.inspect.custom] (depth, options) {
    if (options.depth === null) {
      options.depth = 2
    }

    options.colors ??= true

    const properties = {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      body: this.body,
      bodyUsed: this.bodyUsed,
      ok: this.ok,
      redirected: this.redirected,
      type: this.type,
      url: this.url
    }

    return `Response ${nodeUtil.formatWithOptions(options, properties)}`
  }
}

mixinBody(Response)

Object.defineProperties(Response.prototype, {
  type: kEnumerableProperty,
  url: kEnumerableProperty,
  status: kEnumerableProperty,
  ok: kEnumerableProperty,
  redirected: kEnumerableProperty,
  statusText: kEnumerableProperty,
  headers: kEnumerableProperty,
  clone: kEnumerableProperty,
  body: kEnumerableProperty,
  bodyUsed: kEnumerableProperty,
  [Symbol.toStringTag]: {
    value: 'Response',
    configurable: true
  }
})

Object.defineProperties(Response, {
  json: kEnumerableProperty,
  redirect: kEnumerableProperty,
  error: kEnumerableProperty
})

// https://fetch.spec.whatwg.org/#concept-response-clone
function cloneResponse (response) {
  // To clone a response response, run these steps:

  // 1. If response is a filtered response, then return a new identical
  // filtered response whose internal response is a clone of response’s
  // internal response.
  if (response.internalResponse) {
    return filterResponse(
      cloneResponse(response.internalResponse),
      response.type
    )
  }

  // 2. Let newResponse be a copy of response, except for its body.
  const newResponse = makeResponse({ ...response, body: null })

  // 3. If response’s body is non-null, then set newResponse’s body to the
  // result of cloning response’s body.
  if (response.body != null) {
    newResponse.body = cloneBody(newResponse, response.body)
  }

  // 4. Return newResponse.
  return newResponse
}

function makeResponse (init) {
  return {
    aborted: false,
    rangeRequested: false,
    timingAllowPassed: false,
    requestIncludesCredentials: false,
    type: 'default',
    status: 200,
    timingInfo: null,
    cacheState: '',
    statusText: '',
    ...init,
    headersList: init?.headersList
      ? new HeadersList(init?.headersList)
      : new HeadersList(),
    urlList: init?.urlList ? [...init.urlList] : []
  }
}

function makeNetworkError (reason) {
  const isError = isErrorLike(reason)
  return makeResponse({
    type: 'error',
    status: 0,
    error: isError
      ? reason
      : new Error(reason ? String(reason) : reason),
    aborted: reason && reason.name === 'AbortError'
  })
}

// @see https://fetch.spec.whatwg.org/#concept-network-error
function isNetworkError (response) {
  return (
    // A network error is a response whose type is "error",
    response.type === 'error' &&
    // status is 0
    response.status === 0
  )
}

function makeFilteredResponse (response, state) {
  state = {
    internalResponse: response,
    ...state
  }

  return new Proxy(response, {
    get (target, p) {
      return p in state ? state[p] : target[p]
    },
    set (target, p, value) {
      assert(!(p in state))
      target[p] = value
      return true
    }
  })
}

// https://fetch.spec.whatwg.org/#concept-filtered-response
function filterResponse (response, type) {
  // Set response to the following filtered response with response as its
  // internal response, depending on request’s response tainting:
  if (type === 'basic') {
    // A basic filtered response is a filtered response whose type is "basic"
    // and header list excludes any headers in internal response’s header list
    // whose name is a forbidden response-header name.

    // Note: undici does not implement forbidden response-header names
    return makeFilteredResponse(response, {
      type: 'basic',
      headersList: response.headersList
    })
  } else if (type === 'cors') {
    // A CORS filtered response is a filtered response whose type is "cors"
    // and header list excludes any headers in internal response’s header
    // list whose name is not a CORS-safelisted response-header name, given
    // internal response’s CORS-exposed header-name list.

    // Note: undici does not implement CORS-safelisted response-header names
    return makeFilteredResponse(response, {
      type: 'cors',
      headersList: response.headersList
    })
  } else if (type === 'opaque') {
    // An opaque filtered response is a filtered response whose type is
    // "opaque", URL list is the empty list, status is 0, status message
    // is the empty byte sequence, header list is empty, and body is null.

    return makeFilteredResponse(response, {
      type: 'opaque',
      urlList: Object.freeze([]),
      status: 0,
      statusText: '',
      body: null
    })
  } else if (type === 'opaqueredirect') {
    // An opaque-redirect filtered response is a filtered response whose type
    // is "opaqueredirect", status is 0, status message is the empty byte
    // sequence, header list is empty, and body is null.

    return makeFilteredResponse(response, {
      type: 'opaqueredirect',
      status: 0,
      statusText: '',
      headersList: [],
      body: null
    })
  } else {
    assert(false)
  }
}

// https://fetch.spec.whatwg.org/#appropriate-network-error
function makeAppropriateNetworkError (fetchParams, err = null) {
  // 1. Assert: fetchParams is canceled.
  assert(isCancelled(fetchParams))

  // 2. Return an aborted network error if fetchParams is aborted;
  // otherwise return a network error.
  return isAborted(fetchParams)
    ? makeNetworkError(Object.assign(new DOMException('The operation was aborted.', 'AbortError'), { cause: err }))
    : makeNetworkError(Object.assign(new DOMException('Request was cancelled.'), { cause: err }))
}

// https://whatpr.org/fetch/1392.html#initialize-a-response
function initializeResponse (response, init, body) {
  // 1. If init["status"] is not in the range 200 to 599, inclusive, then
  //    throw a RangeError.
  if (init.status !== null && (init.status < 200 || init.status > 599)) {
    throw new RangeError('init["status"] must be in the range of 200 to 599, inclusive.')
  }

  // 2. If init["statusText"] does not match the reason-phrase token production,
  //    then throw a TypeError.
  if ('statusText' in init && init.statusText != null) {
    // See, https://datatracker.ietf.org/doc/html/rfc7230#section-3.1.2:
    //   reason-phrase  = *( HTAB / SP / VCHAR / obs-text )
    if (!isValidReasonPhrase(String(init.statusText))) {
      throw new TypeError('Invalid statusText')
    }
  }

  // 3. Set response’s response’s status to init["status"].
  if ('status' in init && init.status != null) {
    response[kState].status = init.status
  }

  // 4. Set response’s response’s status message to init["statusText"].
  if ('statusText' in init && init.statusText != null) {
    response[kState].statusText = init.statusText
  }

  // 5. If init["headers"] exists, then fill response’s headers with init["headers"].
  if ('headers' in init && init.headers != null) {
    fill(response[kHeaders], init.headers)
  }

  // 6. If body was given, then:
  if (body) {
    // 1. If response's status is a null body status, then throw a TypeError.
    if (nullBodyStatus.includes(response.status)) {
      throw webidl.errors.exception({
        header: 'Response constructor',
        message: `Invalid response status code ${response.status}`
      })
    }

    // 2. Set response's body to body's body.
    response[kState].body = body.body

    // 3. If body's type is non-null and response's header list does not contain
    //    `Content-Type`, then append (`Content-Type`, body's type) to response's header list.
    if (body.type != null && !response[kState].headersList.contains('content-type', true)) {
      response[kState].headersList.append('content-type', body.type, true)
    }
  }
}

/**
 * @see https://fetch.spec.whatwg.org/#response-create
 * @param {any} innerResponse
 * @param {'request' | 'immutable' | 'request-no-cors' | 'response' | 'none'} guard
 * @returns {Response}
 */
function fromInnerResponse (innerResponse, guard) {
  const response = new Response(kConstruct)
  response[kState] = innerResponse
  response[kHeaders] = new Headers(kConstruct)
  setHeadersList(response[kHeaders], innerResponse.headersList)
  setHeadersGuard(response[kHeaders], guard)

  if (hasFinalizationRegistry && innerResponse.body?.stream) {
    // If the target (response) is reclaimed, the cleanup callback may be called at some point with
    // the held value provided for it (innerResponse.body.stream). The held value can be any value:
    // a primitive or an object, even undefined. If the held value is an object, the registry keeps
    // a strong reference to it (so it can pass it to the cleanup callback later). Reworded from
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
    streamRegistry.register(response, new WeakRef(innerResponse.body.stream))
  }

  return response
}

webidl.converters.ReadableStream = webidl.interfaceConverter(
  ReadableStream
)

webidl.converters.FormData = webidl.interfaceConverter(
  FormData
)

webidl.converters.URLSearchParams = webidl.interfaceConverter(
  URLSearchParams
)

// https://fetch.spec.whatwg.org/#typedefdef-xmlhttprequestbodyinit
webidl.converters.XMLHttpRequestBodyInit = function (V, prefix, name) {
  if (typeof V === 'string') {
    return webidl.converters.USVString(V, prefix, name)
  }

  if (isBlobLike(V)) {
    return webidl.converters.Blob(V, prefix, name, { strict: false })
  }

  if (ArrayBuffer.isView(V) || types.isArrayBuffer(V)) {
    return webidl.converters.BufferSource(V, prefix, name)
  }

  if (util.isFormDataLike(V)) {
    return webidl.converters.FormData(V, prefix, name, { strict: false })
  }

  if (V instanceof URLSearchParams) {
    return webidl.converters.URLSearchParams(V, prefix, name)
  }

  return webidl.converters.DOMString(V, prefix, name)
}

// https://fetch.spec.whatwg.org/#bodyinit
webidl.converters.BodyInit = function (V, prefix, argument) {
  if (V instanceof ReadableStream) {
    return webidl.converters.ReadableStream(V, prefix, argument)
  }

  // Note: the spec doesn't include async iterables,
  // this is an undici extension.
  if (V?.[Symbol.asyncIterator]) {
    return V
  }

  return webidl.converters.XMLHttpRequestBodyInit(V, prefix, argument)
}

webidl.converters.ResponseInit = webidl.dictionaryConverter([
  {
    key: 'status',
    converter: webidl.converters['unsigned short'],
    defaultValue: () => 200
  },
  {
    key: 'statusText',
    converter: webidl.converters.ByteString,
    defaultValue: () => ''
  },
  {
    key: 'headers',
    converter: webidl.converters.HeadersInit
  }
])

module.exports = {
  isNetworkError,
  makeNetworkError,
  makeResponse,
  makeAppropriateNetworkError,
  filterResponse,
  Response,
  cloneResponse,
  fromInnerResponse
}
