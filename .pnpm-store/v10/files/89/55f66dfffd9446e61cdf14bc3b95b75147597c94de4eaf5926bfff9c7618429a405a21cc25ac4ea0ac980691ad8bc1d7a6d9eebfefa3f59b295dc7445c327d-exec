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

'use strict'

const { isObject } = require('./util')

/**
 * The base WebDriver error type. This error type is only used directly when a
 * more appropriate category is not defined for the offending error.
 */
class WebDriverError extends Error {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)

    /** @override */
    this.name = this.constructor.name

    /**
     * A stacktrace reported by the remote webdriver endpoint that initially
     * reported this error. This property will be an empty string if the remote
     * end did not provide a stacktrace.
     * @type {string}
     */
    this.remoteStacktrace = ''
  }
}

/**
 * Indicates the shadow root is no longer attached to the DOM
 */
class DetachedShadowRootError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * Indicates a {@linkplain ./webdriver.WebElement#click click command} could not
 * completed because the click target is obscured by other elements on the
 * page.
 */
class ElementClickInterceptedError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * An attempt was made to select an element that cannot be selected.
 */
class ElementNotSelectableError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * Indicates a command could not be completed because the target element is
 * not pointer or keyboard interactable. This will often occur if an element
 * is present in the DOM, but not rendered (i.e. its CSS style has
 * "display: none").
 */
class ElementNotInteractableError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * Indicates a navigation event caused the browser to generate a certificate
 * warning. This is usually caused by an expired or invalid TLS certificate.
 */
class InsecureCertificateError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * The arguments passed to a command are either invalid or malformed.
 */
class InvalidArgumentError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * An illegal attempt was made to set a cookie under a different domain than
 * the current page.
 */
class InvalidCookieDomainError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * The coordinates provided to an interactions operation are invalid.
 */
class InvalidCoordinatesError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * An element command could not be completed because the element is in an
 * invalid state, e.g. attempting to click an element that is no longer attached
 * to the document.
 */
class InvalidElementStateError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * Argument was an invalid selector.
 */
class InvalidSelectorError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * Occurs when a command is directed to a session that does not exist.
 */
class NoSuchSessionError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * An error occurred while executing JavaScript supplied by the user.
 */
class JavascriptError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * The target for mouse interaction is not in the browser’s viewport and cannot
 * be brought into that viewport.
 */
class MoveTargetOutOfBoundsError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * An attempt was made to operate on a modal dialog when one was not open.
 */
class NoSuchAlertError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * Indicates a named cookie could not be found in the cookie jar for the
 * currently selected document.
 */
class NoSuchCookieError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * An element could not be located on the page using the given search
 * parameters.
 */
class NoSuchElementError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * A ShadowRoot could not be located on the element
 */
class NoSuchShadowRootError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * A request to switch to a frame could not be satisfied because the frame
 * could not be found.
 */
class NoSuchFrameError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * A request to switch to a window could not be satisfied because the window
 * could not be found.
 */
class NoSuchWindowError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * A script did not complete before its timeout expired.
 */
class ScriptTimeoutError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * A new session could not be created.
 */
class SessionNotCreatedError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * An element command failed because the referenced element is no longer
 * attached to the DOM.
 */
class StaleElementReferenceError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * An operation did not complete before its timeout expired.
 */
class TimeoutError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * A request to set a cookie’s value could not be satisfied.
 */
class UnableToSetCookieError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * A screen capture operation was not possible.
 */
class UnableToCaptureScreenError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * A modal dialog was open, blocking this operation.
 */
class UnexpectedAlertOpenError extends WebDriverError {
  /**
   * @param {string=} opt_error the error message, if any.
   * @param {string=} opt_text the text of the open dialog, if available.
   */
  constructor(opt_error, opt_text) {
    super(opt_error)

    /** @private {(string|undefined)} */
    this.text_ = opt_text
  }

  /**
   * @return {(string|undefined)} The text displayed with the unhandled alert,
   *     if available.
   */
  getAlertText() {
    return this.text_
  }
}

/**
 * A command could not be executed because the remote end is not aware of it.
 */
class UnknownCommandError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * The requested command matched a known URL but did not match an method for
 * that URL.
 */
class UnknownMethodError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

/**
 * Reports an unsupported operation.
 */
class UnsupportedOperationError extends WebDriverError {
  /** @param {string=} opt_error the error message, if any. */
  constructor(opt_error) {
    super(opt_error)
  }
}

// TODO(jleyba): Define UnknownError as an alias of WebDriverError?

/**
 * Enum of legacy error codes.
 * TODO: remove this when all code paths have been switched to the new error
 * types.
 * @deprecated
 * @enum {number}
 */
const ErrorCode = {
  SUCCESS: 0,
  NO_SUCH_SESSION: 6,
  NO_SUCH_ELEMENT: 7,
  NO_SUCH_FRAME: 8,
  UNKNOWN_COMMAND: 9,
  UNSUPPORTED_OPERATION: 9,
  STALE_ELEMENT_REFERENCE: 10,
  ELEMENT_NOT_VISIBLE: 11,
  INVALID_ELEMENT_STATE: 12,
  UNKNOWN_ERROR: 13,
  ELEMENT_NOT_SELECTABLE: 15,
  JAVASCRIPT_ERROR: 17,
  XPATH_LOOKUP_ERROR: 19,
  TIMEOUT: 21,
  NO_SUCH_WINDOW: 23,
  INVALID_COOKIE_DOMAIN: 24,
  UNABLE_TO_SET_COOKIE: 25,
  UNEXPECTED_ALERT_OPEN: 26,
  NO_SUCH_ALERT: 27,
  SCRIPT_TIMEOUT: 28,
  INVALID_ELEMENT_COORDINATES: 29,
  IME_NOT_AVAILABLE: 30,
  IME_ENGINE_ACTIVATION_FAILED: 31,
  INVALID_SELECTOR_ERROR: 32,
  SESSION_NOT_CREATED: 33,
  MOVE_TARGET_OUT_OF_BOUNDS: 34,
  SQL_DATABASE_ERROR: 35,
  INVALID_XPATH_SELECTOR: 51,
  INVALID_XPATH_SELECTOR_RETURN_TYPE: 52,
  ELEMENT_NOT_INTERACTABLE: 60,
  INVALID_ARGUMENT: 61,
  NO_SUCH_COOKIE: 62,
  UNABLE_TO_CAPTURE_SCREEN: 63,
  ELEMENT_CLICK_INTERCEPTED: 64,
  DETACHED_SHADOW_ROOT: 65,
  METHOD_NOT_ALLOWED: 405,
}

const LEGACY_ERROR_CODE_TO_TYPE = new Map([
  [ErrorCode.NO_SUCH_SESSION, NoSuchSessionError],
  [ErrorCode.NO_SUCH_ELEMENT, NoSuchElementError],
  [ErrorCode.NO_SUCH_FRAME, NoSuchFrameError],
  [ErrorCode.UNSUPPORTED_OPERATION, UnsupportedOperationError],
  [ErrorCode.STALE_ELEMENT_REFERENCE, StaleElementReferenceError],
  [ErrorCode.INVALID_ELEMENT_STATE, InvalidElementStateError],
  [ErrorCode.UNKNOWN_ERROR, WebDriverError],
  [ErrorCode.ELEMENT_NOT_SELECTABLE, ElementNotSelectableError],
  [ErrorCode.JAVASCRIPT_ERROR, JavascriptError],
  [ErrorCode.XPATH_LOOKUP_ERROR, InvalidSelectorError],
  [ErrorCode.TIMEOUT, TimeoutError],
  [ErrorCode.NO_SUCH_WINDOW, NoSuchWindowError],
  [ErrorCode.INVALID_COOKIE_DOMAIN, InvalidCookieDomainError],
  [ErrorCode.UNABLE_TO_SET_COOKIE, UnableToSetCookieError],
  [ErrorCode.UNEXPECTED_ALERT_OPEN, UnexpectedAlertOpenError],
  [ErrorCode.NO_SUCH_ALERT, NoSuchAlertError],
  [ErrorCode.SCRIPT_TIMEOUT, ScriptTimeoutError],
  [ErrorCode.INVALID_ELEMENT_COORDINATES, InvalidCoordinatesError],
  [ErrorCode.INVALID_SELECTOR_ERROR, InvalidSelectorError],
  [ErrorCode.SESSION_NOT_CREATED, SessionNotCreatedError],
  [ErrorCode.MOVE_TARGET_OUT_OF_BOUNDS, MoveTargetOutOfBoundsError],
  [ErrorCode.INVALID_XPATH_SELECTOR, InvalidSelectorError],
  [ErrorCode.INVALID_XPATH_SELECTOR_RETURN_TYPE, InvalidSelectorError],
  [ErrorCode.ELEMENT_NOT_INTERACTABLE, ElementNotInteractableError],
  [ErrorCode.INVALID_ARGUMENT, InvalidArgumentError],
  [ErrorCode.NO_SUCH_COOKIE, NoSuchCookieError],
  [ErrorCode.UNABLE_TO_CAPTURE_SCREEN, UnableToCaptureScreenError],
  [ErrorCode.ELEMENT_CLICK_INTERCEPTED, ElementClickInterceptedError],
  [ErrorCode.DETACHED_SHADOW_ROOT, DetachedShadowRootError],
  [ErrorCode.METHOD_NOT_ALLOWED, UnsupportedOperationError],
])

const ERROR_CODE_TO_TYPE = new Map([
  ['unknown error', WebDriverError],
  ['detached shadow root', DetachedShadowRootError],
  ['element click intercepted', ElementClickInterceptedError],
  ['element not interactable', ElementNotInteractableError],
  ['element not selectable', ElementNotSelectableError],
  ['insecure certificate', InsecureCertificateError],
  ['invalid argument', InvalidArgumentError],
  ['invalid cookie domain', InvalidCookieDomainError],
  ['invalid coordinates', InvalidCoordinatesError],
  ['invalid element state', InvalidElementStateError],
  ['invalid selector', InvalidSelectorError],
  ['invalid session id', NoSuchSessionError],
  ['javascript error', JavascriptError],
  ['move target out of bounds', MoveTargetOutOfBoundsError],
  ['no such alert', NoSuchAlertError],
  ['no such cookie', NoSuchCookieError],
  ['no such element', NoSuchElementError],
  ['no such frame', NoSuchFrameError],
  ['no such shadow root', NoSuchShadowRootError],
  ['no such window', NoSuchWindowError],
  ['script timeout', ScriptTimeoutError],
  ['session not created', SessionNotCreatedError],
  ['stale element reference', StaleElementReferenceError],
  ['timeout', TimeoutError],
  ['unable to set cookie', UnableToSetCookieError],
  ['unable to capture screen', UnableToCaptureScreenError],
  ['unexpected alert open', UnexpectedAlertOpenError],
  ['unknown command', UnknownCommandError],
  ['unknown method', UnknownMethodError],
  ['unsupported operation', UnsupportedOperationError],
])

const TYPE_TO_ERROR_CODE = new Map()
ERROR_CODE_TO_TYPE.forEach((value, key) => {
  TYPE_TO_ERROR_CODE.set(value, key)
})

/**
 * @param {*} err The error to encode.
 * @return {{error: string, message: string}} the encoded error.
 */
function encodeError(err) {
  let type = WebDriverError
  if (err instanceof WebDriverError && TYPE_TO_ERROR_CODE.has(err.constructor)) {
    type = err.constructor
  }

  let message = err instanceof Error ? err.message : err + ''

  let code = /** @type {string} */ (TYPE_TO_ERROR_CODE.get(type))
  return { error: code, message: message }
}

/**
 * Tests if the given value is a valid error response object according to the
 * W3C WebDriver spec.
 *
 * @param {?} data The value to test.
 * @return {boolean} Whether the given value data object is a valid error
 *     response.
 * @see https://w3c.github.io/webdriver/webdriver-spec.html#protocol
 */
function isErrorResponse(data) {
  return isObject(data) && typeof data.error === 'string'
}

/**
 * Throws an error coded from the W3C protocol. A generic error will be thrown
 * if the provided `data` is not a valid encoded error.
 *
 * @param {{error: string, message: string}} data The error data to decode.
 * @throws {WebDriverError} the decoded error.
 * @see https://w3c.github.io/webdriver/webdriver-spec.html#protocol
 */
function throwDecodedError(data) {
  if (isErrorResponse(data)) {
    let ctor = ERROR_CODE_TO_TYPE.get(data.error) || WebDriverError
    let err = new ctor(data.message)
    // TODO(jleyba): remove whichever case is excluded from the final W3C spec.
    if (typeof data.stacktrace === 'string') {
      err.remoteStacktrace = data.stacktrace
    } else if (typeof data.stackTrace === 'string') {
      err.remoteStacktrace = data.stackTrace
    }
    throw err
  }
  throw new WebDriverError('Unknown error: ' + JSON.stringify(data))
}

/**
 * Checks a legacy response from the Selenium 2.0 wire protocol for an error.
 * @param {*} responseObj the response object to check.
 * @return {*} responseObj the original response if it does not define an error.
 * @throws {WebDriverError} if the response object defines an error.
 */
function checkLegacyResponse(responseObj) {
  // Handle the legacy Selenium error response format.
  if (isObject(responseObj) && typeof responseObj.status === 'number' && responseObj.status !== 0) {
    const { status, value } = responseObj

    let ctor = LEGACY_ERROR_CODE_TO_TYPE.get(status) || WebDriverError

    if (!value || typeof value !== 'object') {
      throw new ctor(value + '')
    } else {
      let message = value['message'] + ''
      if (ctor !== UnexpectedAlertOpenError) {
        throw new ctor(message)
      }

      let text = ''
      if (value['alert'] && typeof value['alert']['text'] === 'string') {
        text = value['alert']['text']
      }
      throw new UnexpectedAlertOpenError(message, text)
    }
  }
  return responseObj
}

// PUBLIC API

module.exports = {
  ErrorCode,

  WebDriverError,
  DetachedShadowRootError,
  ElementClickInterceptedError,
  ElementNotInteractableError,
  ElementNotSelectableError,
  InsecureCertificateError,
  InvalidArgumentError,
  InvalidCookieDomainError,
  InvalidCoordinatesError,
  InvalidElementStateError,
  InvalidSelectorError,
  JavascriptError,
  MoveTargetOutOfBoundsError,
  NoSuchAlertError,
  NoSuchCookieError,
  NoSuchElementError,
  NoSuchFrameError,
  NoSuchShadowRootError,
  NoSuchSessionError,
  NoSuchWindowError,
  ScriptTimeoutError,
  SessionNotCreatedError,
  StaleElementReferenceError,
  TimeoutError,
  UnableToSetCookieError,
  UnableToCaptureScreenError,
  UnexpectedAlertOpenError,
  UnknownCommandError,
  UnknownMethodError,
  UnsupportedOperationError,
  checkLegacyResponse,
  encodeError,
  isErrorResponse,
  throwDecodedError,
}
