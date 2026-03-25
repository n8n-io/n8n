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
 * @fileoverview Defines a {@linkplain Driver WebDriver} client for Microsoft's
 * Internet Explorer. Before using the IEDriver, you must download the latest
 * [IEDriverServer](https://www.selenium.dev/downloads/)
 * and place it on your
 * [PATH](http://en.wikipedia.org/wiki/PATH_%28variable%29). You must also apply
 * the system configuration outlined on the Selenium project
 * [wiki](https://github.com/SeleniumHQ/selenium/wiki/InternetExplorerDriver)
 *
 * @module selenium-webdriver/ie
 */

'use strict'

const http = require('./http')
const portprober = require('./net/portprober')
const remote = require('./remote')
const webdriver = require('./lib/webdriver')
const { Browser, Capabilities } = require('./lib/capabilities')
const error = require('./lib/error')
const { getBinaryPaths } = require('./common/driverFinder')

const OPTIONS_CAPABILITY_KEY = 'se:ieOptions'
const SCROLL_BEHAVIOUR = {
  BOTTOM: 1,
  TOP: 0,
}

/**
 * IEDriverServer logging levels.
 * @enum {string}
 */
const Level = {
  FATAL: 'FATAL',
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE',
}

/**
 * Option keys:
 * https://github.com/SeleniumHQ/selenium/wiki/DesiredCapabilities#ie-specific
 * @enum {string}
 */
const Key = {
  IGNORE_PROTECTED_MODE_SETTINGS: 'ignoreProtectedModeSettings',
  IGNORE_ZOOM_SETTING: 'ignoreZoomSetting',
  INITIAL_BROWSER_URL: 'initialBrowserUrl',
  ENABLE_PERSISTENT_HOVER: 'enablePersistentHover',
  ENABLE_ELEMENT_CACHE_CLEANUP: 'enableElementCacheCleanup',
  ELEMENT_SCROLL_BEHAVIOR: 'elementScrollBehavior',
  REQUIRE_WINDOW_FOCUS: 'requireWindowFocus',
  BROWSER_ATTACH_TIMEOUT: 'browserAttachTimeout',
  FORCE_CREATE_PROCESS: 'ie.forceCreateProcessApi',
  BROWSER_COMMAND_LINE_SWITCHES: 'ie.browserCommandLineSwitches',
  USE_PER_PROCESS_PROXY: 'ie.usePerProcessProxy',
  ENSURE_CLEAN_SESSION: 'ie.ensureCleanSession',
  LOG_FILE: 'logFile',
  LOG_LEVEL: 'logLevel',
  HOST: 'host',
  EXTRACT_PATH: 'extractPath',
  SILENT: 'silent',
  FILE_UPLOAD_DIALOG_TIMEOUT: 'ie.fileUploadDialogTimeout',
  ATTACH_TO_EDGE_CHROMIUM: 'ie.edgechromium',
  EDGE_EXECUTABLE_PATH: 'ie.edgepath',
  IGNORE_PROCESS_MATCH: 'ie.ignoreprocessmatch',
}

/**
 * Class for managing IEDriver specific options.
 */
class Options extends Capabilities {
  /**
   * @param {(Capabilities|Map<string, ?>|Object)=} other Another set of
   *     capabilities to initialize this instance from.
   */
  constructor(other = undefined) {
    super(other)

    /** @private {!Object} */
    this.options_ = this.get(OPTIONS_CAPABILITY_KEY) || {}

    this.set(OPTIONS_CAPABILITY_KEY, this.options_)
    this.setBrowserName(Browser.INTERNET_EXPLORER)
  }

  /**
   * Whether to disable the protected mode settings check when the session is
   * created. Disabling this setting may lead to significant instability as the
   * browser may become unresponsive/hang. Only "best effort" support is provided
   * when using this capability.
   *
   * For more information, refer to the IEDriver's
   * [required system configuration](http://goo.gl/eH0Yi3).
   *
   * @param {boolean} ignoreSettings Whether to ignore protected mode settings.
   * @return {!Options} A self reference.
   */
  introduceFlakinessByIgnoringProtectedModeSettings(ignoreSettings) {
    this.options_[Key.IGNORE_PROTECTED_MODE_SETTINGS] = !!ignoreSettings
    return this
  }

  /**
   * Indicates whether to skip the check that the browser's zoom level is set to
   * 100%.
   *
   * @param {boolean} ignore Whether to ignore the browser's zoom level settings.
   * @return {!Options} A self reference.
   */
  ignoreZoomSetting(ignore) {
    this.options_[Key.IGNORE_ZOOM_SETTING] = !!ignore
    return this
  }

  /**
   * Sets the initial URL loaded when IE starts. This is intended to be used with
   * {@link #introduceFlakinessByIgnoringProtectedModeSettings} to allow the user to initialize IE in
   * the proper Protected Mode zone. Setting this option may cause browser
   * instability or flaky and unresponsive code. Only "best effort" support is
   * provided when using this option.
   *
   * @param {string} url The initial browser URL.
   * @return {!Options} A self reference.
   */
  initialBrowserUrl(url) {
    this.options_[Key.INITIAL_BROWSER_URL] = url
    return this
  }

  /**
   * Configures whether to enable persistent mouse hovering (true by default).
   * Persistent hovering is achieved by continuously firing mouse over events at
   * the last location the mouse cursor has been moved to.
   *
   * @param {boolean} enable Whether to enable persistent hovering.
   * @return {!Options} A self reference.
   */
  enablePersistentHover(enable) {
    this.options_[Key.ENABLE_PERSISTENT_HOVER] = !!enable
    return this
  }

  /**
   * Configures whether the driver should attempt to remove obsolete
   * {@linkplain webdriver.WebElement WebElements} from its internal cache on
   * page navigation (true by default). Disabling this option will cause the
   * driver to run with a larger memory footprint.
   *
   * @param {boolean} enable Whether to enable element reference cleanup.
   * @return {!Options} A self reference.
   */
  enableElementCacheCleanup(enable) {
    this.options_[Key.ENABLE_ELEMENT_CACHE_CLEANUP] = !!enable
    return this
  }

  /**
   * Configures whether to require the IE window to have input focus before
   * performing any user interactions (i.e. mouse or keyboard events). This
   * option is disabled by default, but delivers much more accurate interaction
   * events when enabled.
   *
   * @param {boolean} require Whether to require window focus.
   * @return {!Options} A self reference.
   */
  requireWindowFocus(require) {
    this.options_[Key.REQUIRE_WINDOW_FOCUS] = !!require
    return this
  }

  /**
   * Configures the timeout, in milliseconds, that the driver will attempt to
   * located and attach to a newly opened instance of Internet Explorer. The
   * default is zero, which indicates waiting indefinitely.
   *
   * @param {number} timeout How long to wait for IE.
   * @return {!Options} A self reference.
   */
  browserAttachTimeout(timeout) {
    this.options_[Key.BROWSER_ATTACH_TIMEOUT] = Math.max(timeout, 0)
    return this
  }

  /**
   * Configures whether to launch Internet Explorer using the CreateProcess API.
   * If this option is not specified, IE is launched using IELaunchURL, if
   * available. For IE 8 and above, this option requires the TabProcGrowth
   * registry value to be set to 0.
   *
   * @param {boolean} force Whether to use the CreateProcess API.
   * @return {!Options} A self reference.
   */
  forceCreateProcessApi(force) {
    this.options_[Key.FORCE_CREATE_PROCESS] = !!force
    return this
  }

  /**
   * Specifies command-line switches to use when launching Internet Explorer.
   * This is only valid when used with {@link #forceCreateProcessApi}.
   *
   * @param {...(string|!Array.<string>)} args The arguments to add.
   * @return {!Options} A self reference.
   */

  addBrowserCommandSwitches(...args) {
    let current = this.options_[Key.BROWSER_COMMAND_LINE_SWITCHES] || []
    if (typeof current == 'string') {
      current = current.split(' ')
    }
    this.options_[Key.BROWSER_COMMAND_LINE_SWITCHES] = current.concat(args).join(' ')
    return this
  }

  /**
   * Specifies command-line switches to use when launching Internet Explorer.
   * This is only valid when used with {@link #forceCreateProcessApi}.
   *
   * @param {...(string|!Array.<string>)} args The arguments to add.
   * @deprecated Use {@link #addBrowserCommandSwitches} instead.
   * @return {!Options} A self reference.
   */

  addArguments(...args) {
    let current = this.options_[Key.BROWSER_COMMAND_LINE_SWITCHES] || []
    if (typeof current == 'string') {
      current = current.split(' ')
    }
    this.options_[Key.BROWSER_COMMAND_LINE_SWITCHES] = current.concat(args).join(' ')
    return this
  }

  /**
   * Configures whether proxies should be configured on a per-process basis. If
   * not set, setting a {@linkplain #setProxy proxy} will configure the system
   * proxy. The default behavior is to use the system proxy.
   *
   * @param {boolean} enable Whether to enable per-process proxy settings.
   * @return {!Options} A self reference.
   */
  usePerProcessProxy(enable) {
    this.options_[Key.USE_PER_PROCESS_PROXY] = !!enable
    return this
  }

  /**
   * Configures whether to clear the cache, cookies, history, and saved form data
   * before starting the browser. _Using this capability will clear session data
   * for all running instances of Internet Explorer, including those started
   * manually._
   *
   * @param {boolean} cleanSession Whether to clear all session data on startup.
   * @return {!Options} A self reference.
   */
  ensureCleanSession(cleanSession) {
    this.options_[Key.ENSURE_CLEAN_SESSION] = !!cleanSession
    return this
  }

  /**
   * Sets the path to the log file the driver should log to.
   * @param {string} file The log file path.
   * @return {!Options} A self reference.
   */
  setLogFile(file) {
    this.options_[Key.LOG_FILE] = file
    return this
  }

  /**
   * Sets the IEDriverServer's logging {@linkplain Level level}.
   * @param {Level} level The logging level.
   * @return {!Options} A self reference.
   */
  setLogLevel(level) {
    this.options_[Key.LOG_LEVEL] = level
    return this
  }

  /**
   * Sets the IP address of the driver's host adapter.
   * @param {string} host The IP address to use.
   * @return {!Options} A self reference.
   */
  setHost(host) {
    this.options_[Key.HOST] = host
    return this
  }

  /**
   * Sets the path of the temporary data directory to use.
   * @param {string} path The log file path.
   * @return {!Options} A self reference.
   */
  setExtractPath(path) {
    this.options_[Key.EXTRACT_PATH] = path
    return this
  }

  /**
   * Sets whether the driver should start in silent mode.
   * @param {boolean} silent Whether to run in silent mode.
   * @return {!Options} A self reference.
   */
  silent(silent) {
    this.options_[Key.SILENT] = silent
    return this
  }

  /**
   * The options File Upload Dialog Timeout in milliseconds
   *
   * @param {number} timeout How long to wait for IE.
   * @return {!Options} A self reference.
   */
  fileUploadDialogTimeout(timeout) {
    this.options_[Key.FILE_UPLOAD_DIALOG_TIMEOUT] = Math.max(timeout, 0)
    return this
  }

  /**
   * Sets the path of the EdgeChromium driver.
   * @param {string} path The EdgeChromium driver path.
   * @return {!Options} A self reference.
   */
  setEdgePath(path) {
    this.options_[Key.EDGE_EXECUTABLE_PATH] = path
    return this
  }

  /**
   * Sets the IEDriver to drive Chromium-based Edge in Internet Explorer mode.
   *
   * @param {boolean} attachEdgeChromium Whether to run in Chromium-based-Edge in IE mode
   * @return {!Options} A self reference.
   */
  setEdgeChromium(attachEdgeChromium) {
    this.options_[Key.ATTACH_TO_EDGE_CHROMIUM] = !!attachEdgeChromium
    return this
  }

  /**
   * Sets how elements should be scrolled into view for interaction.
   * @param {number} behavior The desired scroll behavior: either 0 to align with
   *     the top of the viewport or 1 to align with the bottom.
   * @return {!Options} A self reference.
   */
  setScrollBehavior(behavior) {
    if (behavior && behavior !== SCROLL_BEHAVIOUR.TOP && behavior !== SCROLL_BEHAVIOUR.BOTTOM) {
      throw new error.InvalidArgumentError(`Element Scroll Behavior out of range.
      It should be either ${SCROLL_BEHAVIOUR.TOP} or ${SCROLL_BEHAVIOUR.BOTTOM}`)
    }
    this.options_[Key.ELEMENT_SCROLL_BEHAVIOR] = behavior
    return this
  }
}

function createServiceFromCapabilities(capabilities) {
  if (process.platform !== 'win32') {
    throw Error(
      'The IEDriver may only be used on Windows, but you appear to be on ' +
        process.platform +
        '. Did you mean to run against a remote ' +
        'WebDriver server?',
    )
  }

  let exe = null // Let Selenium Manager find it
  var args = []
  if (capabilities.has(Key.HOST)) {
    args.push('--host=' + capabilities.get(Key.HOST))
  }
  if (capabilities.has(Key.LOG_FILE)) {
    args.push('--log-file=' + capabilities.get(Key.LOG_FILE))
  }
  if (capabilities.has(Key.LOG_LEVEL)) {
    args.push('--log-level=' + capabilities.get(Key.LOG_LEVEL))
  }
  if (capabilities.has(Key.EXTRACT_PATH)) {
    args.push('--extract-path=' + capabilities.get(Key.EXTRACT_PATH))
  }
  if (capabilities.get(Key.SILENT)) {
    args.push('--silent')
  }

  var port = portprober.findFreePort()
  return new remote.DriverService(exe, {
    loopback: true,
    port: port,
    args: port.then(function (port) {
      return args.concat('--port=' + port)
    }),
    stdio: 'ignore',
  })
}

/**
 * Creates {@link selenium-webdriver/remote.DriverService} instances that manage
 * an [IEDriverServer](https://github.com/SeleniumHQ/selenium/wiki/InternetExplorerDriver)
 * server in a child process.
 */
class ServiceBuilder extends remote.DriverService.Builder {
  /**
   * @param {string=} opt_exe Path to the server executable to use. If omitted,
   *     the builder will attempt to locate the IEDriverServer on the system PATH.
   */
  constructor(opt_exe) {
    super(opt_exe)
    this.setLoopback(true) // Required.
  }
}

/**
 * A WebDriver client for Microsoft's Internet Explorer.
 */
class Driver extends webdriver.WebDriver {
  /**
   * Creates a new session for Microsoft's Internet Explorer.
   *
   * @param {(Capabilities|Options)=} options The configuration options.
   * @param {(remote.DriverService)=} opt_service The `DriverService` to use
   *   to start the IEDriverServer in a child process, optionally.
   * @return {!Driver} A new driver instance.
   */
  static createSession(options, opt_service) {
    options = options || new Options()

    let service

    if (opt_service instanceof remote.DriverService) {
      service = opt_service
    } else {
      service = createServiceFromCapabilities(options)
    }
    if (!service.getExecutable()) {
      service.setExecutable(getBinaryPaths(options).driverPath)
    }

    let client = service.start().then((url) => new http.HttpClient(url))
    let executor = new http.Executor(client)

    return /** @type {!Driver} */ (super.createSession(executor, options, () => service.kill()))
  }

  /**
   * This function is a no-op as file detectors are not supported by this
   * implementation.
   * @override
   */
  setFileDetector() {}
}

// PUBLIC API

exports.Driver = Driver
exports.Options = Options
exports.Level = Level
exports.ServiceBuilder = ServiceBuilder
exports.Key = Key
exports.VENDOR_COMMAND_PREFIX = OPTIONS_CAPABILITY_KEY
exports.Behavior = SCROLL_BEHAVIOUR
