// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

const { NavigationInfo } = require('./browsingContextTypes')

/**
 * Represents the possible values for the SameSite attribute of a cookie.
 * @enum {string}
 */

const SameSite = {
  STRICT: 'strict',
  LAX: 'lax',
  NONE: 'none',
  DEFAULT: 'default',

  findByName(name) {
    return (
      Object.values(this).find((type) => {
        return typeof type === 'string' && name.toLowerCase() === type.toLowerCase()
      }) || null
    )
  },
}

/**
 * Represents a BytesValue object.
 * Described in https://w3c.github.io/webdriver-bidi/#type-network-BytesValue.
 */
class BytesValue {
  static Type = {
    STRING: 'string',
    BASE64: 'base64',
  }

  /**
   * Creates a new BytesValue instance.
   * @param {string} type - The type of the BytesValue.
   * @param {string} value - The value of the BytesValue.
   */
  constructor(type, value) {
    this._type = type
    this._value = value
  }

  /**
   * Gets the type of the BytesValue.
   * @returns {string} The type of the BytesValue.
   */
  get type() {
    return this._type
  }

  /**
   * Gets the value of the BytesValue.
   * @returns {string} The value of the BytesValue.
   */
  get value() {
    return this._value
  }

  /**
   * Converts the BytesValue to a map.
   * @returns {Map<string, string>} A map representation of the BytesValue.
   */
  asMap() {
    const map = new Map()
    map.set('type', this._type)
    map.set('value', this._value)
    return map
  }
}

/**
 * Represents a header with a name and value.
 * Described in https://w3c.github.io/webdriver-bidi/#type-network-Header.
 */
class Header {
  /**
   * Creates a new Header instance.
   * @param {string} name - The name of the header.
   * @param {BytesValue} value - The value of the header.
   * @throws {Error} If the value is not an instance of BytesValue.
   */
  constructor(name, value) {
    this._name = name
    if (!(value instanceof BytesValue)) {
      throw new Error(`Value must be an instance of BytesValue. Received: '${value}'`)
    }
    this._value = value
  }

  /**
   * Gets the name of the header.
   * @returns {string} The name of the header.
   */
  get name() {
    return this._name
  }

  /**
   * Gets the value of the header.
   * @returns {BytesValue} The value of the header.
   */
  get value() {
    return this._value
  }
}

/**
 * Represents a cookie.
 * Described in https://w3c.github.io/webdriver-bidi/#type-network-Cookie.
 * @class
 */
class Cookie {
  constructor(name, value, domain, path, size, httpOnly, secure, sameSite, expires) {
    this._name = name
    this._value = value
    this._domain = domain
    this._path = path
    this._expires = expires
    this._size = size
    this._httpOnly = httpOnly
    this._secure = secure
    this._sameSite = sameSite
  }

  /**
   * Gets the name of the cookie.
   * @returns {string} The name of the cookie.
   */
  get name() {
    return this._name
  }

  /**
   * Gets the value of the cookie.
   * @returns {BytesValue} The value of the cookie.
   */
  get value() {
    return this._value
  }

  /**
   * Gets the domain of the cookie.
   * @returns {string} The domain of the cookie.
   */
  get domain() {
    return this._domain
  }

  /**
   * Gets the path of the cookie.
   * @returns {string} The path of the cookie.
   */
  get path() {
    return this._path
  }

  /**
   * Gets the expiration date of the cookie.
   * @returns {number} The expiration date of the cookie.
   */
  get expires() {
    return this._expires
  }

  /**
   * Gets the size of the cookie.
   * @returns {number} The size of the cookie.
   */
  get size() {
    return this._size
  }

  /**
   * Checks if the cookie is HTTP-only.
   * @returns {boolean} True if the cookie is HTTP-only, false otherwise.
   */
  get httpOnly() {
    return this._httpOnly
  }

  /**
   * Checks if the cookie is secure.
   * @returns {boolean} True if the cookie is secure, false otherwise.
   */
  get secure() {
    return this._secure
  }

  /**
   * Gets the same-site attribute of the cookie.
   * @returns {string} The same-site attribute of the cookie.
   */
  get sameSite() {
    return this._sameSite
  }
}

// No tests written for FetchTimingInfo. Must be updated after browsers implement it and corresponding WPT test are written.
/**
 * Represents the time of each part of the request.
 * Described in https://w3c.github.io/webdriver-bidi/#type-network-FetchTimingInfo.
 * @class
 */
class FetchTimingInfo {
  constructor(
    originTime,
    requestTime,
    redirectStart,
    redirectEnd,
    fetchStart,
    dnsStart,
    dnsEnd,
    connectStart,
    connectEnd,
    tlsStart,
    requestStart,
    responseStart,
    responseEnd,
  ) {
    this._originTime = originTime
    this._requestTime = requestTime
    this._redirectStart = redirectStart
    this._redirectEnd = redirectEnd
    this._fetchStart = fetchStart
    this._dnsStart = dnsStart
    this._dnsEnd = dnsEnd
    this._connectStart = connectStart
    this._connectEnd = connectEnd
    this._tlsStart = tlsStart
    this._requestStart = requestStart
    this._responseStart = responseStart
    this._responseEnd = responseEnd
  }

  /**
   * Gets the origin time.
   *
   * @returns {number} The origin time.
   */
  get originTime() {
    return this._originTime
  }

  /**
   * Get the request time.
   *
   * @returns {number} The request time.
   */
  get requestTime() {
    return this._requestTime
  }

  /**
   * Gets the timestamp when the redirect started.
   *
   * @returns {number} The timestamp when the redirect started.
   */
  get redirectStart() {
    return this._redirectStart
  }

  /**
   * Gets the timestamp when the redirect ended.
   *
   * @returns {number} The timestamp when the redirect ended.
   */
  get redirectEnd() {
    return this._redirectEnd
  }

  /**
   * Gets the timestamp when the fetch started.
   *
   * @returns {number} The timestamp when the fetch started.
   */
  get fetchStart() {
    return this._fetchStart
  }

  /**
   * Gets the timestamp when the domain lookup started.
   *
   * @returns {number} The timestamp when the domain lookup started.
   */
  get dnsStart() {
    return this._dnsStart
  }

  /**
   * Gets the timestamp when the domain lookup ended.
   *
   * @returns {number} The timestamp when the domain lookup ended.
   */
  get dnsEnd() {
    return this._dnsEnd
  }

  /**
   * Gets the timestamp when the connection started.
   *
   * @returns {number} The timestamp when the connection ended.
   */
  get connectStart() {
    return this._connectStart
  }

  /**
   * Gets the timestamp when the connection ended.
   *
   * @returns {number} The timestamp when the connection ended.
   */
  get connectEnd() {
    return this._connectEnd
  }

  /**
   * Gets the timestamp when the secure connection started.
   *
   * @returns {number} The timestamp when the secure connection started.
   */
  get tlsStart() {
    return this._tlsStart
  }

  /**
   * Gets the timestamp when the request started.
   *
   * @returns {number} The timestamp when the request started.
   */
  get requestStart() {
    return this._requestStart
  }

  /**
   * Gets the timestamp when the response started.
   *
   * @returns {number} The timestamp when the response started.
   */
  get responseStart() {
    return this._responseStart
  }

  /**
   * Gets the timestamp when the response ended.
   *
   * @returns {number} The timestamp when the response ended.
   */
  get responseEnd() {
    return this._responseEnd
  }
}

/**
 * Represents the data of a network request.
 * Described in https://w3c.github.io/webdriver-bidi/#type-network-RequestData.
 */
class RequestData {
  constructor(request, url, method, headers, cookies, headersSize, bodySize, timings) {
    this._request = request
    this._url = url
    this._method = method
    this._headers = []
    headers.forEach((header) => {
      let name = header.name
      let value = 'value' in header ? header.value : null

      this._headers.push(new Header(name, new BytesValue(value.type, value.value)))
    })

    this._cookies = []
    cookies.forEach((cookie) => {
      let name = cookie.name
      let domain = cookie.domain
      let path = cookie.path
      let size = cookie.size
      let httpOnly = cookie.httpOnly
      let secure = cookie.secure
      let sameSite = cookie.sameSite
      let value = 'value' in cookie ? cookie.value : null
      let expires = 'expires' in cookie ? cookie.expires : null

      this._cookies.push(new Cookie(name, value, domain, path, size, httpOnly, secure, sameSite, expires))
    })
    this._headersSize = headersSize
    this._bodySize = bodySize
    this._timings = new FetchTimingInfo(
      timings.originTime,
      timings.requestTime,
      timings.redirectStart,
      timings.redirectEnd,
      timings.fetchStart,
      timings.dnsStart,
      timings.dnsEnd,
      timings.connectStart,
      timings.connectEnd,
      timings.tlsStart,
      timings.requestStart,
      timings.responseStart,
      timings.responseEnd,
    )
  }

  /**
   * Get the request id.
   * @returns {string} The request id.
   */
  get request() {
    return this._request
  }

  /**
   * Get the URL of the request.
   * @returns {string} The URL of the request.
   */
  get url() {
    return this._url
  }

  /**
   * Get the HTTP method of the request.
   * @returns {string} The HTTP method of the request.
   */
  get method() {
    return this._method
  }

  /**
   * Get the headers of the request.
   * @returns {Header[]} An array of header objects.
   */
  get headers() {
    return this._headers
  }

  /**
   * Get the cookies of the request.
   * @returns {Cookie[]} An array of cookie objects.
   */
  get cookies() {
    return this._cookies
  }

  /**
   * Get the size of the headers in bytes.
   * @returns {number} The size of the headers in bytes.
   */
  get headersSize() {
    return this._headersSize
  }

  /**
   * Get the size of the request body in bytes.
   * @returns {number} The size of the request body in bytes.
   */
  get bodySize() {
    return this._bodySize
  }

  /**
   * Get the timing information of the request.
   * @returns {FetchTimingInfo} The timing information of the request.
   */
  get timings() {
    return this._timings
  }
}

/**
 * Represents the base parameters for a network request.
 * Described in https://w3c.github.io/webdriver-bidi/#type-network-BaseParameters.
 */
class BaseParameters {
  constructor(id, navigation, redirectCount, request, timestamp) {
    this._id = id
    this._navigation =
      navigation != null
        ? new NavigationInfo(navigation.context, navigation.navigation, navigation.timestamp, navigation.url)
        : null
    this._redirectCount = redirectCount
    this._request = new RequestData(
      request.request,
      request.url,
      request.method,
      request.headers,
      request.cookies,
      request.headersSize,
      request.bodySize,
      request.timings,
    )
    this._timestamp = timestamp
  }

  /**
   * Gets the browsing context ID of the network request.
   * @returns {string|null} The browsing context ID of the network request.
   */
  get id() {
    return this._id
  }

  /**
   * Gets the navigation information associated with the network request.
   * @returns {NavigationInfo|null} The navigation information associated with the network request, or null if not available.
   */
  get navigation() {
    return this._navigation
  }

  /**
   * Gets the number of redirects that occurred during the network request.
   * @returns {number} The number of redirects that occurred during the network request.
   */
  get redirectCount() {
    return this._redirectCount
  }

  /**
   * Gets the request data for the network request.
   * @returns {RequestData} The request data for the network request.
   */
  get request() {
    return this._request
  }

  /**
   * Gets the timestamp of the network request.
   * @returns {number} The timestamp of the network request.
   */
  get timestamp() {
    return this._timestamp
  }
}

/**
 * Represents source in the network.
 * Described in https://w3c.github.io/webdriver-bidi/#type-network-Initiator.
 */
class Initiator {
  /**
   * Constructs a new Initiator instance.
   * @param {string} type - The type of the initiator.
   * @param {number} columnNumber - The column number.
   * @param {number} lineNumber - The line number.
   * @param {string} stackTrace - The stack trace.
   * @param {string} request - The request id.
   */
  constructor(type, columnNumber, lineNumber, stackTrace, request) {
    this._type = type
    this._columnNumber = columnNumber
    this._lineNumber = lineNumber
    this._stackTrace = stackTrace
    this._request = request
  }

  /**
   * Gets the type of the initiator.
   * @returns {string} The type of the initiator.
   */
  get type() {
    return this._type
  }

  /**
   * Gets the column number.
   * @returns {number} The column number.
   */
  get columnNumber() {
    return this._columnNumber
  }

  /**
   * Gets the line number.
   * @returns {number} The line number.
   */
  get lineNumber() {
    return this._lineNumber
  }

  /**
   * Gets the stack trace.
   * @returns {string} The stack trace.
   */
  get stackTrace() {
    return this._stackTrace
  }

  /**
   * Gets the request ID.
   * @returns {string} The request ID.
   */
  get request() {
    return this._request
  }
}

/**
 * Represents the BeforeRequestSent event parameters.
 * @class
 * @extends BaseParameters
 * Described in https://w3c.github.io/webdriver-bidi/#event-network-beforeSendRequest.
 */
class BeforeRequestSent extends BaseParameters {
  constructor(id, navigation, redirectCount, request, timestamp, initiator) {
    super(id, navigation, redirectCount, request, timestamp)
    this._initiator = new Initiator(
      initiator.type,
      initiator.columnNumber,
      initiator.lineNumber,
      initiator.stackTrace,
      initiator.request,
    )
  }

  /**
   * Get the initiator of the request.
   * @returns {Initiator} The initiator object.
   */
  get initiator() {
    return this._initiator
  }
}

/**
 * Represents the FetchError event parameters.
 * Described https://w3c.github.io/webdriver-bidi/#event-network-fetchError
 * @extends BaseParameters
 */
class FetchError extends BaseParameters {
  /**
   * Creates a new FetchError instance.
   * @param {string} id - The ID of the error.
   * @param {string} navigation - The navigation information.
   * @param {number} redirectCount - The number of redirects.
   * @param {RequestData} request - The request object.
   * @param {number} timestamp - The timestamp of the error.
   * @param {string} errorText - The error text.
   */
  constructor(id, navigation, redirectCount, request, timestamp, errorText) {
    super(id, navigation, redirectCount, request, timestamp)
    this._errorText = errorText
  }

  /**
   * Gets the error text.
   * @returns {string} The error text.
   */
  get errorText() {
    return this._errorText
  }
}

/**
 * Represents the response data received from a network request.
 * Described in https://w3c.github.io/webdriver-bidi/#type-network-ResponseData.
 * @class
 */
class ResponseData {
  constructor(
    url,
    protocol,
    status,
    statusText,
    fromCache,
    headers,
    mimeType,
    bytesReceived,
    headersSize,
    bodySize,
    content,
  ) {
    this._url = url
    this._protocol = protocol
    this._status = status
    this._statusText = statusText
    this._fromCache = fromCache
    this._headers = headers
    this._mimeType = mimeType
    this._bytesReceived = bytesReceived
    this._headersSize = headersSize
    this._bodySize = bodySize
    this._content = content
  }

  /**
   * Get the URL.
   *
   * @returns {string} The URL.
   */
  get url() {
    return this._url
  }

  /**
   * Get the protocol.
   *
   * @returns {string} The protocol.
   */
  get protocol() {
    return this._protocol
  }

  /**
   * Get the HTTP status.
   *
   * @returns {string} The HTTP status.
   */
  get status() {
    return this._status
  }

  /**
   * Gets the status text.
   *
   * @returns {string} The status text.
   */
  get statusText() {
    return this._statusText
  }

  /**
   * Gets the value indicating whether the data is retrieved from cache.
   *
   * @returns {boolean} The value indicating whether the data is retrieved from cache.
   */
  get fromCache() {
    return this._fromCache
  }

  /**
   * Get the headers.
   *
   * @returns {Object} The headers object.
   */
  get headers() {
    return this._headers
  }

  /**
   * The MIME type of the network resource.
   *
   * @type {string}
   */
  get mimeType() {
    return this._mimeType
  }

  /**
   * Gets the number of bytes received.
   *
   * @returns {number} The number of bytes received.
   */
  get bytesReceived() {
    return this._bytesReceived
  }

  /**
   * Get the size of the headers.
   *
   * @returns {number} The size of the headers.
   */
  get headerSize() {
    return this._headersSize
  }

  /**
   * Get the size of the body.
   *
   * @returns {number} The size of the body.
   */
  get bodySize() {
    return this._bodySize
  }

  /**
   * Gets the content.
   *
   * @returns {any} The content.
   */
  get content() {
    return this._content
  }
}

/**
 * Represents the ResponseStarted event parameters.
 * Described in https://w3c.github.io/webdriver-bidi/#event-network-responseStarted.
 * @class
 * @extends BaseParameters
 */
class ResponseStarted extends BaseParameters {
  constructor(id, navigation, redirectCount, request, timestamp, response) {
    super(id, navigation, redirectCount, request, timestamp)
    this._response = new ResponseData(
      response.url,
      response.protocol,
      response.status,
      response.statusText,
      response.fromCache,
      response.headers,
      response.mimeType,
      response.bytesReceived,
      response.headerSize,
      response.bodySize,
      response.content,
    )
  }

  /**
   * Get the response data.
   * @returns {ResponseData} The response data.
   */
  get response() {
    return this._response
  }
}

module.exports = { Header, BytesValue, Cookie, SameSite, BeforeRequestSent, ResponseStarted, FetchError }
