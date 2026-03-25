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
 * @fileoverview The heart of the WebDriver JavaScript API.
 */

'use strict'

const by = require('./by')
const { RelativeBy } = require('./by')
const command = require('./command')
const error = require('./error')
const input = require('./input')
const logging = require('./logging')
const promise = require('./promise')
const Symbols = require('./symbols')
const cdp = require('../devtools/CDPConnection')
const WebSocket = require('ws')
const http = require('../http/index')
const fs = require('node:fs')
const { Capabilities } = require('./capabilities')
const path = require('node:path')
const { NoSuchElementError } = require('./error')
const cdpTargets = ['page', 'browser']
const { Credential } = require('./virtual_authenticator')
const webElement = require('./webelement')
const { isObject } = require('./util')
const BIDI = require('../bidi')
const { PinnedScript } = require('./pinnedScript')
const JSZip = require('jszip')
const Script = require('./script')
const Network = require('./network')
const Dialog = require('./fedcm/dialog')

// Capability names that are defined in the W3C spec.
const W3C_CAPABILITY_NAMES = new Set([
  'acceptInsecureCerts',
  'browserName',
  'browserVersion',
  'pageLoadStrategy',
  'platformName',
  'proxy',
  'setWindowRect',
  'strictFileInteractability',
  'timeouts',
  'unhandledPromptBehavior',
  'webSocketUrl',
])

/**
 * Defines a condition for use with WebDriver's {@linkplain WebDriver#wait wait
 * command}.
 *
 * @template OUT
 */
class Condition {
  /**
   * @param {string} message A descriptive error message. Should complete the
   *     sentence "Waiting [...]"
   * @param {function(!WebDriver): OUT} fn The condition function to
   *     evaluate on each iteration of the wait loop.
   */
  constructor(message, fn) {
    /** @private {string} */
    this.description_ = 'Waiting ' + message

    /** @type {function(!WebDriver): OUT} */
    this.fn = fn
  }

  /** @return {string} A description of this condition. */
  description() {
    return this.description_
  }
}

/**
 * Defines a condition that will result in a {@link WebElement}.
 *
 * @extends {Condition<!(WebElement|IThenable<!WebElement>)>}
 */
class WebElementCondition extends Condition {
  /**
   * @param {string} message A descriptive error message. Should complete the
   *     sentence "Waiting [...]"
   * @param {function(!WebDriver): !(WebElement|IThenable<!WebElement>)}
   *     fn The condition function to evaluate on each iteration of the wait
   *     loop.
   */
  constructor(message, fn) {
    super(message, fn)
  }
}

//////////////////////////////////////////////////////////////////////////////
//
//  WebDriver
//
//////////////////////////////////////////////////////////////////////////////

/**
 * Translates a command to its wire-protocol representation before passing it
 * to the given `executor` for execution.
 * @param {!command.Executor} executor The executor to use.
 * @param {!command.Command} command The command to execute.
 * @return {!Promise} A promise that will resolve with the command response.
 */
function executeCommand(executor, command) {
  return toWireValue(command.getParameters()).then(function (parameters) {
    command.setParameters(parameters)
    return executor.execute(command)
  })
}

/**
 * Converts an object to its JSON representation in the WebDriver wire protocol.
 * When converting values of type object, the following steps will be taken:
 * <ol>
 * <li>if the object is a WebElement, the return value will be the element's
 *     server ID
 * <li>if the object defines a {@link Symbols.serialize} method, this algorithm
 *     will be recursively applied to the object's serialized representation
 * <li>if the object provides a "toJSON" function, this algorithm will
 *     recursively be applied to the result of that function
 * <li>otherwise, the value of each key will be recursively converted according
 *     to the rules above.
 * </ol>
 *
 * @param {*} obj The object to convert.
 * @return {!Promise<?>} A promise that will resolve to the input value's JSON
 *     representation.
 */
async function toWireValue(obj) {
  let value = await Promise.resolve(obj)
  if (value === void 0 || value === null) {
    return value
  }

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return convertKeys(value)
  }

  if (typeof value === 'function') {
    return '' + value
  }

  if (typeof value[Symbols.serialize] === 'function') {
    return toWireValue(value[Symbols.serialize]())
  } else if (typeof value.toJSON === 'function') {
    return toWireValue(value.toJSON())
  }
  return convertKeys(value)
}

async function convertKeys(obj) {
  const isArray = Array.isArray(obj)
  const numKeys = isArray ? obj.length : Object.keys(obj).length
  const ret = isArray ? new Array(numKeys) : {}
  if (!numKeys) {
    return ret
  }

  async function forEachKey(obj, fn) {
    if (Array.isArray(obj)) {
      for (let i = 0, n = obj.length; i < n; i++) {
        await fn(obj[i], i)
      }
    } else {
      for (let key in obj) {
        await fn(obj[key], key)
      }
    }
  }

  await forEachKey(obj, async function (value, key) {
    ret[key] = await toWireValue(value)
  })

  return ret
}

/**
 * Converts a value from its JSON representation according to the WebDriver wire
 * protocol. Any JSON object that defines a WebElement ID will be decoded to a
 * {@link WebElement} object. All other values will be passed through as is.
 *
 * @param {!WebDriver} driver The driver to use as the parent of any unwrapped
 *     {@link WebElement} values.
 * @param {*} value The value to convert.
 * @return {*} The converted value.
 */
function fromWireValue(driver, value) {
  if (Array.isArray(value)) {
    value = value.map((v) => fromWireValue(driver, v))
  } else if (WebElement.isId(value)) {
    let id = WebElement.extractId(value)
    value = new WebElement(driver, id)
  } else if (ShadowRoot.isId(value)) {
    let id = ShadowRoot.extractId(value)
    value = new ShadowRoot(driver, id)
  } else if (isObject(value)) {
    let result = {}
    for (let key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = fromWireValue(driver, value[key])
      }
    }
    value = result
  }
  return value
}

/**
 * Resolves a wait message from either a function or a string.
 * @param {(string|Function)=} message An optional message to use if the wait times out.
 * @return {string} The resolved message
 */
function resolveWaitMessage(message) {
  return message ? `${typeof message === 'function' ? message() : message}\n` : ''
}

/**
 * Structural interface for a WebDriver client.
 *
 * @record
 */
class IWebDriver {
  /**
   * Executes the provided {@link command.Command} using this driver's
   * {@link command.Executor}.
   *
   * @param {!command.Command} command The command to schedule.
   * @return {!Promise<T>} A promise that will be resolved with the command
   *     result.
   * @template T
   */
  execute(command) {} // eslint-disable-line

  /**
   * Sets the {@linkplain input.FileDetector file detector} that should be
   * used with this instance.
   * @param {input.FileDetector} detector The detector to use or `null`.
   */
  setFileDetector(detector) {} // eslint-disable-line

  /**
   * @return {!command.Executor} The command executor used by this instance.
   */
  getExecutor() {}

  /**
   * @return {!Promise<!Session>} A promise for this client's session.
   */
  getSession() {}

  /**
   * @return {!Promise<!Capabilities>} A promise that will resolve with
   *     the instance's capabilities.
   */
  getCapabilities() {}

  /**
   * Terminates the browser session. After calling quit, this instance will be
   * invalidated and may no longer be used to issue commands against the
   * browser.
   *
   * @return {!Promise<void>} A promise that will be resolved when the
   *     command has completed.
   */
  quit() {}

  /**
   * Creates a new action sequence using this driver. The sequence will not be
   * submitted for execution until
   * {@link ./input.Actions#perform Actions.perform()} is called.
   *
   * @param {{async: (boolean|undefined),
   *          bridge: (boolean|undefined)}=} options Configuration options for
   *     the action sequence (see {@link ./input.Actions Actions} documentation
   *     for details).
   * @return {!input.Actions} A new action sequence for this instance.
   */
  actions(options) {} // eslint-disable-line

  /**
   * Executes a snippet of JavaScript in the context of the currently selected
   * frame or window. The script fragment will be executed as the body of an
   * anonymous function. If the script is provided as a function object, that
   * function will be converted to a string for injection into the target
   * window.
   *
   * Any arguments provided in addition to the script will be included as script
   * arguments and may be referenced using the `arguments` object. Arguments may
   * be a boolean, number, string, or {@linkplain WebElement}. Arrays and
   * objects may also be used as script arguments as long as each item adheres
   * to the types previously mentioned.
   *
   * The script may refer to any variables accessible from the current window.
   * Furthermore, the script will execute in the window's context, thus
   * `document` may be used to refer to the current document. Any local
   * variables will not be available once the script has finished executing,
   * though global variables will persist.
   *
   * If the script has a return value (i.e. if the script contains a return
   * statement), then the following steps will be taken for resolving this
   * functions return value:
   *
   * - For a HTML element, the value will resolve to a {@linkplain WebElement}
   * - Null and undefined return values will resolve to null</li>
   * - Booleans, numbers, and strings will resolve as is</li>
   * - Functions will resolve to their string representation</li>
   * - For arrays and objects, each member item will be converted according to
   *     the rules above
   *
   * @param {!(string|Function)} script The script to execute.
   * @param {...*} args The arguments to pass to the script.
   * @return {!IThenable<T>} A promise that will resolve to the
   *    scripts return value.
   * @template T
   */
  executeScript(script, ...args) {} // eslint-disable-line

  /**
   * Executes a snippet of asynchronous JavaScript in the context of the
   * currently selected frame or window. The script fragment will be executed as
   * the body of an anonymous function. If the script is provided as a function
   * object, that function will be converted to a string for injection into the
   * target window.
   *
   * Any arguments provided in addition to the script will be included as script
   * arguments and may be referenced using the `arguments` object. Arguments may
   * be a boolean, number, string, or {@linkplain WebElement}. Arrays and
   * objects may also be used as script arguments as long as each item adheres
   * to the types previously mentioned.
   *
   * Unlike executing synchronous JavaScript with {@link #executeScript},
   * scripts executed with this function must explicitly signal they are
   * finished by invoking the provided callback. This callback will always be
   * injected into the executed function as the last argument, and thus may be
   * referenced with  `arguments[arguments.length - 1]`. The following steps
   * will be taken for resolving this functions return value against the first
   * argument to the script's callback function:
   *
   * - For a HTML element, the value will resolve to a {@link WebElement}
   * - Null and undefined return values will resolve to null
   * - Booleans, numbers, and strings will resolve as is
   * - Functions will resolve to their string representation
   * - For arrays and objects, each member item will be converted according to
   *     the rules above
   *
   * __Example #1:__ Performing a sleep that is synchronized with the currently
   * selected window:
   *
   *     var start = new Date().getTime();
   *     driver.executeAsyncScript(
   *         'window.setTimeout(arguments[arguments.length - 1], 500);').
   *         then(function() {
   *           console.log(
   *               'Elapsed time: ' + (new Date().getTime() - start) + ' ms');
   *         });
   *
   * __Example #2:__ Synchronizing a test with an AJAX application:
   *
   *     var button = driver.findElement(By.id('compose-button'));
   *     button.click();
   *     driver.executeAsyncScript(
   *         'var callback = arguments[arguments.length - 1];' +
   *         'mailClient.getComposeWindowWidget().onload(callback);');
   *     driver.switchTo().frame('composeWidget');
   *     driver.findElement(By.id('to')).sendKeys('dog@example.com');
   *
   * __Example #3:__ Injecting a XMLHttpRequest and waiting for the result. In
   * this example, the inject script is specified with a function literal. When
   * using this format, the function is converted to a string for injection, so
   * it should not reference any symbols not defined in the scope of the page
   * under test.
   *
   *     driver.executeAsyncScript(function() {
   *       var callback = arguments[arguments.length - 1];
   *       var xhr = new XMLHttpRequest();
   *       xhr.open("GET", "/resource/data.json", true);
   *       xhr.onreadystatechange = function() {
   *         if (xhr.readyState == 4) {
   *           callback(xhr.responseText);
   *         }
   *       };
   *       xhr.send('');
   *     }).then(function(str) {
   *       console.log(JSON.parse(str)['food']);
   *     });
   *
   * @param {!(string|Function)} script The script to execute.
   * @param {...*} args The arguments to pass to the script.
   * @return {!IThenable<T>} A promise that will resolve to the scripts return
   *     value.
   * @template T
   */
  executeAsyncScript(script, ...args) {} // eslint-disable-line

  /**
   * Waits for a condition to evaluate to a "truthy" value. The condition may be
   * specified by a {@link Condition}, as a custom function, or as any
   * promise-like thenable.
   *
   * For a {@link Condition} or function, the wait will repeatedly
   * evaluate the condition until it returns a truthy value. If any errors occur
   * while evaluating the condition, they will be allowed to propagate. In the
   * event a condition returns a {@linkplain Promise}, the polling loop will
   * wait for it to be resolved and use the resolved value for whether the
   * condition has been satisfied. The resolution time for a promise is always
   * factored into whether a wait has timed out.
   *
   * If the provided condition is a {@link WebElementCondition}, then
   * the wait will return a {@link WebElementPromise} that will resolve to the
   * element that satisfied the condition.
   *
   * _Example:_ waiting up to 10 seconds for an element to be present on the
   * page.
   *
   *     async function example() {
   *       let button =
   *           await driver.wait(until.elementLocated(By.id('foo')), 10000);
   *       await button.click();
   *     }
   *
   * @param {!(IThenable<T>|
   *           Condition<T>|
   *           function(!WebDriver): T)} condition The condition to
   *     wait on, defined as a promise, condition object, or  a function to
   *     evaluate as a condition.
   * @param {number=} timeout The duration in milliseconds, how long to wait
   *     for the condition to be true.
   * @param {(string|Function)=} message An optional message to use if the wait times out.
   * @param {number=} pollTimeout The duration in milliseconds, how long to
   *     wait between polling the condition.
   * @return {!(IThenable<T>|WebElementPromise)} A promise that will be
   *     resolved with the first truthy value returned by the condition
   *     function, or rejected if the condition times out. If the input
   *     condition is an instance of a {@link WebElementCondition},
   *     the returned value will be a {@link WebElementPromise}.
   * @throws {TypeError} if the provided `condition` is not a valid type.
   * @template T
   */
  wait(
    condition, // eslint-disable-line
    timeout = undefined, // eslint-disable-line
    message = undefined, // eslint-disable-line
    pollTimeout = undefined, // eslint-disable-line
  ) {}

  /**
   * Makes the driver sleep for the given amount of time.
   *
   * @param {number} ms The amount of time, in milliseconds, to sleep.
   * @return {!Promise<void>} A promise that will be resolved when the sleep has
   *     finished.
   */
  sleep(ms) {} // eslint-disable-line

  /**
   * Retrieves the current window handle.
   *
   * @return {!Promise<string>} A promise that will be resolved with the current
   *     window handle.
   */
  getWindowHandle() {}

  /**
   * Retrieves a list of all available window handles.
   *
   * @return {!Promise<!Array<string>>} A promise that will be resolved with an
   *     array of window handles.
   */
  getAllWindowHandles() {}

  /**
   * Retrieves the current page's source. The returned source is a representation
   * of the underlying DOM: do not expect it to be formatted or escaped in the
   * same way as the raw response sent from the web server.
   *
   * @return {!Promise<string>} A promise that will be resolved with the current
   *     page source.
   */
  getPageSource() {}

  /**
   * Closes the current window.
   *
   * @return {!Promise<void>} A promise that will be resolved when this command
   *     has completed.
   */
  close() {}

  /**
   * Navigates to the given URL.
   *
   * @param {string} url The fully qualified URL to open.
   * @return {!Promise<void>} A promise that will be resolved when the document
   *     has finished loading.
   */
  get(url) {} // eslint-disable-line

  /**
   * Retrieves the URL for the current page.
   *
   * @return {!Promise<string>} A promise that will be resolved with the
   *     current URL.
   */
  getCurrentUrl() {}

  /**
   * Retrieves the current page title.
   *
   * @return {!Promise<string>} A promise that will be resolved with the current
   *     page's title.
   */
  getTitle() {}

  /**
   * Locates an element on the page. If the element cannot be found, a
   * {@link error.NoSuchElementError} will be returned by the driver.
   *
   * This function should not be used to test whether an element is present on
   * the page. Rather, you should use {@link #findElements}:
   *
   *     driver.findElements(By.id('foo'))
   *         .then(found => console.log('Element found? %s', !!found.length));
   *
   * The search criteria for an element may be defined using one of the
   * factories in the {@link webdriver.By} namespace, or as a short-hand
   * {@link webdriver.By.Hash} object. For example, the following two statements
   * are equivalent:
   *
   *     var e1 = driver.findElement(By.id('foo'));
   *     var e2 = driver.findElement({id:'foo'});
   *
   * You may also provide a custom locator function, which takes as input this
   * instance and returns a {@link WebElement}, or a promise that will resolve
   * to a WebElement. If the returned promise resolves to an array of
   * WebElements, WebDriver will use the first element. For example, to find the
   * first visible link on a page, you could write:
   *
   *     var link = driver.findElement(firstVisibleLink);
   *
   *     function firstVisibleLink(driver) {
   *       var links = driver.findElements(By.tagName('a'));
   *       return promise.filter(links, function(link) {
   *         return link.isDisplayed();
   *       });
   *     }
   *
   * @param {!(by.By|Function)} locator The locator to use.
   * @return {!WebElementPromise} A WebElement that can be used to issue
   *     commands against the located element. If the element is not found, the
   *     element will be invalidated and all scheduled commands aborted.
   */
  findElement(locator) {} // eslint-disable-line

  /**
   * Search for multiple elements on the page. Refer to the documentation on
   * {@link #findElement(by)} for information on element locator strategies.
   *
   * @param {!(by.By|Function)} locator The locator to use.
   * @return {!Promise<!Array<!WebElement>>} A promise that will resolve to an
   *     array of WebElements.
   */
  findElements(locator) {} // eslint-disable-line

  /**
   * Takes a screenshot of the current page. The driver makes the best effort to
   * return a screenshot of the following, in order of preference:
   *
   * 1. Entire page
   * 2. Current window
   * 3. Visible portion of the current frame
   * 4. The entire display containing the browser
   *
   * @return {!Promise<string>} A promise that will be resolved to the
   *     screenshot as a base-64 encoded PNG.
   */
  takeScreenshot() {}

  /**
   * @return {!Options} The options interface for this instance.
   */
  manage() {}

  /**
   * @return {!Navigation} The navigation interface for this instance.
   */
  navigate() {}

  /**
   * @return {!TargetLocator} The target locator interface for this
   *     instance.
   */
  switchTo() {}

  /**
   *
   * Takes a PDF of the current page. The driver makes a best effort to
   * return a PDF based on the provided parameters.
   *
   * @param {{orientation:(string|undefined),
   *         scale:(number|undefined),
   *         background:(boolean|undefined),
   *         width:(number|undefined),
   *         height:(number|undefined),
   *         top:(number|undefined),
   *         bottom:(number|undefined),
   *         left:(number|undefined),
   *         right:(number|undefined),
   *         shrinkToFit:(boolean|undefined),
   *         pageRanges:(Array|undefined)}} options
   */
  printPage(options) {} // eslint-disable-line
}

/**
 * @param {!Capabilities} capabilities A capabilities object.
 * @return {!Capabilities} A copy of the parameter capabilities, omitting
 *     capability names that are not valid W3C names.
 */
function filterNonW3CCaps(capabilities) {
  let newCaps = new Capabilities(capabilities)
  for (let k of newCaps.keys()) {
    // Any key containing a colon is a vendor-prefixed capability.
    if (!(W3C_CAPABILITY_NAMES.has(k) || k.indexOf(':') >= 0)) {
      newCaps.delete(k)
    }
  }
  return newCaps
}

/**
 * Each WebDriver instance provides automated control over a browser session.
 *
 * @implements {IWebDriver}
 */
class WebDriver {
  #script = undefined
  #network = undefined
  /**
   * @param {!(./session.Session|IThenable<!./session.Session>)} session Either
   *     a known session or a promise that will be resolved to a session.
   * @param {!command.Executor} executor The executor to use when sending
   *     commands to the browser.
   * @param {(function(this: void): ?)=} onQuit A function to call, if any,
   *     when the session is terminated.
   */
  constructor(session, executor, onQuit = undefined) {
    /** @private {!Promise<!Session>} */
    this.session_ = Promise.resolve(session)

    // If session is a rejected promise, add a no-op rejection handler.
    // This effectively hides setup errors until users attempt to interact
    // with the session.
    this.session_.catch(function () {})

    /** @private {!command.Executor} */
    this.executor_ = executor

    /** @private {input.FileDetector} */
    this.fileDetector_ = null

    /** @private @const {(function(this: void): ?|undefined)} */
    this.onQuit_ = onQuit

    /** @private {./virtual_authenticator}*/
    this.authenticatorId_ = null

    this.pinnedScripts_ = {}
  }

  /**
   * Creates a new WebDriver session.
   *
   * This function will always return a WebDriver instance. If there is an error
   * creating the session, such as the aforementioned SessionNotCreatedError,
   * the driver will have a rejected {@linkplain #getSession session} promise.
   * This rejection will propagate through any subsequent commands scheduled
   * on the returned WebDriver instance.
   *
   *     let required = Capabilities.firefox();
   *     let driver = WebDriver.createSession(executor, {required});
   *
   *     // If the createSession operation failed, then this command will also
   *     // also fail, propagating the creation failure.
   *     driver.get('http://www.google.com').catch(e => console.log(e));
   *
   * @param {!command.Executor} executor The executor to create the new session
   *     with.
   * @param {!Capabilities} capabilities The desired capabilities for the new
   *     session.
   * @param {(function(this: void): ?)=} onQuit A callback to invoke when
   *    the newly created session is terminated. This should be used to clean
   *    up any resources associated with the session.
   * @return {!WebDriver} The driver for the newly created session.
   */
  static createSession(executor, capabilities, onQuit = undefined) {
    let cmd = new command.Command(command.Name.NEW_SESSION)

    // For W3C remote ends.
    cmd.setParameter('capabilities', {
      firstMatch: [{}],
      alwaysMatch: filterNonW3CCaps(capabilities),
    })

    let session = executeCommand(executor, cmd)
    if (typeof onQuit === 'function') {
      session = session.catch((err) => {
        return Promise.resolve(onQuit.call(void 0)).then((_) => {
          throw err
        })
      })
    }
    return new this(session, executor, onQuit)
  }

  /** @override */
  async execute(command) {
    command.setParameter('sessionId', this.session_)

    let parameters = await toWireValue(command.getParameters())
    command.setParameters(parameters)
    let value = await this.executor_.execute(command)
    return fromWireValue(this, value)
  }

  /** @override */
  setFileDetector(detector) {
    this.fileDetector_ = detector
  }

  /** @override */
  getExecutor() {
    return this.executor_
  }

  /** @override */
  getSession() {
    return this.session_
  }

  /** @override */
  getCapabilities() {
    return this.session_.then((s) => s.getCapabilities())
  }

  /** @override */
  quit() {
    let result = this.execute(new command.Command(command.Name.QUIT))
    // Delete our session ID when the quit command finishes; this will allow us
    // to throw an error when attempting to use a driver post-quit.
    return promise.finally(result, () => {
      this.session_ = Promise.reject(
        new error.NoSuchSessionError(
          'This driver instance does not have a valid session ID ' +
            '(did you call WebDriver.quit()?) and may no longer be used.',
        ),
      )

      // Only want the session rejection to bubble if accessed.
      this.session_.catch(function () {})

      if (this.onQuit_) {
        return this.onQuit_.call(void 0)
      }

      // Close the websocket connection on quit
      // If the websocket connection is not closed,
      // and we are running CDP sessions against the Selenium Grid,
      // the node process never exits since the websocket connection is open until the Grid is shutdown.
      if (this._cdpWsConnection !== undefined) {
        this._cdpWsConnection.close()
      }

      // Close the BiDi websocket connection
      if (this._bidiConnection !== undefined) {
        this._bidiConnection.close()
      }
    })
  }

  /** @override */
  actions(options) {
    return new input.Actions(this, options || undefined)
  }

  /** @override */
  executeScript(script, ...args) {
    if (typeof script === 'function') {
      script = 'return (' + script + ').apply(null, arguments);'
    }

    if (script && script instanceof PinnedScript) {
      return this.execute(
        new command.Command(command.Name.EXECUTE_SCRIPT)
          .setParameter('script', script.executionScript())
          .setParameter('args', args),
      )
    }

    return this.execute(
      new command.Command(command.Name.EXECUTE_SCRIPT).setParameter('script', script).setParameter('args', args),
    )
  }

  /** @override */
  executeAsyncScript(script, ...args) {
    if (typeof script === 'function') {
      script = 'return (' + script + ').apply(null, arguments);'
    }

    if (script && script instanceof PinnedScript) {
      return this.execute(
        new command.Command(command.Name.EXECUTE_ASYNC_SCRIPT)
          .setParameter('script', script.executionScript())
          .setParameter('args', args),
      )
    }

    return this.execute(
      new command.Command(command.Name.EXECUTE_ASYNC_SCRIPT).setParameter('script', script).setParameter('args', args),
    )
  }

  /** @override */
  wait(condition, timeout = 0, message = undefined, pollTimeout = 200) {
    if (typeof timeout !== 'number' || timeout < 0) {
      throw TypeError('timeout must be a number >= 0: ' + timeout)
    }

    if (typeof pollTimeout !== 'number' || pollTimeout < 0) {
      throw TypeError('pollTimeout must be a number >= 0: ' + pollTimeout)
    }

    if (promise.isPromise(condition)) {
      return new Promise((resolve, reject) => {
        if (!timeout) {
          resolve(condition)
          return
        }

        let start = Date.now()
        let timer = setTimeout(function () {
          timer = null
          try {
            let timeoutMessage = resolveWaitMessage(message)
            reject(
              new error.TimeoutError(
                `${timeoutMessage}Timed out waiting for promise to resolve after ${Date.now() - start}ms`,
              ),
            )
          } catch (ex) {
            reject(
              new error.TimeoutError(
                `${ex.message}\nTimed out waiting for promise to resolve after ${Date.now() - start}ms`,
              ),
            )
          }
        }, timeout)
        const clearTimer = () => timer && clearTimeout(timer)

        /** @type {!IThenable} */ condition.then(
          function (value) {
            clearTimer()
            resolve(value)
          },
          function (error) {
            clearTimer()
            reject(error)
          },
        )
      })
    }

    let fn = /** @type {!Function} */ (condition)
    if (condition instanceof Condition) {
      message = message || condition.description()
      fn = condition.fn
    }

    if (typeof fn !== 'function') {
      throw TypeError('Wait condition must be a promise-like object, function, or a ' + 'Condition object')
    }

    const driver = this

    function evaluateCondition() {
      return new Promise((resolve, reject) => {
        try {
          resolve(fn(driver))
        } catch (ex) {
          reject(ex)
        }
      })
    }

    let result = new Promise((resolve, reject) => {
      const startTime = Date.now()
      const pollCondition = async () => {
        evaluateCondition().then(function (value) {
          const elapsed = Date.now() - startTime
          if (value) {
            resolve(value)
          } else if (timeout && elapsed >= timeout) {
            try {
              let timeoutMessage = resolveWaitMessage(message)
              reject(new error.TimeoutError(`${timeoutMessage}Wait timed out after ${elapsed}ms`))
            } catch (ex) {
              reject(new error.TimeoutError(`${ex.message}\nWait timed out after ${elapsed}ms`))
            }
          } else {
            setTimeout(pollCondition, pollTimeout)
          }
        }, reject)
      }
      pollCondition()
    })

    if (condition instanceof WebElementCondition) {
      result = new WebElementPromise(
        this,
        result.then(function (value) {
          if (!(value instanceof WebElement)) {
            throw TypeError(
              'WebElementCondition did not resolve to a WebElement: ' + Object.prototype.toString.call(value),
            )
          }
          return value
        }),
      )
    }
    return result
  }

  /** @override */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /** @override */
  getWindowHandle() {
    return this.execute(new command.Command(command.Name.GET_CURRENT_WINDOW_HANDLE))
  }

  /** @override */
  getAllWindowHandles() {
    return this.execute(new command.Command(command.Name.GET_WINDOW_HANDLES))
  }

  /** @override */
  getPageSource() {
    return this.execute(new command.Command(command.Name.GET_PAGE_SOURCE))
  }

  /** @override */
  close() {
    return this.execute(new command.Command(command.Name.CLOSE))
  }

  /** @override */
  get(url) {
    return this.navigate().to(url)
  }

  /** @override */
  getCurrentUrl() {
    return this.execute(new command.Command(command.Name.GET_CURRENT_URL))
  }

  /** @override */
  getTitle() {
    return this.execute(new command.Command(command.Name.GET_TITLE))
  }

  /** @override */
  findElement(locator) {
    let id
    let cmd = null

    if (locator instanceof RelativeBy) {
      cmd = new command.Command(command.Name.FIND_ELEMENTS_RELATIVE).setParameter('args', locator.marshall())
    } else {
      locator = by.checkedLocator(locator)
    }

    if (typeof locator === 'function') {
      id = this.findElementInternal_(locator, this)
      return new WebElementPromise(this, id)
    } else if (cmd === null) {
      cmd = new command.Command(command.Name.FIND_ELEMENT)
        .setParameter('using', locator.using)
        .setParameter('value', locator.value)
    }

    id = this.execute(cmd)
    if (locator instanceof RelativeBy) {
      return this.normalize_(id)
    } else {
      return new WebElementPromise(this, id)
    }
  }

  /**
   * @param {!Function} webElementPromise The webElement in unresolved state
   * @return {!Promise<!WebElement>} First single WebElement from array of resolved promises
   */
  async normalize_(webElementPromise) {
    let result = await webElementPromise
    if (result.length === 0) {
      throw new NoSuchElementError('Cannot locate an element with provided parameters')
    } else {
      return result[0]
    }
  }

  /**
   * @param {!Function} locatorFn The locator function to use.
   * @param {!(WebDriver|WebElement)} context The search context.
   * @return {!Promise<!WebElement>} A promise that will resolve to a list of
   *     WebElements.
   * @private
   */
  async findElementInternal_(locatorFn, context) {
    let result = await locatorFn(context)
    if (Array.isArray(result)) {
      result = result[0]
    }
    if (!(result instanceof WebElement)) {
      throw new TypeError('Custom locator did not return a WebElement')
    }
    return result
  }

  /** @override */
  async findElements(locator) {
    let cmd = null
    if (locator instanceof RelativeBy) {
      cmd = new command.Command(command.Name.FIND_ELEMENTS_RELATIVE).setParameter('args', locator.marshall())
    } else {
      locator = by.checkedLocator(locator)
    }

    if (typeof locator === 'function') {
      return this.findElementsInternal_(locator, this)
    } else if (cmd === null) {
      cmd = new command.Command(command.Name.FIND_ELEMENTS)
        .setParameter('using', locator.using)
        .setParameter('value', locator.value)
    }
    try {
      let res = await this.execute(cmd)
      return Array.isArray(res) ? res : []
    } catch (ex) {
      if (ex instanceof error.NoSuchElementError) {
        return []
      }
      throw ex
    }
  }

  /**
   * @param {!Function} locatorFn The locator function to use.
   * @param {!(WebDriver|WebElement)} context The search context.
   * @return {!Promise<!Array<!WebElement>>} A promise that will resolve to an
   *     array of WebElements.
   * @private
   */
  async findElementsInternal_(locatorFn, context) {
    const result = await locatorFn(context)
    if (result instanceof WebElement) {
      return [result]
    }

    if (!Array.isArray(result)) {
      return []
    }

    return result.filter(function (item) {
      return item instanceof WebElement
    })
  }

  /** @override */
  takeScreenshot() {
    return this.execute(new command.Command(command.Name.SCREENSHOT))
  }

  setDelayEnabled(enabled) {
    return this.execute(new command.Command(command.Name.SET_DELAY_ENABLED).setParameter('enabled', enabled))
  }

  resetCooldown() {
    return this.execute(new command.Command(command.Name.RESET_COOLDOWN))
  }

  getFederalCredentialManagementDialog() {
    return new Dialog(this)
  }

  /** @override */
  manage() {
    return new Options(this)
  }

  /** @override */
  navigate() {
    return new Navigation(this)
  }

  /** @override */
  switchTo() {
    return new TargetLocator(this)
  }

  script() {
    // The Script calls the LogInspector which maintains state of the callbacks.
    // Returning a new instance of the same driver will not work while removing callbacks.
    if (this.#script === undefined) {
      this.#script = new Script(this)
    }

    return this.#script
  }

  network() {
    // The Network maintains state of the callbacks.
    // Returning a new instance of the same driver will not work while removing callbacks.
    if (this.#network === undefined) {
      this.#network = new Network(this)
    }

    return this.#network
  }

  validatePrintPageParams(keys, object) {
    let page = {}
    let margin = {}
    let data
    Object.keys(keys).forEach(function (key) {
      data = keys[key]
      let obj = {
        orientation: function () {
          object.orientation = data
        },

        scale: function () {
          object.scale = data
        },

        background: function () {
          object.background = data
        },

        width: function () {
          page.width = data
          object.page = page
        },

        height: function () {
          page.height = data
          object.page = page
        },

        top: function () {
          margin.top = data
          object.margin = margin
        },

        left: function () {
          margin.left = data
          object.margin = margin
        },

        bottom: function () {
          margin.bottom = data
          object.margin = margin
        },

        right: function () {
          margin.right = data
          object.margin = margin
        },

        shrinkToFit: function () {
          object.shrinkToFit = data
        },

        pageRanges: function () {
          object.pageRanges = data
        },
      }

      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        throw new error.InvalidArgumentError(`Invalid Argument '${key}'`)
      } else {
        obj[key]()
      }
    })

    return object
  }

  /** @override */
  printPage(options = {}) {
    let keys = options
    let params = {}
    let resultObj

    let self = this
    resultObj = self.validatePrintPageParams(keys, params)

    return this.execute(new command.Command(command.Name.PRINT_PAGE).setParameters(resultObj))
  }

  /**
   * Creates a new WebSocket connection.
   * @return {!Promise<resolved>} A new CDP instance.
   */
  async createCDPConnection(target) {
    let debuggerUrl = null

    const caps = await this.getCapabilities()

    if (caps['map_'].get('browserName') === 'firefox') {
      throw new Error('CDP support for Firefox is removed. Please switch to WebDriver BiDi.')
    }

    if (process.env.SELENIUM_REMOTE_URL) {
      const host = new URL(process.env.SELENIUM_REMOTE_URL).host
      const sessionId = await this.getSession().then((session) => session.getId())
      debuggerUrl = `ws://${host}/session/${sessionId}/se/cdp`
    } else {
      const seCdp = caps['map_'].get('se:cdp')
      const vendorInfo = caps['map_'].get('goog:chromeOptions') || caps['map_'].get('ms:edgeOptions') || new Map()
      debuggerUrl = seCdp || vendorInfo['debuggerAddress'] || vendorInfo
    }
    this._wsUrl = await this.getWsUrl(debuggerUrl, target, caps)
    return new Promise((resolve, reject) => {
      try {
        this._cdpWsConnection = new WebSocket(this._wsUrl.replace('localhost', '127.0.0.1'))
        this._cdpConnection = new cdp.CdpConnection(this._cdpWsConnection)
      } catch (err) {
        reject(err)
        return
      }

      this._cdpWsConnection.on('open', async () => {
        await this.getCdpTargets()
      })

      this._cdpWsConnection.on('message', async (message) => {
        const params = JSON.parse(message)
        if (params.result) {
          if (params.result.targetInfos) {
            const targets = params.result.targetInfos
            const page = targets.find((info) => info.type === 'page')
            if (page) {
              this.targetID = page.targetId
              this._cdpConnection.execute('Target.attachToTarget', { targetId: this.targetID, flatten: true }, null)
            } else {
              reject('Unable to find Page target.')
            }
          }
          if (params.result.sessionId) {
            this.sessionId = params.result.sessionId
            this._cdpConnection.sessionId = this.sessionId
            resolve(this._cdpConnection)
          }
        }
      })

      this._cdpWsConnection.on('error', (error) => {
        reject(error)
      })
    })
  }

  async getCdpTargets() {
    this._cdpConnection.execute('Target.getTargets')
  }

  /**
   * Initiates bidi connection using 'webSocketUrl'
   * @returns {BIDI}
   */
  async getBidi() {
    if (this._bidiConnection === undefined) {
      const caps = await this.getCapabilities()
      let WebSocketUrl = caps['map_'].get('webSocketUrl')
      this._bidiConnection = new BIDI(WebSocketUrl.replace('localhost', '127.0.0.1'))
    }
    return this._bidiConnection
  }

  /**
   * Retrieves 'webSocketDebuggerUrl' by sending a http request using debugger address
   * @param {string} debuggerAddress
   * @param target
   * @param caps
   * @return {string} Returns parsed webSocketDebuggerUrl obtained from the http request
   */
  async getWsUrl(debuggerAddress, target, caps) {
    if (target && cdpTargets.indexOf(target.toLowerCase()) === -1) {
      throw new error.InvalidArgumentError('invalid target value')
    }

    if (debuggerAddress.match(/\/se\/cdp/)) {
      return debuggerAddress
    }

    let path
    if (target === 'page' && caps['map_'].get('browserName') !== 'firefox') {
      path = '/json'
    } else if (target === 'page' && caps['map_'].get('browserName') === 'firefox') {
      path = '/json/list'
    } else {
      path = '/json/version'
    }

    let request = new http.Request('GET', path)
    let client = new http.HttpClient('http://' + debuggerAddress)
    let response = await client.send(request)

    if (target.toLowerCase() === 'page') {
      return JSON.parse(response.body)[0]['webSocketDebuggerUrl']
    } else {
      return JSON.parse(response.body)['webSocketDebuggerUrl']
    }
  }

  /**
   * Sets a listener for Fetch.authRequired event from CDP
   * If event is triggered, it enters username and password
   * and allows the test to move forward
   * @param {string} username
   * @param {string} password
   * @param connection CDP Connection
   */
  async register(username, password, connection) {
    this._cdpWsConnection.on('message', (message) => {
      const params = JSON.parse(message)

      if (params.method === 'Fetch.authRequired') {
        const requestParams = params['params']
        connection.execute('Fetch.continueWithAuth', {
          requestId: requestParams['requestId'],
          authChallengeResponse: {
            response: 'ProvideCredentials',
            username: username,
            password: password,
          },
        })
      } else if (params.method === 'Fetch.requestPaused') {
        const requestPausedParams = params['params']
        connection.execute('Fetch.continueRequest', {
          requestId: requestPausedParams['requestId'],
        })
      }
    })

    await connection.execute(
      'Fetch.enable',
      {
        handleAuthRequests: true,
      },
      null,
    )
    await connection.execute(
      'Network.setCacheDisabled',
      {
        cacheDisabled: true,
      },
      null,
    )
  }

  /**
   * Handle Network interception requests
   * @param connection WebSocket connection to the browser
   * @param httpResponse Object representing what we are intercepting
   *                     as well as what should be returned.
   * @param callback callback called when we intercept requests.
   */
  async onIntercept(connection, httpResponse, callback) {
    this._cdpWsConnection.on('message', (message) => {
      const params = JSON.parse(message)
      if (params.method === 'Fetch.requestPaused') {
        const requestPausedParams = params['params']
        if (requestPausedParams.request.url == httpResponse.urlToIntercept) {
          connection.execute('Fetch.fulfillRequest', {
            requestId: requestPausedParams['requestId'],
            responseCode: httpResponse.status,
            responseHeaders: httpResponse.headers,
            body: httpResponse.body,
          })
          callback()
        } else {
          connection.execute('Fetch.continueRequest', {
            requestId: requestPausedParams['requestId'],
          })
        }
      }
    })

    await connection.execute('Fetch.enable', {}, null)
    await connection.execute(
      'Network.setCacheDisabled',
      {
        cacheDisabled: true,
      },
      null,
    )
  }

  /**
   *
   * @param connection
   * @param callback
   * @returns {Promise<void>}
   */
  async onLogEvent(connection, callback) {
    this._cdpWsConnection.on('message', (message) => {
      const params = JSON.parse(message)
      if (params.method === 'Runtime.consoleAPICalled') {
        const consoleEventParams = params['params']
        let event = {
          type: consoleEventParams['type'],
          timestamp: new Date(consoleEventParams['timestamp']),
          args: consoleEventParams['args'],
        }

        callback(event)
      }

      if (params.method === 'Log.entryAdded') {
        const logEventParams = params['params']
        const logEntry = logEventParams['entry']
        let event = {
          level: logEntry['level'],
          timestamp: new Date(logEntry['timestamp']),
          message: logEntry['text'],
        }

        callback(event)
      }
    })
    await connection.execute('Runtime.enable', {}, null)
  }

  /**
   *
   * @param connection
   * @param callback
   * @returns {Promise<void>}
   */
  async onLogException(connection, callback) {
    await connection.execute('Runtime.enable', {}, null)

    this._cdpWsConnection.on('message', (message) => {
      const params = JSON.parse(message)

      if (params.method === 'Runtime.exceptionThrown') {
        const exceptionEventParams = params['params']
        let event = {
          exceptionDetails: exceptionEventParams['exceptionDetails'],
          timestamp: new Date(exceptionEventParams['timestamp']),
        }

        callback(event)
      }
    })
  }

  /**
   * @param connection
   * @param callback
   * @returns {Promise<void>}
   */
  async logMutationEvents(connection, callback) {
    await connection.execute('Runtime.enable', {}, null)
    await connection.execute('Page.enable', {}, null)

    await connection.execute(
      'Runtime.addBinding',
      {
        name: '__webdriver_attribute',
      },
      null,
    )

    let mutationListener = ''
    try {
      // Depending on what is running the code it could appear in 2 different places which is why we try
      // here and then the other location
      mutationListener = fs
        .readFileSync('./javascript/selenium-webdriver/lib/atoms/mutation-listener.js', 'utf-8')
        .toString()
    } catch {
      mutationListener = fs.readFileSync(path.resolve(__dirname, './atoms/mutation-listener.js'), 'utf-8').toString()
    }

    this.executeScript(mutationListener)

    await connection.execute(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: mutationListener,
      },
      null,
    )

    this._cdpWsConnection.on('message', async (message) => {
      const params = JSON.parse(message)
      if (params.method === 'Runtime.bindingCalled') {
        let payload = JSON.parse(params['params']['payload'])
        let elements = await this.findElements({
          css: '*[data-__webdriver_id=' + by.escapeCss(payload['target']) + ']',
        })

        if (elements.length === 0) {
          return
        }

        let event = {
          element: elements[0],
          attribute_name: payload['name'],
          current_value: payload['value'],
          old_value: payload['oldValue'],
        }
        callback(event)
      }
    })
  }

  async pinScript(script) {
    let pinnedScript = new PinnedScript(script)
    let connection
    if (Object.is(this._cdpConnection, undefined)) {
      connection = await this.createCDPConnection('page')
    } else {
      connection = this._cdpConnection
    }

    await connection.execute('Page.enable', {}, null)

    await connection.execute(
      'Runtime.evaluate',
      {
        expression: pinnedScript.creationScript(),
      },
      null,
    )

    let result = await connection.send('Page.addScriptToEvaluateOnNewDocument', {
      source: pinnedScript.creationScript(),
    })

    pinnedScript.scriptId = result['result']['identifier']

    this.pinnedScripts_[pinnedScript.handle] = pinnedScript

    return pinnedScript
  }

  async unpinScript(script) {
    if (script && !(script instanceof PinnedScript)) {
      throw Error(`Pass valid PinnedScript object. Received: ${script}`)
    }

    if (script.handle in this.pinnedScripts_) {
      let connection
      if (Object.is(this._cdpConnection, undefined)) {
        connection = this.createCDPConnection('page')
      } else {
        connection = this._cdpConnection
      }

      await connection.execute('Page.enable', {}, null)

      await connection.execute(
        'Runtime.evaluate',
        {
          expression: script.removalScript(),
        },
        null,
      )

      await connection.execute(
        'Page.removeScriptToEvaluateOnLoad',
        {
          identifier: script.scriptId,
        },
        null,
      )

      delete this.pinnedScripts_[script.handle]
    }
  }

  /**
   *
   * @returns The value of authenticator ID added
   */
  virtualAuthenticatorId() {
    return this.authenticatorId_
  }

  /**
   * Adds a virtual authenticator with the given options.
   * @param options VirtualAuthenticatorOptions object to set authenticator options.
   */
  async addVirtualAuthenticator(options) {
    this.authenticatorId_ = await this.execute(
      new command.Command(command.Name.ADD_VIRTUAL_AUTHENTICATOR).setParameters(options.toDict()),
    )
  }

  /**
   * Removes a previously added virtual authenticator. The authenticator is no
   * longer valid after removal, so no methods may be called.
   */
  async removeVirtualAuthenticator() {
    await this.execute(
      new command.Command(command.Name.REMOVE_VIRTUAL_AUTHENTICATOR).setParameter(
        'authenticatorId',
        this.authenticatorId_,
      ),
    )
    this.authenticatorId_ = null
  }

  /**
   * Injects a credential into the authenticator.
   * @param credential Credential to be added
   */
  async addCredential(credential) {
    credential = credential.toDict()
    credential['authenticatorId'] = this.authenticatorId_
    await this.execute(new command.Command(command.Name.ADD_CREDENTIAL).setParameters(credential))
  }

  /**
   *
   * @returns The list of credentials owned by the authenticator.
   */
  async getCredentials() {
    let credential_data = await this.execute(
      new command.Command(command.Name.GET_CREDENTIALS).setParameter('authenticatorId', this.virtualAuthenticatorId()),
    )
    var credential_list = []
    for (var i = 0; i < credential_data.length; i++) {
      credential_list.push(new Credential().fromDict(credential_data[i]))
    }
    return credential_list
  }

  /**
   * Removes a credential from the authenticator.
   * @param credential_id The ID of the credential to be removed.
   */
  async removeCredential(credential_id) {
    // If credential_id is not a base64url, then convert it to base64url.
    if (Array.isArray(credential_id)) {
      credential_id = Buffer.from(credential_id).toString('base64url')
    }

    await this.execute(
      new command.Command(command.Name.REMOVE_CREDENTIAL)
        .setParameter('credentialId', credential_id)
        .setParameter('authenticatorId', this.authenticatorId_),
    )
  }

  /**
   * Removes all the credentials from the authenticator.
   */
  async removeAllCredentials() {
    await this.execute(
      new command.Command(command.Name.REMOVE_ALL_CREDENTIALS).setParameter('authenticatorId', this.authenticatorId_),
    )
  }

  /**
   * Sets whether the authenticator will simulate success or fail on user verification.
   * @param verified true if the authenticator will pass user verification, false otherwise.
   */
  async setUserVerified(verified) {
    await this.execute(
      new command.Command(command.Name.SET_USER_VERIFIED)
        .setParameter('authenticatorId', this.authenticatorId_)
        .setParameter('isUserVerified', verified),
    )
  }

  async getDownloadableFiles() {
    const caps = await this.getCapabilities()
    if (!caps['map_'].get('se:downloadsEnabled')) {
      throw new error.WebDriverError('Downloads must be enabled in options')
    }

    return (await this.execute(new command.Command(command.Name.GET_DOWNLOADABLE_FILES))).names
  }

  async downloadFile(fileName, targetDirectory) {
    const caps = await this.getCapabilities()
    if (!caps['map_'].get('se:downloadsEnabled')) {
      throw new Error('Downloads must be enabled in options')
    }

    const response = await this.execute(new command.Command(command.Name.DOWNLOAD_FILE).setParameter('name', fileName))

    const base64Content = response.contents

    if (!targetDirectory.endsWith('/')) {
      targetDirectory += '/'
    }

    fs.mkdirSync(targetDirectory, { recursive: true })
    const zipFilePath = path.join(targetDirectory, `${fileName}.zip`)
    fs.writeFileSync(zipFilePath, Buffer.from(base64Content, 'base64'))

    const zipData = fs.readFileSync(zipFilePath)
    await JSZip.loadAsync(zipData)
      .then((zip) => {
        // Iterate through each file in the zip archive
        Object.keys(zip.files).forEach(async (fileName) => {
          const fileData = await zip.files[fileName].async('nodebuffer')
          fs.writeFileSync(`${targetDirectory}/${fileName}`, fileData)
          console.log(`File extracted: ${fileName}`)
        })
      })
      .catch((error) => {
        console.error('Error unzipping file:', error)
      })
  }

  async deleteDownloadableFiles() {
    const caps = await this.getCapabilities()
    if (!caps['map_'].get('se:downloadsEnabled')) {
      throw new error.WebDriverError('Downloads must be enabled in options')
    }

    return await this.execute(new command.Command(command.Name.DELETE_DOWNLOADABLE_FILES))
  }
}

/**
 * Interface for navigating back and forth in the browser history.
 *
 * This class should never be instantiated directly. Instead, obtain an instance
 * with
 *
 *    webdriver.navigate()
 *
 * @see WebDriver#navigate()
 */
class Navigation {
  /**
   * @param {!WebDriver} driver The parent driver.
   * @private
   */
  constructor(driver) {
    /** @private {!WebDriver} */
    this.driver_ = driver
  }

  /**
   * Navigates to a new URL.
   *
   * @param {string} url The URL to navigate to.
   * @return {!Promise<void>} A promise that will be resolved when the URL
   *     has been loaded.
   */
  to(url) {
    return this.driver_.execute(new command.Command(command.Name.GET).setParameter('url', url))
  }

  /**
   * Moves backwards in the browser history.
   *
   * @return {!Promise<void>} A promise that will be resolved when the
   *     navigation event has completed.
   */
  back() {
    return this.driver_.execute(new command.Command(command.Name.GO_BACK))
  }

  /**
   * Moves forwards in the browser history.
   *
   * @return {!Promise<void>} A promise that will be resolved when the
   *     navigation event has completed.
   */
  forward() {
    return this.driver_.execute(new command.Command(command.Name.GO_FORWARD))
  }

  /**
   * Refreshes the current page.
   *
   * @return {!Promise<void>} A promise that will be resolved when the
   *     navigation event has completed.
   */
  refresh() {
    return this.driver_.execute(new command.Command(command.Name.REFRESH))
  }
}

/**
 * Provides methods for managing browser and driver state.
 *
 * This class should never be instantiated directly. Instead, obtain an instance
 * with {@linkplain WebDriver#manage() webdriver.manage()}.
 */
class Options {
  /**
   * @param {!WebDriver} driver The parent driver.
   * @private
   */
  constructor(driver) {
    /** @private {!WebDriver} */
    this.driver_ = driver
  }

  /**
   * Adds a cookie.
   *
   * __Sample Usage:__
   *
   *     // Set a basic cookie.
   *     driver.manage().addCookie({name: 'foo', value: 'bar'});
   *
   *     // Set a cookie that expires in 10 minutes.
   *     let expiry = new Date(Date.now() + (10 * 60 * 1000));
   *     driver.manage().addCookie({name: 'foo', value: 'bar', expiry});
   *
   *     // The cookie expiration may also be specified in seconds since epoch.
   *     driver.manage().addCookie({
   *       name: 'foo',
   *       value: 'bar',
   *       expiry: Math.floor(Date.now() / 1000)
   *     });
   *
   * @param {!Options.Cookie} spec Defines the cookie to add.
   * @return {!Promise<void>} A promise that will be resolved
   *     when the cookie has been added to the page.
   * @throws {error.InvalidArgumentError} if any of the cookie parameters are
   *     invalid.
   * @throws {TypeError} if `spec` is not a cookie object.
   */
  addCookie({ name, value, path, domain, secure, httpOnly, expiry, sameSite }) {
    // We do not allow '=' or ';' in the name.
    if (/[;=]/.test(name)) {
      throw new error.InvalidArgumentError('Invalid cookie name "' + name + '"')
    }

    // We do not allow ';' in value.
    if (/;/.test(value)) {
      throw new error.InvalidArgumentError('Invalid cookie value "' + value + '"')
    }

    if (typeof expiry === 'number') {
      expiry = Math.floor(expiry)
    } else if (expiry instanceof Date) {
      let date = /** @type {!Date} */ (expiry)
      expiry = Math.floor(date.getTime() / 1000)
    }

    if (sameSite && !['Strict', 'Lax', 'None'].includes(sameSite)) {
      throw new error.InvalidArgumentError(
        `Invalid sameSite cookie value '${sameSite}'. It should be one of "Lax", "Strict" or "None"`,
      )
    }

    if (sameSite === 'None' && !secure) {
      throw new error.InvalidArgumentError('Invalid cookie configuration: SameSite=None must be Secure')
    }

    return this.driver_.execute(
      new command.Command(command.Name.ADD_COOKIE).setParameter('cookie', {
        name: name,
        value: value,
        path: path,
        domain: domain,
        secure: !!secure,
        httpOnly: !!httpOnly,
        expiry: expiry,
        sameSite: sameSite,
      }),
    )
  }

  /**
   * Deletes all cookies visible to the current page.
   *
   * @return {!Promise<void>} A promise that will be resolved
   *     when all cookies have been deleted.
   */
  deleteAllCookies() {
    return this.driver_.execute(new command.Command(command.Name.DELETE_ALL_COOKIES))
  }

  /**
   * Deletes the cookie with the given name. This command is a no-op if there is
   * no cookie with the given name visible to the current page.
   *
   * @param {string} name The name of the cookie to delete.
   * @return {!Promise<void>} A promise that will be resolved
   *     when the cookie has been deleted.
   */
  deleteCookie(name) {
    // Validate the cookie name is non-empty and properly trimmed.
    if (!name?.trim()) {
      throw new error.InvalidArgumentError('Cookie name cannot be empty')
    }

    return this.driver_.execute(new command.Command(command.Name.DELETE_COOKIE).setParameter('name', name))
  }

  /**
   * Retrieves all cookies visible to the current page. Each cookie will be
   * returned as a JSON object as described by the WebDriver wire protocol.
   *
   * @return {!Promise<!Array<!Options.Cookie>>} A promise that will be
   *     resolved with the cookies visible to the current browsing context.
   */
  getCookies() {
    return this.driver_.execute(new command.Command(command.Name.GET_ALL_COOKIES))
  }

  /**
   * Retrieves the cookie with the given name. Returns null if there is no such
   * cookie. The cookie will be returned as a JSON object as described by the
   * WebDriver wire protocol.
   *
   * @param {string} name The name of the cookie to retrieve.
   * @throws {InvalidArgumentError} - If the cookie name is empty or invalid.
   * @return {!Promise<?Options.Cookie>} A promise that will be resolved
   *     with the named cookie
   * @throws {error.NoSuchCookieError} if there is no such cookie.
   */
  async getCookie(name) {
    // Validate the cookie name is non-empty and properly trimmed.
    if (!name?.trim()) {
      throw new error.InvalidArgumentError('Cookie name cannot be empty')
    }

    try {
      const cookie = await this.driver_.execute(new command.Command(command.Name.GET_COOKIE).setParameter('name', name))
      return cookie
    } catch (err) {
      if (!(err instanceof error.UnknownCommandError) && !(err instanceof error.UnsupportedOperationError)) {
        throw err
      }
      return null
    }
  }

  /**
   * Fetches the timeouts currently configured for the current session.
   *
   * @return {!Promise<{script: number,
   *                             pageLoad: number,
   *                             implicit: number}>} A promise that will be
   *     resolved with the timeouts currently configured for the current
   *     session.
   * @see #setTimeouts()
   */
  getTimeouts() {
    return this.driver_.execute(new command.Command(command.Name.GET_TIMEOUT))
  }

  /**
   * Sets the timeout durations associated with the current session.
   *
   * The following timeouts are supported (all timeouts are specified in
   * milliseconds):
   *
   * -  `implicit` specifies the maximum amount of time to wait for an element
   *    locator to succeed when {@linkplain WebDriver#findElement locating}
   *    {@linkplain WebDriver#findElements elements} on the page.
   *    Defaults to 0 milliseconds.
   *
   * -  `pageLoad` specifies the maximum amount of time to wait for a page to
   *    finishing loading. Defaults to 300000 milliseconds.
   *
   * -  `script` specifies the maximum amount of time to wait for an
   *    {@linkplain WebDriver#executeScript evaluated script} to run. If set to
   *    `null`, the script timeout will be indefinite.
   *    Defaults to 30000 milliseconds.
   *
   * @param {{script: (number|null|undefined),
   *          pageLoad: (number|null|undefined),
   *          implicit: (number|null|undefined)}} conf
   *     The desired timeout configuration.
   * @return {!Promise<void>} A promise that will be resolved when the timeouts
   *     have been set.
   * @throws {!TypeError} if an invalid options object is provided.
   * @see #getTimeouts()
   * @see <https://w3c.github.io/webdriver/webdriver-spec.html#dfn-set-timeouts>
   */
  setTimeouts({ script, pageLoad, implicit } = {}) {
    let cmd = new command.Command(command.Name.SET_TIMEOUT)

    let valid = false

    function setParam(key, value) {
      if (value === null || typeof value === 'number') {
        valid = true
        cmd.setParameter(key, value)
      } else if (typeof value !== 'undefined') {
        throw TypeError('invalid timeouts configuration:' + ` expected "${key}" to be a number, got ${typeof value}`)
      }
    }

    setParam('implicit', implicit)
    setParam('pageLoad', pageLoad)
    setParam('script', script)

    if (valid) {
      return this.driver_.execute(cmd).catch(() => {
        // Fallback to the legacy method.
        let cmds = []
        if (typeof script === 'number') {
          cmds.push(legacyTimeout(this.driver_, 'script', script))
        }
        if (typeof implicit === 'number') {
          cmds.push(legacyTimeout(this.driver_, 'implicit', implicit))
        }
        if (typeof pageLoad === 'number') {
          cmds.push(legacyTimeout(this.driver_, 'page load', pageLoad))
        }
        return Promise.all(cmds)
      })
    }
    throw TypeError('no timeouts specified')
  }

  /**
   * @return {!Logs} The interface for managing driver logs.
   */
  logs() {
    return new Logs(this.driver_)
  }

  /**
   * @return {!Window} The interface for managing the current window.
   */
  window() {
    return new Window(this.driver_)
  }
}

/**
 * @param {!WebDriver} driver
 * @param {string} type
 * @param {number} ms
 * @return {!Promise<void>}
 */
function legacyTimeout(driver, type, ms) {
  return driver.execute(new command.Command(command.Name.SET_TIMEOUT).setParameter('type', type).setParameter('ms', ms))
}

/**
 * A record object describing a browser cookie.
 *
 * @record
 */
Options.Cookie = function () {}

/**
 * The name of the cookie.
 *
 * @type {string}
 */
Options.Cookie.prototype.name

/**
 * The cookie value.
 *
 * @type {string}
 */
Options.Cookie.prototype.value

/**
 * The cookie path. Defaults to "/" when adding a cookie.
 *
 * @type {(string|undefined)}
 */
Options.Cookie.prototype.path

/**
 * The domain the cookie is visible to. Defaults to the current browsing
 * context's document's URL when adding a cookie.
 *
 * @type {(string|undefined)}
 */
Options.Cookie.prototype.domain

/**
 * Whether the cookie is a secure cookie. Defaults to false when adding a new
 * cookie.
 *
 * @type {(boolean|undefined)}
 */
Options.Cookie.prototype.secure

/**
 * Whether the cookie is an HTTP only cookie. Defaults to false when adding a
 * new cookie.
 *
 * @type {(boolean|undefined)}
 */
Options.Cookie.prototype.httpOnly

/**
 * When the cookie expires.
 *
 * When {@linkplain Options#addCookie() adding a cookie}, this may be specified
 * as a {@link Date} object, or in _seconds_ since Unix epoch (January 1, 1970).
 *
 * The expiry is always returned in seconds since epoch when
 * {@linkplain Options#getCookies() retrieving cookies} from the browser.
 *
 * @type {(!Date|number|undefined)}
 */
Options.Cookie.prototype.expiry

/**
 * When the cookie applies to a SameSite policy.
 *
 * When {@linkplain Options#addCookie() adding a cookie}, this may be specified
 * as a {@link string} object which is one of 'Lax', 'Strict' or 'None'.
 *
 *
 * @type {(string|undefined)}
 */
Options.Cookie.prototype.sameSite

/**
 * An interface for managing the current window.
 *
 * This class should never be instantiated directly. Instead, obtain an instance
 * with
 *
 *    webdriver.manage().window()
 *
 * @see WebDriver#manage()
 * @see Options#window()
 */
class Window {
  /**
   * @param {!WebDriver} driver The parent driver.
   * @private
   */
  constructor(driver) {
    /** @private {!WebDriver} */
    this.driver_ = driver
    /** @private {!Logger} */
    this.log_ = logging.getLogger(logging.Type.DRIVER)
  }

  /**
   * Retrieves a rect describing the current top-level window's size and
   * position.
   *
   * @return {!Promise<{x: number, y: number, width: number, height: number}>}
   *     A promise that will resolve to the window rect of the current window.
   */
  getRect() {
    return this.driver_.execute(new command.Command(command.Name.GET_WINDOW_RECT))
  }

  /**
   * Sets the current top-level window's size and position. You may update just
   * the size by omitting `x` & `y`, or just the position by omitting
   * `width` & `height` options.
   *
   * @param {{x: (number|undefined),
   *          y: (number|undefined),
   *          width: (number|undefined),
   *          height: (number|undefined)}} options
   *     The desired window size and position.
   * @return {!Promise<{x: number, y: number, width: number, height: number}>}
   *     A promise that will resolve to the current window's updated window
   *     rect.
   */
  setRect({ x, y, width, height }) {
    return this.driver_.execute(
      new command.Command(command.Name.SET_WINDOW_RECT).setParameters({
        x,
        y,
        width,
        height,
      }),
    )
  }

  /**
   * Maximizes the current window. The exact behavior of this command is
   * specific to individual window managers, but typically involves increasing
   * the window to the maximum available size without going full-screen.
   *
   * @return {!Promise<void>} A promise that will be resolved when the command
   *     has completed.
   */
  maximize() {
    return this.driver_.execute(
      new command.Command(command.Name.MAXIMIZE_WINDOW).setParameter('windowHandle', 'current'),
    )
  }

  /**
   * Minimizes the current window. The exact behavior of this command is
   * specific to individual window managers, but typically involves hiding
   * the window in the system tray.
   *
   * @return {!Promise<void>} A promise that will be resolved when the command
   *     has completed.
   */
  minimize() {
    return this.driver_.execute(new command.Command(command.Name.MINIMIZE_WINDOW))
  }

  /**
   * Invokes the "full screen" operation on the current window. The exact
   * behavior of this command is specific to individual window managers, but
   * this will typically increase the window size to the size of the physical
   * display and hide the browser chrome.
   *
   * @return {!Promise<void>} A promise that will be resolved when the command
   *     has completed.
   * @see <https://fullscreen.spec.whatwg.org/#fullscreen-an-element>
   */
  fullscreen() {
    return this.driver_.execute(new command.Command(command.Name.FULLSCREEN_WINDOW))
  }

  /**
   * Gets the width and height of the current window
   * @param windowHandle
   * @returns {Promise<{width: *, height: *}>}
   */
  async getSize(windowHandle = 'current') {
    if (windowHandle !== 'current') {
      this.log_.warning(`Only 'current' window is supported for W3C compatible browsers.`)
    }

    const rect = await this.getRect()
    return { height: rect.height, width: rect.width }
  }

  /**
   * Sets the width and height of the current window. (window.resizeTo)
   * @param x
   * @param y
   * @param width
   * @param height
   * @param windowHandle
   * @returns {Promise<void>}
   */
  async setSize({ x = 0, y = 0, width = 0, height = 0 }, windowHandle = 'current') {
    if (windowHandle !== 'current') {
      this.log_.warning(`Only 'current' window is supported for W3C compatible browsers.`)
    }

    await this.setRect({ x, y, width, height })
  }
}

/**
 * Interface for managing WebDriver log records.
 *
 * This class should never be instantiated directly. Instead, obtain an
 * instance with
 *
 *     webdriver.manage().logs()
 *
 * @see WebDriver#manage()
 * @see Options#logs()
 */
class Logs {
  /**
   * @param {!WebDriver} driver The parent driver.
   * @private
   */
  constructor(driver) {
    /** @private {!WebDriver} */
    this.driver_ = driver
  }

  /**
   * Fetches available log entries for the given type.
   *
   * Note that log buffers are reset after each call, meaning that available
   * log entries correspond to those entries not yet returned for a given log
   * type. In practice, this means that this call will return the available log
   * entries since the last call, or from the start of the session.
   *
   * @param {!logging.Type} type The desired log type.
   * @return {!Promise<!Array.<!logging.Entry>>} A
   *   promise that will resolve to a list of log entries for the specified
   *   type.
   */
  get(type) {
    let cmd = new command.Command(command.Name.GET_LOG).setParameter('type', type)
    return this.driver_.execute(cmd).then(function (entries) {
      return entries.map(function (entry) {
        if (!(entry instanceof logging.Entry)) {
          return new logging.Entry(entry['level'], entry['message'], entry['timestamp'], entry['type'])
        }
        return entry
      })
    })
  }

  /**
   * Retrieves the log types available to this driver.
   * @return {!Promise<!Array<!logging.Type>>} A
   *     promise that will resolve to a list of available log types.
   */
  getAvailableLogTypes() {
    return this.driver_.execute(new command.Command(command.Name.GET_AVAILABLE_LOG_TYPES))
  }
}

/**
 * An interface for changing the focus of the driver to another frame or window.
 *
 * This class should never be instantiated directly. Instead, obtain an
 * instance with
 *
 *     webdriver.switchTo()
 *
 * @see WebDriver#switchTo()
 */
class TargetLocator {
  /**
   * @param {!WebDriver} driver The parent driver.
   * @private
   */
  constructor(driver) {
    /** @private {!WebDriver} */
    this.driver_ = driver
  }

  /**
   * Locates the DOM element on the current page that corresponds to
   * `document.activeElement` or `document.body` if the active element is not
   * available.
   *
   * @return {!WebElementPromise} The active element.
   */
  activeElement() {
    const id = this.driver_.execute(new command.Command(command.Name.GET_ACTIVE_ELEMENT))
    return new WebElementPromise(this.driver_, id)
  }

  /**
   * Switches focus of all future commands to the topmost frame in the current
   * window.
   *
   * @return {!Promise<void>} A promise that will be resolved
   *     when the driver has changed focus to the default content.
   */
  defaultContent() {
    return this.driver_.execute(new command.Command(command.Name.SWITCH_TO_FRAME).setParameter('id', null))
  }

  /**
   * Changes the focus of all future commands to another frame on the page. The
   * target frame may be specified as one of the following:
   *
   * - A number that specifies a (zero-based) index into [window.frames](
   *   https://developer.mozilla.org/en-US/docs/Web/API/Window.frames).
   * - A {@link WebElement} reference, which correspond to a `frame` or `iframe`
   *   DOM element.
   * - The `null` value, to select the topmost frame on the page. Passing `null`
   *   is the same as calling {@link #defaultContent defaultContent()}.
   *
   * If the specified frame can not be found, the returned promise will be
   * rejected with a {@linkplain error.NoSuchFrameError}.
   *
   * @param {(number|string|WebElement|null)} id The frame locator.
   * @return {!Promise<void>} A promise that will be resolved
   *     when the driver has changed focus to the specified frame.
   */
  frame(id) {
    let frameReference = id
    if (typeof id === 'string') {
      frameReference = this.driver_.findElement({ id }).catch((_) => this.driver_.findElement({ name: id }))
    }

    return this.driver_.execute(new command.Command(command.Name.SWITCH_TO_FRAME).setParameter('id', frameReference))
  }

  /**
   * Changes the focus of all future commands to the parent frame of the
   * currently selected frame. This command has no effect if the driver is
   * already focused on the top-level browsing context.
   *
   * @return {!Promise<void>} A promise that will be resolved when the command
   *     has completed.
   */
  parentFrame() {
    return this.driver_.execute(new command.Command(command.Name.SWITCH_TO_FRAME_PARENT))
  }

  /**
   * Changes the focus of all future commands to another window. Windows may be
   * specified by their {@code window.name} attribute or by its handle
   * (as returned by {@link WebDriver#getWindowHandles}).
   *
   * If the specified window cannot be found, the returned promise will be
   * rejected with a {@linkplain error.NoSuchWindowError}.
   *
   * @param {string} nameOrHandle The name or window handle of the window to
   *     switch focus to.
   * @return {!Promise<void>} A promise that will be resolved
   *     when the driver has changed focus to the specified window.
   */
  window(nameOrHandle) {
    return this.driver_.execute(
      new command.Command(command.Name.SWITCH_TO_WINDOW)
        // "name" supports the legacy drivers. "handle" is the W3C
        // compliant parameter.
        .setParameter('name', nameOrHandle)
        .setParameter('handle', nameOrHandle),
    )
  }

  /**
   * Creates a new browser window and switches the focus for future
   * commands of this driver to the new window.
   *
   * @param {string} typeHint 'window' or 'tab'. The created window is not
   *     guaranteed to be of the requested type; if the driver does not support
   *     the requested type, a new browser window will be created of whatever type
   *     the driver does support.
   * @return {!Promise<void>} A promise that will be resolved
   *     when the driver has changed focus to the new window.
   */
  newWindow(typeHint) {
    const driver = this.driver_
    return this.driver_
      .execute(new command.Command(command.Name.SWITCH_TO_NEW_WINDOW).setParameter('type', typeHint))
      .then(function (response) {
        return driver.switchTo().window(response.handle)
      })
  }

  /**
   * Changes focus to the active modal dialog, such as those opened by
   * `window.alert()`, `window.confirm()`, and `window.prompt()`. The returned
   * promise will be rejected with a
   * {@linkplain error.NoSuchAlertError} if there are no open alerts.
   *
   * @return {!AlertPromise} The open alert.
   */
  alert() {
    const text = this.driver_.execute(new command.Command(command.Name.GET_ALERT_TEXT))
    const driver = this.driver_
    return new AlertPromise(
      driver,
      text.then(function (text) {
        return new Alert(driver, text)
      }),
    )
  }
}

//////////////////////////////////////////////////////////////////////////////
//
//  WebElement
//
//////////////////////////////////////////////////////////////////////////////

const LEGACY_ELEMENT_ID_KEY = 'ELEMENT'
const ELEMENT_ID_KEY = 'element-6066-11e4-a52e-4f735466cecf'
const SHADOW_ROOT_ID_KEY = 'shadow-6066-11e4-a52e-4f735466cecf'

/**
 * Represents a DOM element. WebElements can be found by searching from the
 * document root using a {@link WebDriver} instance, or by searching
 * under another WebElement:
 *
 *     driver.get('http://www.google.com');
 *     var searchForm = driver.findElement(By.tagName('form'));
 *     var searchBox = searchForm.findElement(By.name('q'));
 *     searchBox.sendKeys('webdriver');
 */
class WebElement {
  /**
   * @param {!WebDriver} driver the parent WebDriver instance for this element.
   * @param {(!IThenable<string>|string)} id The server-assigned opaque ID for
   *     the underlying DOM element.
   */
  constructor(driver, id) {
    /** @private {!WebDriver} */
    this.driver_ = driver

    /** @private {!Promise<string>} */
    this.id_ = Promise.resolve(id)

    /** @private {!Logger} */
    this.log_ = logging.getLogger(logging.Type.DRIVER)
  }

  /**
   * @param {string} id The raw ID.
   * @param {boolean=} noLegacy Whether to exclude the legacy element key.
   * @return {!Object} The element ID for use with WebDriver's wire protocol.
   */
  static buildId(id, noLegacy = false) {
    return noLegacy ? { [ELEMENT_ID_KEY]: id } : { [ELEMENT_ID_KEY]: id, [LEGACY_ELEMENT_ID_KEY]: id }
  }

  /**
   * Extracts the encoded WebElement ID from the object.
   *
   * @param {?} obj The object to extract the ID from.
   * @return {string} the extracted ID.
   * @throws {TypeError} if the object is not a valid encoded ID.
   */
  static extractId(obj) {
    return webElement.extractId(obj)
  }

  /**
   * @param {?} obj the object to test.
   * @return {boolean} whether the object is a valid encoded WebElement ID.
   */
  static isId(obj) {
    return webElement.isId(obj)
  }

  /**
   * Compares two WebElements for equality.
   *
   * @param {!WebElement} a A WebElement.
   * @param {!WebElement} b A WebElement.
   * @return {!Promise<boolean>} A promise that will be
   *     resolved to whether the two WebElements are equal.
   */
  static async equals(a, b) {
    if (a === b) {
      return true
    }
    return a.driver_.executeScript('return arguments[0] === arguments[1]', a, b)
  }

  /** @return {!WebDriver} The parent driver for this instance. */
  getDriver() {
    return this.driver_
  }

  /**
   * @return {!Promise<string>} A promise that resolves to
   *     the server-assigned opaque ID assigned to this element.
   */
  getId() {
    return this.id_
  }

  /**
   * @return {!Object} Returns the serialized representation of this WebElement.
   */
  [Symbols.serialize]() {
    return this.getId().then(WebElement.buildId)
  }

  /**
   * Schedules a command that targets this element with the parent WebDriver
   * instance. Will ensure this element's ID is included in the command
   * parameters under the "id" key.
   *
   * @param {!command.Command} command The command to schedule.
   * @return {!Promise<T>} A promise that will be resolved with the result.
   * @template T
   * @see WebDriver#schedule
   * @private
   */
  execute_(command) {
    command.setParameter('id', this)
    return this.driver_.execute(command)
  }

  /**
   * Schedule a command to find a descendant of this element. If the element
   * cannot be found, the returned promise will be rejected with a
   * {@linkplain error.NoSuchElementError NoSuchElementError}.
   *
   * The search criteria for an element may be defined using one of the static
   * factories on the {@link by.By} class, or as a short-hand
   * {@link ./by.ByHash} object. For example, the following two statements
   * are equivalent:
   *
   *     var e1 = element.findElement(By.id('foo'));
   *     var e2 = element.findElement({id:'foo'});
   *
   * You may also provide a custom locator function, which takes as input this
   * instance and returns a {@link WebElement}, or a promise that will resolve
   * to a WebElement. If the returned promise resolves to an array of
   * WebElements, WebDriver will use the first element. For example, to find the
   * first visible link on a page, you could write:
   *
   *     var link = element.findElement(firstVisibleLink);
   *
   *     function firstVisibleLink(element) {
   *       var links = element.findElements(By.tagName('a'));
   *       return promise.filter(links, function(link) {
   *         return link.isDisplayed();
   *       });
   *     }
   *
   * @param {!(by.By|Function)} locator The locator strategy to use when
   *     searching for the element.
   * @return {!WebElementPromise} A WebElement that can be used to issue
   *     commands against the located element. If the element is not found, the
   *     element will be invalidated and all scheduled commands aborted.
   */
  findElement(locator) {
    locator = by.checkedLocator(locator)
    let id
    if (typeof locator === 'function') {
      id = this.driver_.findElementInternal_(locator, this)
    } else {
      let cmd = new command.Command(command.Name.FIND_CHILD_ELEMENT)
        .setParameter('using', locator.using)
        .setParameter('value', locator.value)
      id = this.execute_(cmd)
    }
    return new WebElementPromise(this.driver_, id)
  }

  /**
   * Locates all the descendants of this element that match the given search
   * criteria.
   *
   * @param {!(by.By|Function)} locator The locator strategy to use when
   *     searching for the element.
   * @return {!Promise<!Array<!WebElement>>} A promise that will resolve to an
   *     array of WebElements.
   */
  async findElements(locator) {
    locator = by.checkedLocator(locator)
    if (typeof locator === 'function') {
      return this.driver_.findElementsInternal_(locator, this)
    } else {
      let cmd = new command.Command(command.Name.FIND_CHILD_ELEMENTS)
        .setParameter('using', locator.using)
        .setParameter('value', locator.value)
      let result = await this.execute_(cmd)
      return Array.isArray(result) ? result : []
    }
  }

  /**
   * Clicks on this element.
   *
   * @return {!Promise<void>} A promise that will be resolved when the click
   *     command has completed.
   */
  click() {
    return this.execute_(new command.Command(command.Name.CLICK_ELEMENT))
  }

  /**
   * Types a key sequence on the DOM element represented by this instance.
   *
   * Modifier keys (SHIFT, CONTROL, ALT, META) are stateful; once a modifier is
   * processed in the key sequence, that key state is toggled until one of the
   * following occurs:
   *
   * - The modifier key is encountered again in the sequence. At this point the
   *   state of the key is toggled (along with the appropriate keyup/down
   *   events).
   * - The {@link input.Key.NULL} key is encountered in the sequence. When
   *   this key is encountered, all modifier keys current in the down state are
   *   released (with accompanying keyup events). The NULL key can be used to
   *   simulate common keyboard shortcuts:
   *
   *         element.sendKeys("text was",
   *                          Key.CONTROL, "a", Key.NULL,
   *                          "now text is");
   *         // Alternatively:
   *         element.sendKeys("text was",
   *                          Key.chord(Key.CONTROL, "a"),
   *                          "now text is");
   *
   * - The end of the key sequence is encountered. When there are no more keys
   *   to type, all depressed modifier keys are released (with accompanying
   *   keyup events).
   *
   * If this element is a file input ({@code <input type="file">}), the
   * specified key sequence should specify the path to the file to attach to
   * the element. This is analogous to the user clicking "Browse..." and entering
   * the path into the file select dialog.
   *
   *     var form = driver.findElement(By.css('form'));
   *     var element = form.findElement(By.css('input[type=file]'));
   *     element.sendKeys('/path/to/file.txt');
   *     form.submit();
   *
   * For uploads to function correctly, the entered path must reference a file
   * on the _browser's_ machine, not the local machine running this script. When
   * running against a remote Selenium server, a {@link input.FileDetector}
   * may be used to transparently copy files to the remote machine before
   * attempting to upload them in the browser.
   *
   * __Note:__ On browsers where native keyboard events are not supported
   * (e.g. Firefox on OS X), key events will be synthesized. Special
   * punctuation keys will be synthesized according to a standard QWERTY en-us
   * keyboard layout.
   *
   * @param {...(number|string|!IThenable<(number|string)>)} args The
   *     sequence of keys to type. Number keys may be referenced numerically or
   *     by string (1 or '1'). All arguments will be joined into a single
   *     sequence.
   * @return {!Promise<void>} A promise that will be resolved when all keys
   *     have been typed.
   */
  async sendKeys(...args) {
    let keys = []
    ;(await Promise.all(args)).forEach((key) => {
      let type = typeof key
      if (type === 'number') {
        key = String(key)
      } else if (type !== 'string') {
        throw TypeError('each key must be a number or string; got ' + type)
      }

      // The W3C protocol requires keys to be specified as an array where
      // each element is a single key.
      keys.push(...key)
    })

    if (!this.driver_.fileDetector_) {
      return this.execute_(
        new command.Command(command.Name.SEND_KEYS_TO_ELEMENT)
          .setParameter('text', keys.join(''))
          .setParameter('value', keys),
      )
    }

    try {
      keys = await this.driver_.fileDetector_.handleFile(this.driver_, keys.join(''))
    } catch (ex) {
      this.log_.severe('Error trying parse string as a file with file detector; sending keys instead' + ex)
      keys = keys.join('')
    }

    return this.execute_(
      new command.Command(command.Name.SEND_KEYS_TO_ELEMENT)
        .setParameter('text', keys)
        .setParameter('value', keys.split('')),
    )
  }

  /**
   * Retrieves the element's tag name.
   *
   * @return {!Promise<string>} A promise that will be resolved with the
   *     element's tag name.
   */
  getTagName() {
    return this.execute_(new command.Command(command.Name.GET_ELEMENT_TAG_NAME))
  }

  /**
   * Retrieves the value of a computed style property for this instance. If
   * the element inherits the named style from its parent, the parent will be
   * queried for its value.  Where possible, color values will be converted to
   * their hex representation (e.g. #00ff00 instead of rgb(0, 255, 0)).
   *
   * _Warning:_ the value returned will be as the browser interprets it, so
   * it may be tricky to form a proper assertion.
   *
   * @param {string} cssStyleProperty The name of the CSS style property to look
   *     up.
   * @return {!Promise<string>} A promise that will be resolved with the
   *     requested CSS value.
   */
  getCssValue(cssStyleProperty) {
    const name = command.Name.GET_ELEMENT_VALUE_OF_CSS_PROPERTY
    return this.execute_(new command.Command(name).setParameter('propertyName', cssStyleProperty))
  }

  /**
   * Retrieves the current value of the given attribute of this element.
   * Will return the current value, even if it has been modified after the page
   * has been loaded. More exactly, this method will return the value
   * of the given attribute, unless that attribute is not present, in which case
   * the value of the property with the same name is returned. If neither value
   * is set, null is returned (for example, the "value" property of a textarea
   * element). The "style" attribute is converted as best can be to a
   * text representation with a trailing semicolon. The following are deemed to
   * be "boolean" attributes and will return either "true" or null:
   *
   * async, autofocus, autoplay, checked, compact, complete, controls, declare,
   * defaultchecked, defaultselected, defer, disabled, draggable, ended,
   * formnovalidate, hidden, indeterminate, iscontenteditable, ismap, itemscope,
   * loop, multiple, muted, nohref, noresize, noshade, novalidate, nowrap, open,
   * paused, pubdate, readonly, required, reversed, scoped, seamless, seeking,
   * selected, spellcheck, truespeed, willvalidate
   *
   * Finally, the following commonly mis-capitalized attribute/property names
   * are evaluated as expected:
   *
   * - "class"
   * - "readonly"
   *
   * @param {string} attributeName The name of the attribute to query.
   * @return {!Promise<?string>} A promise that will be
   *     resolved with the attribute's value. The returned value will always be
   *     either a string or null.
   */
  getAttribute(attributeName) {
    return this.execute_(new command.Command(command.Name.GET_ELEMENT_ATTRIBUTE).setParameter('name', attributeName))
  }

  /**
   * Get the value of the given attribute of the element.
   * <p>
   * This method, unlike {@link #getAttribute(String)}, returns the value of the attribute with the
   * given name but not the property with the same name.
   * <p>
   * The following are deemed to be "boolean" attributes, and will return either "true" or null:
   * <p>
   * async, autofocus, autoplay, checked, compact, complete, controls, declare, defaultchecked,
   * defaultselected, defer, disabled, draggable, ended, formnovalidate, hidden, indeterminate,
   * iscontenteditable, ismap, itemscope, loop, multiple, muted, nohref, noresize, noshade,
   * novalidate, nowrap, open, paused, pubdate, readonly, required, reversed, scoped, seamless,
   * seeking, selected, truespeed, willvalidate
   * <p>
   * See <a href="https://w3c.github.io/webdriver/#get-element-attribute">W3C WebDriver specification</a>
   * for more details.
   *
   * @param attributeName The name of the attribute.
   * @return The attribute's value or null if the value is not set.
   */

  getDomAttribute(attributeName) {
    return this.execute_(new command.Command(command.Name.GET_DOM_ATTRIBUTE).setParameter('name', attributeName))
  }

  /**
   * Get the given property of the referenced web element
   * @param {string} propertyName The name of the attribute to query.
   * @return {!Promise<string>} A promise that will be
   *     resolved with the element's property value
   */
  getProperty(propertyName) {
    return this.execute_(new command.Command(command.Name.GET_ELEMENT_PROPERTY).setParameter('name', propertyName))
  }

  /**
   * Get the shadow root of the current web element.
   * @returns {!Promise<ShadowRoot>} A promise that will be
   *      resolved with the elements shadow root or rejected
   *      with {@link NoSuchShadowRootError}
   */
  getShadowRoot() {
    return this.execute_(new command.Command(command.Name.GET_SHADOW_ROOT))
  }

  /**
   * Get the visible (i.e. not hidden by CSS) innerText of this element,
   * including sub-elements, without any leading or trailing whitespace.
   *
   * @return {!Promise<string>} A promise that will be
   *     resolved with the element's visible text.
   */
  getText() {
    return this.execute_(new command.Command(command.Name.GET_ELEMENT_TEXT))
  }

  /**
   * Get the computed WAI-ARIA role of element.
   *
   * @return {!Promise<string>} A promise that will be
   *     resolved with the element's computed role.
   */
  getAriaRole() {
    return this.execute_(new command.Command(command.Name.GET_COMPUTED_ROLE))
  }

  /**
   * Get the computed WAI-ARIA label of element.
   *
   * @return {!Promise<string>} A promise that will be
   *     resolved with the element's computed label.
   */
  getAccessibleName() {
    return this.execute_(new command.Command(command.Name.GET_COMPUTED_LABEL))
  }

  /**
   * Returns an object describing an element's location, in pixels relative to
   * the document element, and the element's size in pixels.
   *
   * @return {!Promise<{width: number, height: number, x: number, y: number}>}
   *     A promise that will resolve with the element's rect.
   */
  getRect() {
    return this.execute_(new command.Command(command.Name.GET_ELEMENT_RECT))
  }

  /**
   * Tests whether this element is enabled, as dictated by the `disabled`
   * attribute.
   *
   * @return {!Promise<boolean>} A promise that will be
   *     resolved with whether this element is currently enabled.
   */
  isEnabled() {
    return this.execute_(new command.Command(command.Name.IS_ELEMENT_ENABLED))
  }

  /**
   * Tests whether this element is selected.
   *
   * @return {!Promise<boolean>} A promise that will be
   *     resolved with whether this element is currently selected.
   */
  isSelected() {
    return this.execute_(new command.Command(command.Name.IS_ELEMENT_SELECTED))
  }

  /**
   * Submits the form containing this element (or this element if it is itself
   * a FORM element). his command is a no-op if the element is not contained in
   * a form.
   *
   * @return {!Promise<void>} A promise that will be resolved
   *     when the form has been submitted.
   */
  submit() {
    const script =
      '/* submitForm */var form = arguments[0];\n' +
      'while (form.nodeName != "FORM" && form.parentNode) {\n' +
      '  form = form.parentNode;\n' +
      '}\n' +
      "if (!form) { throw Error('Unable to find containing form element'); }\n" +
      "if (!form.ownerDocument) { throw Error('Unable to find owning document'); }\n" +
      "var e = form.ownerDocument.createEvent('Event');\n" +
      "e.initEvent('submit', true, true);\n" +
      'if (form.dispatchEvent(e)) { HTMLFormElement.prototype.submit.call(form) }\n'

    return this.driver_.executeScript(script, this)
  }

  /**
   * Clear the `value` of this element. This command has no effect if the
   * underlying DOM element is neither a text INPUT element nor a TEXTAREA
   * element.
   *
   * @return {!Promise<void>} A promise that will be resolved
   *     when the element has been cleared.
   */
  clear() {
    return this.execute_(new command.Command(command.Name.CLEAR_ELEMENT))
  }

  /**
   * Test whether this element is currently displayed.
   *
   * @return {!Promise<boolean>} A promise that will be
   *     resolved with whether this element is currently visible on the page.
   */
  isDisplayed() {
    return this.execute_(new command.Command(command.Name.IS_ELEMENT_DISPLAYED))
  }

  /**
   * Take a screenshot of the visible region encompassed by this element's
   * bounding rectangle.
   *
   * @return {!Promise<string>} A promise that will be
   *     resolved to the screenshot as a base-64 encoded PNG.
   */
  takeScreenshot() {
    return this.execute_(new command.Command(command.Name.TAKE_ELEMENT_SCREENSHOT))
  }
}

/**
 * WebElementPromise is a promise that will be fulfilled with a WebElement.
 * This serves as a forward proxy on WebElement, allowing calls to be
 * scheduled without directly on this instance before the underlying
 * WebElement has been fulfilled. In other words, the following two statements
 * are equivalent:
 *
 *     driver.findElement({id: 'my-button'}).click();
 *     driver.findElement({id: 'my-button'}).then(function(el) {
 *       return el.click();
 *     });
 *
 * @implements {IThenable<!WebElement>}
 * @final
 */
class WebElementPromise extends WebElement {
  /**
   * @param {!WebDriver} driver The parent WebDriver instance for this
   *     element.
   * @param {!Promise<!WebElement>} el A promise
   *     that will resolve to the promised element.
   */
  constructor(driver, el) {
    super(driver, 'unused')

    /** @override */
    this.then = el.then.bind(el)

    /** @override */
    this.catch = el.catch.bind(el)

    /**
     * Defers returning the element ID until the wrapped WebElement has been
     * resolved.
     * @override
     */
    this.getId = function () {
      return el.then(function (el) {
        return el.getId()
      })
    }
  }
}

//////////////////////////////////////////////////////////////////////////////
//
//  ShadowRoot
//
//////////////////////////////////////////////////////////////////////////////

/**
 * Represents a ShadowRoot of a {@link WebElement}. Provides functions to
 * retrieve elements that live in the DOM below the ShadowRoot.
 */
class ShadowRoot {
  constructor(driver, id) {
    this.driver_ = driver
    this.id_ = id
  }

  /**
   * Extracts the encoded ShadowRoot ID from the object.
   *
   * @param {?} obj The object to extract the ID from.
   * @return {string} the extracted ID.
   * @throws {TypeError} if the object is not a valid encoded ID.
   */
  static extractId(obj) {
    if (obj && typeof obj === 'object') {
      if (typeof obj[SHADOW_ROOT_ID_KEY] === 'string') {
        return obj[SHADOW_ROOT_ID_KEY]
      }
    }
    throw new TypeError('object is not a ShadowRoot ID')
  }

  /**
   * @param {?} obj the object to test.
   * @return {boolean} whether the object is a valid encoded WebElement ID.
   */
  static isId(obj) {
    return obj && typeof obj === 'object' && typeof obj[SHADOW_ROOT_ID_KEY] === 'string'
  }

  /**
   * @return {!Object} Returns the serialized representation of this ShadowRoot.
   */
  [Symbols.serialize]() {
    return this.getId()
  }

  /**
   * Schedules a command that targets this element with the parent WebDriver
   * instance. Will ensure this element's ID is included in the command
   * parameters under the "id" key.
   *
   * @param {!command.Command} command The command to schedule.
   * @return {!Promise<T>} A promise that will be resolved with the result.
   * @template T
   * @see WebDriver#schedule
   * @private
   */
  execute_(command) {
    command.setParameter('id', this)
    return this.driver_.execute(command)
  }

  /**
   * Schedule a command to find a descendant of this ShadowROot. If the element
   * cannot be found, the returned promise will be rejected with a
   * {@linkplain error.NoSuchElementError NoSuchElementError}.
   *
   * The search criteria for an element may be defined using one of the static
   * factories on the {@link by.By} class, or as a short-hand
   * {@link ./by.ByHash} object. For example, the following two statements
   * are equivalent:
   *
   *     var e1 = shadowroot.findElement(By.id('foo'));
   *     var e2 = shadowroot.findElement({id:'foo'});
   *
   * You may also provide a custom locator function, which takes as input this
   * instance and returns a {@link WebElement}, or a promise that will resolve
   * to a WebElement. If the returned promise resolves to an array of
   * WebElements, WebDriver will use the first element. For example, to find the
   * first visible link on a page, you could write:
   *
   *     var link = element.findElement(firstVisibleLink);
   *
   *     function firstVisibleLink(shadowRoot) {
   *       var links = shadowRoot.findElements(By.tagName('a'));
   *       return promise.filter(links, function(link) {
   *         return link.isDisplayed();
   *       });
   *     }
   *
   * @param {!(by.By|Function)} locator The locator strategy to use when
   *     searching for the element.
   * @return {!WebElementPromise} A WebElement that can be used to issue
   *     commands against the located element. If the element is not found, the
   *     element will be invalidated and all scheduled commands aborted.
   */
  findElement(locator) {
    locator = by.checkedLocator(locator)
    let id
    if (typeof locator === 'function') {
      id = this.driver_.findElementInternal_(locator, this)
    } else {
      let cmd = new command.Command(command.Name.FIND_ELEMENT_FROM_SHADOWROOT)
        .setParameter('using', locator.using)
        .setParameter('value', locator.value)
      id = this.execute_(cmd)
    }
    return new ShadowRootPromise(this.driver_, id)
  }

  /**
   * Locates all the descendants of this element that match the given search
   * criteria.
   *
   * @param {!(by.By|Function)} locator The locator strategy to use when
   *     searching for the element.
   * @return {!Promise<!Array<!WebElement>>} A promise that will resolve to an
   *     array of WebElements.
   */
  async findElements(locator) {
    locator = by.checkedLocator(locator)
    if (typeof locator === 'function') {
      return this.driver_.findElementsInternal_(locator, this)
    } else {
      let cmd = new command.Command(command.Name.FIND_ELEMENTS_FROM_SHADOWROOT)
        .setParameter('using', locator.using)
        .setParameter('value', locator.value)
      let result = await this.execute_(cmd)
      return Array.isArray(result) ? result : []
    }
  }

  getId() {
    return this.id_
  }
}

/**
 * ShadowRootPromise is a promise that will be fulfilled with a WebElement.
 * This serves as a forward proxy on ShadowRoot, allowing calls to be
 * scheduled without directly on this instance before the underlying
 * ShadowRoot has been fulfilled.
 *
 * @implements { IThenable<!ShadowRoot>}
 * @final
 */
class ShadowRootPromise extends ShadowRoot {
  /**
   * @param {!WebDriver} driver The parent WebDriver instance for this
   *     element.
   * @param {!Promise<!ShadowRoot>} shadow A promise
   *     that will resolve to the promised element.
   */
  constructor(driver, shadow) {
    super(driver, 'unused')

    /** @override */
    this.then = shadow.then.bind(shadow)

    /** @override */
    this.catch = shadow.catch.bind(shadow)

    /**
     * Defers returning the ShadowRoot ID until the wrapped WebElement has been
     * resolved.
     * @override
     */
    this.getId = function () {
      return shadow.then(function (shadow) {
        return shadow.getId()
      })
    }
  }
}

//////////////////////////////////////////////////////////////////////////////
//
//  Alert
//
//////////////////////////////////////////////////////////////////////////////

/**
 * Represents a modal dialog such as {@code alert}, {@code confirm}, or
 * {@code prompt}. Provides functions to retrieve the message displayed with
 * the alert, accept or dismiss the alert, and set the response text (in the
 * case of {@code prompt}).
 */
class Alert {
  /**
   * @param {!WebDriver} driver The driver controlling the browser this alert
   *     is attached to.
   * @param {string} text The message text displayed with this alert.
   */
  constructor(driver, text) {
    /** @private {!WebDriver} */
    this.driver_ = driver

    /** @private {!Promise<string>} */
    this.text_ = Promise.resolve(text)
  }

  /**
   * Retrieves the message text displayed with this alert. For instance, if the
   * alert were opened with alert("hello"), then this would return "hello".
   *
   * @return {!Promise<string>} A promise that will be
   *     resolved to the text displayed with this alert.
   */
  getText() {
    return this.text_
  }

  /**
   * Accepts this alert.
   *
   * @return {!Promise<void>} A promise that will be resolved
   *     when this command has completed.
   */
  accept() {
    return this.driver_.execute(new command.Command(command.Name.ACCEPT_ALERT))
  }

  /**
   * Dismisses this alert.
   *
   * @return {!Promise<void>} A promise that will be resolved
   *     when this command has completed.
   */
  dismiss() {
    return this.driver_.execute(new command.Command(command.Name.DISMISS_ALERT))
  }

  /**
   * Sets the response text on this alert. This command will return an error if
   * the underlying alert does not support response text (e.g. window.alert and
   * window.confirm).
   *
   * @param {string} text The text to set.
   * @return {!Promise<void>} A promise that will be resolved
   *     when this command has completed.
   */
  sendKeys(text) {
    return this.driver_.execute(new command.Command(command.Name.SET_ALERT_TEXT).setParameter('text', text))
  }
}

/**
 * AlertPromise is a promise that will be fulfilled with an Alert. This promise
 * serves as a forward proxy on an Alert, allowing calls to be scheduled
 * directly on this instance before the underlying Alert has been fulfilled. In
 * other words, the following two statements are equivalent:
 *
 *     driver.switchTo().alert().dismiss();
 *     driver.switchTo().alert().then(function(alert) {
 *       return alert.dismiss();
 *     });
 *
 * @implements {IThenable<!Alert>}
 * @final
 */
class AlertPromise extends Alert {
  /**
   * @param {!WebDriver} driver The driver controlling the browser this
   *     alert is attached to.
   * @param {!Promise<!Alert>} alert A thenable
   *     that will be fulfilled with the promised alert.
   */
  constructor(driver, alert) {
    super(driver, 'unused')

    /** @override */
    this.then = alert.then.bind(alert)

    /** @override */
    this.catch = alert.catch.bind(alert)

    /**
     * Defer returning text until the promised alert has been resolved.
     * @override
     */
    this.getText = function () {
      return alert.then(function (alert) {
        return alert.getText()
      })
    }

    /**
     * Defers action until the alert has been located.
     * @override
     */
    this.accept = function () {
      return alert.then(function (alert) {
        return alert.accept()
      })
    }

    /**
     * Defers action until the alert has been located.
     * @override
     */
    this.dismiss = function () {
      return alert.then(function (alert) {
        return alert.dismiss()
      })
    }

    /**
     * Defers action until the alert has been located.
     * @override
     */
    this.sendKeys = function (text) {
      return alert.then(function (alert) {
        return alert.sendKeys(text)
      })
    }
  }
}

// PUBLIC API

module.exports = {
  Alert,
  AlertPromise,
  Condition,
  Logs,
  Navigation,
  Options,
  ShadowRoot,
  TargetLocator,
  IWebDriver,
  WebDriver,
  WebElement,
  WebElementCondition,
  WebElementPromise,
  Window,
}
