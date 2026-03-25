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

/**
 * @fileoverview Defines types related to describing the capabilities of a
 * WebDriver session.
 */

const Symbols = require('./symbols')

/**
 * Recognized browser names.
 * @enum {string}
 */
const Browser = {
  CHROME: 'chrome',
  EDGE: 'MicrosoftEdge',
  FIREFOX: 'firefox',
  INTERNET_EXPLORER: 'internet explorer',
  SAFARI: 'safari',
}

/**
 * Strategies for waiting for [document readiness] after a navigation
 * event.
 *
 * [document readiness]: https://html.spec.whatwg.org/#current-document-readiness
 *
 * @enum {string}
 */
const PageLoadStrategy = {
  /**
   * Indicates WebDriver should not wait on the document readiness state after a
   * navigation event.
   */
  NONE: 'none',

  /**
   * Indicates WebDriver should wait for the document readiness state to
   * become "interactive" after navigation.
   */
  EAGER: 'eager',

  /**
   * Indicates WebDriver should wait for the document readiness state to
   * be "complete" after navigation. This is the default page loading strategy.
   */
  NORMAL: 'normal',
}

/**
 * Common platform names. These platforms are not explicitly defined by the
 * WebDriver spec, however, their use is encouraged for interoperability.
 *
 * @enum {string}
 * @see <https://w3c.github.io/webdriver/webdriver-spec.html>
 */
const Platform = {
  LINUX: 'linux',
  MAC: 'mac',
  WINDOWS: 'windows',
}

/**
 * Record object defining the timeouts that apply to certain WebDriver actions.
 *
 * @record
 */
function Timeouts() {}

/**
 * Defines when, in milliseconds, to interrupt a script that is being
 * {@linkplain ./webdriver.IWebDriver#executeScript evaluated}.
 * @type {number}
 */
Timeouts.prototype.script

/**
 * The timeout, in milliseconds, to apply to navigation events along with the
 * {@link PageLoadStrategy}.
 * @type {number}
 */
Timeouts.prototype.pageLoad

/**
 * The maximum amount of time, in milliseconds, to spend attempting to
 * {@linkplain ./webdriver.IWebDriver#findElement locate} an element on the
 * current page.
 * @type {number}
 */
Timeouts.prototype.implicit

/**
 * The possible default actions a WebDriver session can take to respond to
 * unhandled user prompts (`window.alert()`, `window.confirm()`, and
 * `window.prompt()`).
 *
 * @enum {string}
 */
const UserPromptHandler = {
  /** All prompts should be silently accepted. */
  ACCEPT: 'accept',
  /** All prompts should be silently dismissed. */
  DISMISS: 'dismiss',
  /**
   * All prompts should be automatically accepted, but an error should be
   * returned to the next (or currently executing) WebDriver command.
   */
  ACCEPT_AND_NOTIFY: 'accept and notify',
  /**
   * All prompts should be automatically dismissed, but an error should be
   * returned to the next (or currently executing) WebDriver command.
   */
  DISMISS_AND_NOTIFY: 'dismiss and notify',
  /** All prompts should be left unhandled. */
  IGNORE: 'ignore',
}

/**
 * The standard WebDriver capability keys.
 *
 * @enum {string}
 * @see <https://w3c.github.io/webdriver/webdriver-spec.html#capabilities>
 */
const Capability = {
  /**
   * Indicates whether a WebDriver session implicitly trusts otherwise untrusted
   * and self-signed TLS certificates during navigation.
   */
  ACCEPT_INSECURE_TLS_CERTS: 'acceptInsecureCerts',

  /**
   * The browser name. Common browser names are defined in the
   * {@link ./capabilities.Browser Browser} enum.
   */
  BROWSER_NAME: 'browserName',

  /** Identifies the browser version. */
  BROWSER_VERSION: 'browserVersion',

  /**
   * Key for the logging driver logging preferences.
   * The browser name. Common browser names are defined in the
   * {@link ./capabilities.Browser Browser} enum.
   */
  LOGGING_PREFS: 'goog:loggingPrefs',

  /**
   * Defines the session's
   * {@linkplain ./capabilities.PageLoadStrategy page loading strategy}.
   */
  PAGE_LOAD_STRATEGY: 'pageLoadStrategy',

  /**
   * Identifies the operating system of the endpoint node. Common values
   * recognized by the most WebDriver server implementations are predefined in
   * the {@link ./capabilities.Platform Platform} enum.
   */
  PLATFORM_NAME: 'platformName',

  /**
   * Describes the proxy configuration to use for a new WebDriver session.
   */
  PROXY: 'proxy',

  /**
   * Indicates whether the remote end supports all of the window resizing and
   * positioning commands:
   *
   * -  {@linkplain ./webdriver.Window#getRect Window.getRect()}
   * -  {@linkplain ./webdriver.Window#setRect Window.setRect()}
   * -  {@linkplain ./webdriver.Window#maximize Window.maximize()}
   * -  {@linkplain ./webdriver.Window#minimize Window.minimize()}
   * -  {@linkplain ./webdriver.Window#fullscreen Window.fullscreen()}
   */
  SET_WINDOW_RECT: 'setWindowRect',

  /**
   * Describes the {@linkplain ./capabilities.Timeouts timeouts} imposed on
   * certain session operations.
   */
  TIMEOUTS: 'timeouts',

  /**
   * Defines how a WebDriver session should
   * {@linkplain ./capabilities.UserPromptHandler respond} to unhandled user
   * prompts.
   */
  UNHANDLED_PROMPT_BEHAVIOR: 'unhandledPromptBehavior',

  /**
   * Defines the current session’s strict file interactability.
   * Used to upload a file when strict file interactability is on
   */
  STRICT_FILE_INTERACTABILITY: 'strictFileInteractability',

  ENABLE_DOWNLOADS: 'se:downloadsEnabled',
}

/**
 * Converts a generic hash object to a map.
 * @param {!Object<string, ?>} hash The hash object.
 * @return {!Map<string, ?>} The converted map.
 */
function toMap(hash) {
  let m = new Map()
  for (let key in hash) {
    if (Object.prototype.hasOwnProperty.call(hash, key)) {
      m.set(key, hash[key])
    }
  }
  return m
}

/**
 * Describes a set of capabilities for a WebDriver session.
 */
class Capabilities {
  /**
   * @param {(Capabilities|Map<string, ?>|Object)=} other Another set of
   *     capabilities to initialize this instance from.
   */
  constructor(other = undefined) {
    if (other instanceof Capabilities) {
      other = other.map_
    } else if (other && !(other instanceof Map)) {
      other = toMap(other)
    }
    /** @private @const {!Map<string, ?>} */
    this.map_ = new Map(other)
  }

  /** @return {number} The number of capabilities set. */
  get size() {
    return this.map_.size
  }

  /**
   * @return {!Capabilities} A basic set of capabilities for Chrome.
   */
  static chrome() {
    return new Capabilities().setBrowserName(Browser.CHROME)
  }

  /**
   * @return {!Capabilities} A basic set of capabilities for Microsoft Edge.
   */
  static edge() {
    return new Capabilities().setBrowserName(Browser.EDGE)
  }

  /**
   * @return {!Capabilities} A basic set of capabilities for Firefox.
   */
  static firefox() {
    return new Capabilities().setBrowserName(Browser.FIREFOX).set('moz:debuggerAddress', true)
  }

  /**
   * @return {!Capabilities} A basic set of capabilities for Internet Explorer.
   */
  static ie() {
    return new Capabilities().setBrowserName(Browser.INTERNET_EXPLORER)
  }

  /**
   * @return {!Capabilities} A basic set of capabilities for Safari.
   */
  static safari() {
    return new Capabilities().setBrowserName(Browser.SAFARI)
  }

  /**
   * @return {!Object<string, ?>} The JSON representation of this instance.
   *     Note, the returned object may contain nested promised values.
   * @suppress {checkTypes} Suppress [] access on a struct (state inherited from
   *     Map).
   */
  [Symbols.serialize]() {
    return serialize(this)
  }

  /**
   * @param {string} key the parameter key to get.
   * @return {T} the stored parameter value.
   * @template T
   */
  get(key) {
    return this.map_.get(key)
  }

  /**
   * @param {string} key the key to test.
   * @return {boolean} whether this capability set has the specified key.
   */
  has(key) {
    return this.map_.has(key)
  }

  /**
   * @return {!Iterator<string>} an iterator of the keys set.
   */
  keys() {
    return this.map_.keys()
  }

  /**
   * Merges another set of capabilities into this instance.
   * @param {!(Capabilities|Map<String, ?>|Object<string, ?>)} other The other
   *     set of capabilities to merge.
   * @return {!Capabilities} A self reference.
   */
  merge(other) {
    if (other) {
      let otherMap
      if (other instanceof Capabilities) {
        otherMap = other.map_
      } else if (other instanceof Map) {
        otherMap = other
      } else {
        otherMap = toMap(other)
      }
      otherMap.forEach((value, key) => {
        this.set(key, value)
      })
      return this
    } else {
      throw new TypeError('no capabilities provided for merge')
    }
  }

  /**
   * Deletes an entry from this set of capabilities.
   *
   * @param {string} key the capability key to delete.
   */
  delete(key) {
    this.map_.delete(key)
  }

  /**
   * @param {string} key The capability key.
   * @param {*} value The capability value.
   * @return {!Capabilities} A self reference.
   * @throws {TypeError} If the `key` is not a string.
   */
  set(key, value) {
    if (typeof key !== 'string') {
      throw new TypeError('Capability keys must be strings: ' + typeof key)
    }
    this.map_.set(key, value)
    return this
  }

  /**
   * Sets whether a WebDriver session should implicitly accept self-signed, or
   * other untrusted TLS certificates on navigation.
   *
   * @param {boolean} accept whether to accept insecure certs.
   * @return {!Capabilities} a self reference.
   */
  setAcceptInsecureCerts(accept) {
    return this.set(Capability.ACCEPT_INSECURE_TLS_CERTS, accept)
  }

  /**
   * @return {boolean} whether the session is configured to accept insecure
   *     TLS certificates.
   */
  getAcceptInsecureCerts() {
    return this.get(Capability.ACCEPT_INSECURE_TLS_CERTS)
  }

  /**
   * Sets the name of the target browser.
   *
   * @param {(Browser|string)} name the browser name.
   * @return {!Capabilities} a self reference.
   */
  setBrowserName(name) {
    return this.set(Capability.BROWSER_NAME, name)
  }

  /**
   * @return {(string|undefined)} the configured browser name, or undefined if
   *     not set.
   */
  getBrowserName() {
    return this.get(Capability.BROWSER_NAME)
  }

  /**
   * Sets the desired version of the target browser.
   *
   * @param {string} version the desired version.
   * @return {!Capabilities} a self reference.
   */
  setBrowserVersion(version) {
    return this.set(Capability.BROWSER_VERSION, version)
  }

  /**
   * @return {(string|undefined)} the configured browser version, or undefined
   *     if not set.
   */
  getBrowserVersion() {
    return this.get(Capability.BROWSER_VERSION)
  }

  /**
   * Sets the desired page loading strategy for a new WebDriver session.
   *
   * @param {PageLoadStrategy} strategy the desired strategy.
   * @return {!Capabilities} a self reference.
   */
  setPageLoadStrategy(strategy) {
    return this.set(Capability.PAGE_LOAD_STRATEGY, strategy)
  }

  /**
   * Returns the configured page load strategy.
   *
   * @return {(string|undefined)} the page load strategy.
   */
  getPageLoadStrategy() {
    return this.get(Capability.PAGE_LOAD_STRATEGY)
  }

  /**
   * Sets the target platform.
   *
   * @param {(Platform|string)} platform the target platform.
   * @return {!Capabilities} a self reference.
   */
  setPlatform(platform) {
    return this.set(Capability.PLATFORM_NAME, platform)
  }

  /**
   * @return {(string|undefined)} the configured platform or undefined if not
   *     set.
   */
  getPlatform() {
    return this.get(Capability.PLATFORM_NAME)
  }

  /**
   * Sets the logging preferences. Preferences may be specified as a
   * {@link ./logging.Preferences} instance, or as a map of log-type to
   * log-level.
   * @param {!(./logging.Preferences|Object<string>)} prefs The logging
   *     preferences.
   * @return {!Capabilities} A self reference.
   */
  setLoggingPrefs(prefs) {
    return this.set(Capability.LOGGING_PREFS, prefs)
  }

  /**
   * Sets the proxy configuration for this instance.
   * @param {proxy.Config} proxy The desired proxy configuration.
   * @return {!Capabilities} A self reference.
   */
  setProxy(proxy) {
    return this.set(Capability.PROXY, proxy)
  }

  /**
   * @return {(proxy.Config|undefined)} the configured proxy settings, or
   *     undefined if not set.
   */
  getProxy() {
    return this.get(Capability.PROXY)
  }

  /**
   * Sets the default action to take with an unexpected alert before returning
   * an error. If unspecified, WebDriver will default to
   * {@link UserPromptHandler.DISMISS_AND_NOTIFY}.
   *
   * @param {?UserPromptHandler} behavior The way WebDriver should respond to
   *     unhandled user prompts.
   * @return {!Capabilities} A self reference.
   */
  setAlertBehavior(behavior) {
    return this.set(Capability.UNHANDLED_PROMPT_BEHAVIOR, behavior)
  }

  /**
   * @return {(UserPromptHandler|undefined)} the behavior pattern for responding
   *     to unhandled user prompts, or undefined if not set.
   */
  getAlertBehavior() {
    return this.get(Capability.UNHANDLED_PROMPT_BEHAVIOR)
  }

  /**
   * Sets the boolean flag configuration for this instance.
   */
  setStrictFileInteractability(strictFileInteractability) {
    return this.set(Capability.STRICT_FILE_INTERACTABILITY, strictFileInteractability)
  }

  enableDownloads() {
    return this.set(Capability.ENABLE_DOWNLOADS, true)
  }
}

/**
 * Serializes a capabilities object. This is defined as a standalone function
 * so it may be type checked (where Capabilities[Symbols.serialize] has type
 * checking disabled since it is defined with [] access on a struct).
 *
 * @param {!Capabilities} caps The capabilities to serialize.
 * @return {!Object<string, ?>} The JSON representation of this instance.
 *     Note, the returned object may contain nested promised values.
 */
function serialize(caps) {
  let ret = {}
  for (let key of caps.keys()) {
    let cap = caps.get(key)
    if (cap !== undefined && cap !== null) {
      ret[key] = cap
    }
  }
  return ret
}

// PUBLIC API

module.exports = {
  Browser,
  Capabilities,
  Capability,
  PageLoadStrategy,
  Platform,
  Timeouts,
  UserPromptHandler,
}
