'use strict'

const kUndiciError = Symbol.for('undici.error.UND_ERR')
class UndiciError extends Error {
  constructor (message, options) {
    super(message, options)
    this.name = 'UndiciError'
    this.code = 'UND_ERR'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kUndiciError] === true
  }

  get [kUndiciError] () {
    return true
  }
}

const kConnectTimeoutError = Symbol.for('undici.error.UND_ERR_CONNECT_TIMEOUT')
class ConnectTimeoutError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'ConnectTimeoutError'
    this.message = message || 'Connect Timeout Error'
    this.code = 'UND_ERR_CONNECT_TIMEOUT'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kConnectTimeoutError] === true
  }

  get [kConnectTimeoutError] () {
    return true
  }
}

const kHeadersTimeoutError = Symbol.for('undici.error.UND_ERR_HEADERS_TIMEOUT')
class HeadersTimeoutError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'HeadersTimeoutError'
    this.message = message || 'Headers Timeout Error'
    this.code = 'UND_ERR_HEADERS_TIMEOUT'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kHeadersTimeoutError] === true
  }

  get [kHeadersTimeoutError] () {
    return true
  }
}

const kHeadersOverflowError = Symbol.for('undici.error.UND_ERR_HEADERS_OVERFLOW')
class HeadersOverflowError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'HeadersOverflowError'
    this.message = message || 'Headers Overflow Error'
    this.code = 'UND_ERR_HEADERS_OVERFLOW'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kHeadersOverflowError] === true
  }

  get [kHeadersOverflowError] () {
    return true
  }
}

const kBodyTimeoutError = Symbol.for('undici.error.UND_ERR_BODY_TIMEOUT')
class BodyTimeoutError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'BodyTimeoutError'
    this.message = message || 'Body Timeout Error'
    this.code = 'UND_ERR_BODY_TIMEOUT'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kBodyTimeoutError] === true
  }

  get [kBodyTimeoutError] () {
    return true
  }
}

const kInvalidArgumentError = Symbol.for('undici.error.UND_ERR_INVALID_ARG')
class InvalidArgumentError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'InvalidArgumentError'
    this.message = message || 'Invalid Argument Error'
    this.code = 'UND_ERR_INVALID_ARG'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kInvalidArgumentError] === true
  }

  get [kInvalidArgumentError] () {
    return true
  }
}

const kInvalidReturnValueError = Symbol.for('undici.error.UND_ERR_INVALID_RETURN_VALUE')
class InvalidReturnValueError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'InvalidReturnValueError'
    this.message = message || 'Invalid Return Value Error'
    this.code = 'UND_ERR_INVALID_RETURN_VALUE'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kInvalidReturnValueError] === true
  }

  get [kInvalidReturnValueError] () {
    return true
  }
}

const kAbortError = Symbol.for('undici.error.UND_ERR_ABORT')
class AbortError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'AbortError'
    this.message = message || 'The operation was aborted'
    this.code = 'UND_ERR_ABORT'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kAbortError] === true
  }

  get [kAbortError] () {
    return true
  }
}

const kRequestAbortedError = Symbol.for('undici.error.UND_ERR_ABORTED')
class RequestAbortedError extends AbortError {
  constructor (message) {
    super(message)
    this.name = 'AbortError'
    this.message = message || 'Request aborted'
    this.code = 'UND_ERR_ABORTED'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kRequestAbortedError] === true
  }

  get [kRequestAbortedError] () {
    return true
  }
}

const kInformationalError = Symbol.for('undici.error.UND_ERR_INFO')
class InformationalError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'InformationalError'
    this.message = message || 'Request information'
    this.code = 'UND_ERR_INFO'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kInformationalError] === true
  }

  get [kInformationalError] () {
    return true
  }
}

const kRequestContentLengthMismatchError = Symbol.for('undici.error.UND_ERR_REQ_CONTENT_LENGTH_MISMATCH')
class RequestContentLengthMismatchError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'RequestContentLengthMismatchError'
    this.message = message || 'Request body length does not match content-length header'
    this.code = 'UND_ERR_REQ_CONTENT_LENGTH_MISMATCH'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kRequestContentLengthMismatchError] === true
  }

  get [kRequestContentLengthMismatchError] () {
    return true
  }
}

const kResponseContentLengthMismatchError = Symbol.for('undici.error.UND_ERR_RES_CONTENT_LENGTH_MISMATCH')
class ResponseContentLengthMismatchError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'ResponseContentLengthMismatchError'
    this.message = message || 'Response body length does not match content-length header'
    this.code = 'UND_ERR_RES_CONTENT_LENGTH_MISMATCH'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kResponseContentLengthMismatchError] === true
  }

  get [kResponseContentLengthMismatchError] () {
    return true
  }
}

const kClientDestroyedError = Symbol.for('undici.error.UND_ERR_DESTROYED')
class ClientDestroyedError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'ClientDestroyedError'
    this.message = message || 'The client is destroyed'
    this.code = 'UND_ERR_DESTROYED'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kClientDestroyedError] === true
  }

  get [kClientDestroyedError] () {
    return true
  }
}

const kClientClosedError = Symbol.for('undici.error.UND_ERR_CLOSED')
class ClientClosedError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'ClientClosedError'
    this.message = message || 'The client is closed'
    this.code = 'UND_ERR_CLOSED'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kClientClosedError] === true
  }

  get [kClientClosedError] () {
    return true
  }
}

const kSocketError = Symbol.for('undici.error.UND_ERR_SOCKET')
class SocketError extends UndiciError {
  constructor (message, socket) {
    super(message)
    this.name = 'SocketError'
    this.message = message || 'Socket error'
    this.code = 'UND_ERR_SOCKET'
    this.socket = socket
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kSocketError] === true
  }

  get [kSocketError] () {
    return true
  }
}

const kNotSupportedError = Symbol.for('undici.error.UND_ERR_NOT_SUPPORTED')
class NotSupportedError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'NotSupportedError'
    this.message = message || 'Not supported error'
    this.code = 'UND_ERR_NOT_SUPPORTED'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kNotSupportedError] === true
  }

  get [kNotSupportedError] () {
    return true
  }
}

const kBalancedPoolMissingUpstreamError = Symbol.for('undici.error.UND_ERR_BPL_MISSING_UPSTREAM')
class BalancedPoolMissingUpstreamError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'MissingUpstreamError'
    this.message = message || 'No upstream has been added to the BalancedPool'
    this.code = 'UND_ERR_BPL_MISSING_UPSTREAM'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kBalancedPoolMissingUpstreamError] === true
  }

  get [kBalancedPoolMissingUpstreamError] () {
    return true
  }
}

const kHTTPParserError = Symbol.for('undici.error.UND_ERR_HTTP_PARSER')
class HTTPParserError extends Error {
  constructor (message, code, data) {
    super(message)
    this.name = 'HTTPParserError'
    this.code = code ? `HPE_${code}` : undefined
    this.data = data ? data.toString() : undefined
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kHTTPParserError] === true
  }

  get [kHTTPParserError] () {
    return true
  }
}

const kResponseExceededMaxSizeError = Symbol.for('undici.error.UND_ERR_RES_EXCEEDED_MAX_SIZE')
class ResponseExceededMaxSizeError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'ResponseExceededMaxSizeError'
    this.message = message || 'Response content exceeded max size'
    this.code = 'UND_ERR_RES_EXCEEDED_MAX_SIZE'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kResponseExceededMaxSizeError] === true
  }

  get [kResponseExceededMaxSizeError] () {
    return true
  }
}

const kRequestRetryError = Symbol.for('undici.error.UND_ERR_REQ_RETRY')
class RequestRetryError extends UndiciError {
  constructor (message, code, { headers, data }) {
    super(message)
    this.name = 'RequestRetryError'
    this.message = message || 'Request retry error'
    this.code = 'UND_ERR_REQ_RETRY'
    this.statusCode = code
    this.data = data
    this.headers = headers
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kRequestRetryError] === true
  }

  get [kRequestRetryError] () {
    return true
  }
}

const kResponseError = Symbol.for('undici.error.UND_ERR_RESPONSE')
class ResponseError extends UndiciError {
  constructor (message, code, { headers, body }) {
    super(message)
    this.name = 'ResponseError'
    this.message = message || 'Response error'
    this.code = 'UND_ERR_RESPONSE'
    this.statusCode = code
    this.body = body
    this.headers = headers
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kResponseError] === true
  }

  get [kResponseError] () {
    return true
  }
}

const kSecureProxyConnectionError = Symbol.for('undici.error.UND_ERR_PRX_TLS')
class SecureProxyConnectionError extends UndiciError {
  constructor (cause, message, options = {}) {
    super(message, { cause, ...options })
    this.name = 'SecureProxyConnectionError'
    this.message = message || 'Secure Proxy Connection failed'
    this.code = 'UND_ERR_PRX_TLS'
    this.cause = cause
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kSecureProxyConnectionError] === true
  }

  get [kSecureProxyConnectionError] () {
    return true
  }
}

const kMaxOriginsReachedError = Symbol.for('undici.error.UND_ERR_MAX_ORIGINS_REACHED')
class MaxOriginsReachedError extends UndiciError {
  constructor (message) {
    super(message)
    this.name = 'MaxOriginsReachedError'
    this.message = message || 'Maximum allowed origins reached'
    this.code = 'UND_ERR_MAX_ORIGINS_REACHED'
  }

  static [Symbol.hasInstance] (instance) {
    return instance && instance[kMaxOriginsReachedError] === true
  }

  get [kMaxOriginsReachedError] () {
    return true
  }
}

module.exports = {
  AbortError,
  HTTPParserError,
  UndiciError,
  HeadersTimeoutError,
  HeadersOverflowError,
  BodyTimeoutError,
  RequestContentLengthMismatchError,
  ConnectTimeoutError,
  InvalidArgumentError,
  InvalidReturnValueError,
  RequestAbortedError,
  ClientDestroyedError,
  ClientClosedError,
  InformationalError,
  SocketError,
  NotSupportedError,
  ResponseContentLengthMismatchError,
  BalancedPoolMissingUpstreamError,
  ResponseExceededMaxSizeError,
  RequestRetryError,
  ResponseError,
  SecureProxyConnectionError,
  MaxOriginsReachedError
}
