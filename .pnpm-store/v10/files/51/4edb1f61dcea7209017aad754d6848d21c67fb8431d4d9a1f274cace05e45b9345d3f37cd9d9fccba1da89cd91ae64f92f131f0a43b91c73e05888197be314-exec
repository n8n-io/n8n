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

/**
 * @fileoverview Defines an environment agnostic {@linkplain cmd.Executor
 * command executor} that communicates with a remote end using JSON over HTTP.
 *
 * Clients should implement the {@link Client} interface, which is used by
 * the {@link Executor} to send commands to the remote end.
 */

'use strict'

const path = require('node:path')
const cmd = require('./command')
const error = require('./error')
const logging = require('./logging')
const promise = require('./promise')
const { Session } = require('./session')
const webElement = require('./webelement')
const { isObject } = require('./util')

const log_ = logging.getLogger(`${logging.Type.DRIVER}.http`)

const getAttribute = requireAtom('get-attribute.js', '//javascript/selenium-webdriver/lib/atoms:get-attribute.js')
const isDisplayed = requireAtom('is-displayed.js', '//javascript/selenium-webdriver/lib/atoms:is-displayed.js')
const findElements = requireAtom('find-elements.js', '//javascript/selenium-webdriver/lib/atoms:find-elements.js')

/**
 * @param {string} module
 * @param {string} bazelTarget
 * @return {!Function}
 */
function requireAtom(module, bazelTarget) {
  try {
    return require('./atoms/' + module)
  } catch (ex) {
    try {
      const file = bazelTarget.slice(2).replace(':', '/')
      log_.log(`../../../bazel-bin/${file}`)
      return require(path.resolve(`../../../bazel-bin/${file}`))
    } catch (ex2) {
      log_.severe(ex2)
      throw Error(
        `Failed to import atoms module ${module}. If running in dev mode, you` +
          ` need to run \`bazel build ${bazelTarget}\` from the project` +
          `root: ${ex}`,
      )
    }
  }
}

/**
 * Converts a headers map to a HTTP header block string.
 * @param {!Map<string, string>} headers The map to convert.
 * @return {string} The headers as a string.
 */
function headersToString(headers) {
  const ret = []
  headers.forEach(function (value, name) {
    ret.push(`${name.toLowerCase()}: ${value}`)
  })
  return ret.join('\n')
}

/**
 * Represents a HTTP request message. This class is a "partial" request and only
 * defines the path on the server to send a request to. It is each client's
 * responsibility to build the full URL for the final request.
 * @final
 */
class Request {
  /**
   * @param {string} method The HTTP method to use for the request.
   * @param {string} path The path on the server to send the request to.
   * @param {Object=} opt_data This request's non-serialized JSON payload data.
   */
  constructor(method, path, opt_data) {
    this.method = /** string */ method
    this.path = /** string */ path
    this.data = /** Object */ opt_data
    this.headers = /** !Map<string, string> */ new Map([['Accept', 'application/json; charset=utf-8']])
  }

  /** @override */
  toString() {
    let ret = `${this.method} ${this.path} HTTP/1.1\n`
    ret += headersToString(this.headers) + '\n\n'
    if (this.data) {
      ret += JSON.stringify(this.data)
    }
    return ret
  }
}

/**
 * Represents a HTTP response message.
 * @final
 */
class Response {
  /**
   * @param {number} status The response code.
   * @param {!Object<string>} headers The response headers. All header names
   *     will be converted to lowercase strings for consistent lookups.
   * @param {string} body The response body.
   */
  constructor(status, headers, body) {
    this.status = /** number */ status
    this.body = /** string */ body
    this.headers = /** !Map<string, string>*/ new Map()
    for (let header in headers) {
      this.headers.set(header.toLowerCase(), headers[header])
    }
  }

  /** @override */
  toString() {
    let ret = `HTTP/1.1 ${this.status}\n${headersToString(this.headers)}\n\n`
    if (this.body) {
      ret += this.body
    }
    return ret
  }
}

/** @enum {!Function} */
const Atom = {
  GET_ATTRIBUTE: getAttribute,
  IS_DISPLAYED: isDisplayed,
  FIND_ELEMENTS: findElements,
}

function post(path) {
  return resource('POST', path)
}

function del(path) {
  return resource('DELETE', path)
}

function get(path) {
  return resource('GET', path)
}

function resource(method, path) {
  return { method: method, path: path }
}

/** @typedef {{method: string, path: string}} */
var CommandSpec

/** @typedef {function(!cmd.Command): !cmd.Command} */
var CommandTransformer

class InternalTypeError extends TypeError {}

/**
 * @param {!cmd.Command} command The initial command.
 * @param {Atom} atom The name of the atom to execute.
 * @param params
 * @return {!Command} The transformed command to execute.
 */
function toExecuteAtomCommand(command, atom, name, ...params) {
  if (typeof atom !== 'function') {
    throw new InternalTypeError('atom is not a function: ' + typeof atom)
  }

  return new cmd.Command(cmd.Name.EXECUTE_SCRIPT)
    .setParameter('sessionId', command.getParameter('sessionId'))
    .setParameter('script', `/* ${name} */return (${atom}).apply(null, arguments)`)
    .setParameter(
      'args',
      params.map((param) => command.getParameter(param)),
    )
}

/** @const {!Map<string, (CommandSpec|CommandTransformer)>} */
const W3C_COMMAND_MAP = new Map([
  // Session management.
  [cmd.Name.NEW_SESSION, post('/session')],
  [cmd.Name.QUIT, del('/session/:sessionId')],

  // Server status.
  [cmd.Name.GET_SERVER_STATUS, get('/status')],

  // timeouts
  [cmd.Name.GET_TIMEOUT, get('/session/:sessionId/timeouts')],
  [cmd.Name.SET_TIMEOUT, post('/session/:sessionId/timeouts')],

  // Navigation.
  [cmd.Name.GET_CURRENT_URL, get('/session/:sessionId/url')],
  [cmd.Name.GET, post('/session/:sessionId/url')],
  [cmd.Name.GO_BACK, post('/session/:sessionId/back')],
  [cmd.Name.GO_FORWARD, post('/session/:sessionId/forward')],
  [cmd.Name.REFRESH, post('/session/:sessionId/refresh')],

  // Page inspection.
  [cmd.Name.GET_PAGE_SOURCE, get('/session/:sessionId/source')],
  [cmd.Name.GET_TITLE, get('/session/:sessionId/title')],

  // Script execution.
  [cmd.Name.EXECUTE_SCRIPT, post('/session/:sessionId/execute/sync')],
  [cmd.Name.EXECUTE_ASYNC_SCRIPT, post('/session/:sessionId/execute/async')],

  // Frame selection.
  [cmd.Name.SWITCH_TO_FRAME, post('/session/:sessionId/frame')],
  [cmd.Name.SWITCH_TO_FRAME_PARENT, post('/session/:sessionId/frame/parent')],

  // Window management.
  [cmd.Name.GET_CURRENT_WINDOW_HANDLE, get('/session/:sessionId/window')],
  [cmd.Name.CLOSE, del('/session/:sessionId/window')],
  [cmd.Name.SWITCH_TO_WINDOW, post('/session/:sessionId/window')],
  [cmd.Name.SWITCH_TO_NEW_WINDOW, post('/session/:sessionId/window/new')],
  [cmd.Name.GET_WINDOW_HANDLES, get('/session/:sessionId/window/handles')],
  [cmd.Name.GET_WINDOW_RECT, get('/session/:sessionId/window/rect')],
  [cmd.Name.SET_WINDOW_RECT, post('/session/:sessionId/window/rect')],
  [cmd.Name.MAXIMIZE_WINDOW, post('/session/:sessionId/window/maximize')],
  [cmd.Name.MINIMIZE_WINDOW, post('/session/:sessionId/window/minimize')],
  [cmd.Name.FULLSCREEN_WINDOW, post('/session/:sessionId/window/fullscreen')],

  // Actions.
  [cmd.Name.ACTIONS, post('/session/:sessionId/actions')],
  [cmd.Name.CLEAR_ACTIONS, del('/session/:sessionId/actions')],
  [cmd.Name.PRINT_PAGE, post('/session/:sessionId/print')],

  // Locating elements.
  [cmd.Name.GET_ACTIVE_ELEMENT, get('/session/:sessionId/element/active')],
  [cmd.Name.FIND_ELEMENT, post('/session/:sessionId/element')],
  [cmd.Name.FIND_ELEMENTS, post('/session/:sessionId/elements')],
  [
    cmd.Name.FIND_ELEMENTS_RELATIVE,
    (cmd) => {
      return toExecuteAtomCommand(cmd, Atom.FIND_ELEMENTS, 'findElements', 'args')
    },
  ],
  [cmd.Name.FIND_CHILD_ELEMENT, post('/session/:sessionId/element/:id/element')],
  [cmd.Name.FIND_CHILD_ELEMENTS, post('/session/:sessionId/element/:id/elements')],
  // Element interaction.
  [cmd.Name.GET_ELEMENT_TAG_NAME, get('/session/:sessionId/element/:id/name')],
  [cmd.Name.GET_DOM_ATTRIBUTE, get('/session/:sessionId/element/:id/attribute/:name')],
  [
    cmd.Name.GET_ELEMENT_ATTRIBUTE,
    (cmd) => {
      return toExecuteAtomCommand(cmd, Atom.GET_ATTRIBUTE, 'getAttribute', 'id', 'name')
    },
  ],
  [cmd.Name.GET_ELEMENT_PROPERTY, get('/session/:sessionId/element/:id/property/:name')],
  [cmd.Name.GET_ELEMENT_VALUE_OF_CSS_PROPERTY, get('/session/:sessionId/element/:id/css/:propertyName')],
  [cmd.Name.GET_ELEMENT_RECT, get('/session/:sessionId/element/:id/rect')],
  [cmd.Name.CLEAR_ELEMENT, post('/session/:sessionId/element/:id/clear')],
  [cmd.Name.CLICK_ELEMENT, post('/session/:sessionId/element/:id/click')],
  [cmd.Name.SEND_KEYS_TO_ELEMENT, post('/session/:sessionId/element/:id/value')],
  [cmd.Name.GET_ELEMENT_TEXT, get('/session/:sessionId/element/:id/text')],
  [cmd.Name.GET_COMPUTED_ROLE, get('/session/:sessionId/element/:id/computedrole')],
  [cmd.Name.GET_COMPUTED_LABEL, get('/session/:sessionId/element/:id/computedlabel')],
  [cmd.Name.IS_ELEMENT_ENABLED, get('/session/:sessionId/element/:id/enabled')],
  [cmd.Name.IS_ELEMENT_SELECTED, get('/session/:sessionId/element/:id/selected')],

  [
    cmd.Name.IS_ELEMENT_DISPLAYED,
    (cmd) => {
      return toExecuteAtomCommand(cmd, Atom.IS_DISPLAYED, 'isDisplayed', 'id')
    },
  ],

  // Cookie management.
  [cmd.Name.GET_ALL_COOKIES, get('/session/:sessionId/cookie')],
  [cmd.Name.ADD_COOKIE, post('/session/:sessionId/cookie')],
  [cmd.Name.DELETE_ALL_COOKIES, del('/session/:sessionId/cookie')],
  [cmd.Name.GET_COOKIE, get('/session/:sessionId/cookie/:name')],
  [cmd.Name.DELETE_COOKIE, del('/session/:sessionId/cookie/:name')],

  // Alert management.
  [cmd.Name.ACCEPT_ALERT, post('/session/:sessionId/alert/accept')],
  [cmd.Name.DISMISS_ALERT, post('/session/:sessionId/alert/dismiss')],
  [cmd.Name.GET_ALERT_TEXT, get('/session/:sessionId/alert/text')],
  [cmd.Name.SET_ALERT_TEXT, post('/session/:sessionId/alert/text')],

  // Screenshots.
  [cmd.Name.SCREENSHOT, get('/session/:sessionId/screenshot')],
  [cmd.Name.TAKE_ELEMENT_SCREENSHOT, get('/session/:sessionId/element/:id/screenshot')],

  // Shadow Root
  [cmd.Name.GET_SHADOW_ROOT, get('/session/:sessionId/element/:id/shadow')],
  [cmd.Name.FIND_ELEMENT_FROM_SHADOWROOT, post('/session/:sessionId/shadow/:id/element')],
  [cmd.Name.FIND_ELEMENTS_FROM_SHADOWROOT, post('/session/:sessionId/shadow/:id/elements')],
  // Log extensions.
  [cmd.Name.GET_LOG, post('/session/:sessionId/se/log')],
  [cmd.Name.GET_AVAILABLE_LOG_TYPES, get('/session/:sessionId/se/log/types')],

  // Server Extensions
  [cmd.Name.UPLOAD_FILE, post('/session/:sessionId/se/file')],

  // Virtual Authenticator
  [cmd.Name.ADD_VIRTUAL_AUTHENTICATOR, post('/session/:sessionId/webauthn/authenticator')],
  [cmd.Name.REMOVE_VIRTUAL_AUTHENTICATOR, del('/session/:sessionId/webauthn/authenticator/:authenticatorId')],
  [cmd.Name.ADD_CREDENTIAL, post('/session/:sessionId/webauthn/authenticator/:authenticatorId/credential')],
  [cmd.Name.GET_CREDENTIALS, get('/session/:sessionId/webauthn/authenticator/:authenticatorId/credentials')],
  [
    cmd.Name.REMOVE_CREDENTIAL,
    del('/session/:sessionId/webauthn/authenticator/:authenticatorId/credentials/:credentialId'),
  ],
  [cmd.Name.REMOVE_ALL_CREDENTIALS, del('/session/:sessionId/webauthn/authenticator/:authenticatorId/credentials')],
  [cmd.Name.SET_USER_VERIFIED, post('/session/:sessionId/webauthn/authenticator/:authenticatorId/uv')],

  [cmd.Name.GET_DOWNLOADABLE_FILES, get('/session/:sessionId/se/files')],
  [cmd.Name.DOWNLOAD_FILE, post(`/session/:sessionId/se/files`)],
  [cmd.Name.DELETE_DOWNLOADABLE_FILES, del(`/session/:sessionId/se/files`)],

  // Federated Credential Management Command
  [cmd.Name.CANCEL_DIALOG, post(`/session/:sessionId/fedcm/canceldialog`)],
  [cmd.Name.SELECT_ACCOUNT, post(`/session/:sessionId/fedcm/selectaccount`)],
  [cmd.Name.GET_FEDCM_TITLE, get(`/session/:sessionId/fedcm/gettitle`)],
  [cmd.Name.GET_FEDCM_DIALOG_TYPE, get('/session/:sessionId/fedcm/getdialogtype')],
  [cmd.Name.SET_DELAY_ENABLED, post(`/session/:sessionId/fedcm/setdelayenabled`)],
  [cmd.Name.RESET_COOLDOWN, post(`/session/:sessionId/fedcm/resetcooldown`)],
  [cmd.Name.CLICK_DIALOG_BUTTON, post(`/session/:sessionId/fedcm/clickdialogbutton`)],
  [cmd.Name.GET_ACCOUNTS, get(`/session/:sessionId/fedcm/accountlist`)],
])

/**
 * Handles sending HTTP messages to a remote end.
 *
 * @interface
 */
class Client {
  /**
   * Sends a request to the server. The client will automatically follow any
   * redirects returned by the server, fulfilling the returned promise with the
   * final response.
   *
   * @param {!Request} httpRequest The request to send.
   * @return {!Promise<Response>} A promise that will be fulfilled with the
   *     server's response.
   */
  send(httpRequest) {}
}

/**
 * @param {Map<string, CommandSpec>} customCommands
 *     A map of custom command definitions.
 * @param {!cmd.Command} command The command to resolve.
 * @return {!Request} A promise that will resolve with the
 *     command to execute.
 */
function buildRequest(customCommands, command) {
  log_.finest(() => `Translating command: ${command.getName()}`)
  let spec = customCommands && customCommands.get(command.getName())
  if (spec) {
    return toHttpRequest(spec)
  }

  spec = W3C_COMMAND_MAP.get(command.getName())
  if (typeof spec === 'function') {
    log_.finest(() => `Transforming command for W3C: ${command.getName()}`)
    let newCommand = spec(command)
    return buildRequest(customCommands, newCommand)
  } else if (spec) {
    return toHttpRequest(spec)
  }
  throw new error.UnknownCommandError('Unrecognized command: ' + command.getName())

  /**
   * @param {CommandSpec} resource
   * @return {!Request}
   */
  function toHttpRequest(resource) {
    log_.finest(() => `Building HTTP request: ${JSON.stringify(resource)}`)
    let parameters = command.getParameters()
    let path = buildPath(resource.path, parameters)
    return new Request(resource.method, path, parameters)
  }
}

const CLIENTS = /** !WeakMap<!Executor, !(Client|IThenable<!Client>)> */ new WeakMap()

/**
 * A command executor that communicates with the server using JSON over HTTP.
 *
 * By default, each instance of this class will use the legacy wire protocol
 * from [Selenium project][json]. The executor will automatically switch to the
 * [W3C wire protocol][w3c] if the remote end returns a compliant response to
 * a new session command.
 *
 * [json]: https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol
 * [w3c]: https://w3c.github.io/webdriver/webdriver-spec.html
 *
 * @implements {cmd.Executor}
 */
class Executor {
  /**
   * @param {!(Client|IThenable<!Client>)} client The client to use for sending
   *     requests to the server, or a promise-like object that will resolve
   *     to the client.
   */
  constructor(client) {
    CLIENTS.set(this, client)

    /** @private {Map<string, CommandSpec>} */
    this.customCommands_ = null

    /** @private {!logging.Logger} */
    this.log_ = logging.getLogger(`${logging.Type.DRIVER}.http.Executor`)
  }

  /**
   * Defines a new command for use with this executor. When a command is sent,
   * the {@code path} will be preprocessed using the command's parameters; any
   * path segments prefixed with ":" will be replaced by the parameter of the
   * same name. For example, given "/person/:name" and the parameters
   * "{name: 'Bob'}", the final command path will be "/person/Bob".
   *
   * @param {string} name The command name.
   * @param {string} method The HTTP method to use when sending this command.
   * @param {string} path The path to send the command to, relative to
   *     the WebDriver server's command root and of the form
   *     "/path/:variable/segment".
   */
  defineCommand(name, method, path) {
    if (!this.customCommands_) {
      this.customCommands_ = new Map()
    }
    this.customCommands_.set(name, { method, path })
  }

  /** @override */
  async execute(command) {
    let request = buildRequest(this.customCommands_, command)
    this.log_.finer(() => `>>> ${request.method} ${request.path}`)

    let client = CLIENTS.get(this)
    if (promise.isPromise(client)) {
      client = await client
      CLIENTS.set(this, client)
    }

    let response = await client.send(request)
    this.log_.finer(() => `>>>\n${request}\n<<<\n${response}`)

    let httpResponse = /** @type {!Response} */ (response)

    let { isW3C, value } = parseHttpResponse(command, httpResponse)

    if (command.getName() === cmd.Name.NEW_SESSION) {
      if (!value || !value.sessionId) {
        throw new error.WebDriverError(`Unable to parse new session response: ${response.body}`)
      }

      // The remote end is a W3C compliant server if there is no `status`
      // field in the response.
      if (command.getName() === cmd.Name.NEW_SESSION) {
        this.w3c = this.w3c || isW3C
      }

      // No implementations use the `capabilities` key yet...
      let capabilities = value.capabilities || value.value
      return new Session(/** @type {{sessionId: string}} */ (value).sessionId, capabilities)
    }

    return typeof value === 'undefined' ? null : value
  }
}

/**
 * @param {string} str .
 * @return {?} .
 */
function tryParse(str) {
  try {
    return JSON.parse(str)
    /*eslint no-unused-vars: "off"*/
  } catch (ignored) {
    // Do nothing.
  }
}

/**
 * Callback used to parse {@link Response} objects from a
 * {@link HttpClient}.
 *
 * @param {!cmd.Command} command The command the response is for.
 * @param {!Response} httpResponse The HTTP response to parse.
 * @return {{isW3C: boolean, value: ?}} An object describing the parsed
 *     response. This object will have two fields: `isW3C` indicates whether
 *     the response looks like it came from a remote end that conforms with the
 *     W3C WebDriver spec, and `value`, the actual response value.
 * @throws {WebDriverError} If the HTTP response is an error.
 */
function parseHttpResponse(command, httpResponse) {
  if (httpResponse.status < 200) {
    // This should never happen, but throw the raw response so users report it.
    throw new error.WebDriverError(`Unexpected HTTP response:\n${httpResponse}`)
  }

  let parsed = tryParse(httpResponse.body)

  if (parsed && typeof parsed === 'object') {
    let value = parsed.value
    let isW3C = isObject(value) && typeof parsed.status === 'undefined'

    if (!isW3C) {
      error.checkLegacyResponse(parsed)

      // Adjust legacy new session responses to look like W3C to simplify
      // later processing.
      if (command.getName() === cmd.Name.NEW_SESSION) {
        value = parsed
      }
    } else if (httpResponse.status > 399) {
      error.throwDecodedError(value)
    }

    return { isW3C, value }
  }

  if (parsed !== undefined) {
    return { isW3C: false, value: parsed }
  }

  let value = httpResponse.body.replace(/\r\n/g, '\n')

  // 404 represents an unknown command; anything else > 399 is a generic unknown
  // error.
  if (httpResponse.status === 404) {
    throw new error.UnsupportedOperationError(command.getName() + ': ' + value)
  } else if (httpResponse.status >= 400) {
    throw new error.WebDriverError(value)
  }

  return { isW3C: false, value: value || null }
}

/**
 * Builds a fully qualified path using the given set of command parameters. Each
 * path segment prefixed with ':' will be replaced by the value of the
 * corresponding parameter. All parameters spliced into the path will be
 * removed from the parameter map.
 * @param {string} path The original resource path.
 * @param {!Object<*>} parameters The parameters object to splice into the path.
 * @return {string} The modified path.
 */
function buildPath(path, parameters) {
  let pathParameters = path.match(/\/:(\w+)\b/g)
  if (pathParameters) {
    for (let i = 0; i < pathParameters.length; ++i) {
      let key = pathParameters[i].substring(2) // Trim the /:
      if (key in parameters) {
        let value = parameters[key]
        if (webElement.isId(value)) {
          // When inserting a WebElement into the URL, only use its ID value,
          // not the full JSON.
          value = webElement.extractId(value)
        }
        path = path.replace(pathParameters[i], '/' + value)
        delete parameters[key]
      } else {
        throw new error.InvalidArgumentError('Missing required parameter: ' + key)
      }
    }
  }
  return path
}

// PUBLIC API

module.exports = {
  Executor,
  Client,
  Request,
  Response,
  // Exported for testing.
  buildPath,
}
