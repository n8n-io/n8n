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
 * @fileoverview Defines an abstract {@linkplain Driver WebDriver} client for
 * Chromium-based web browsers. These classes should not be instantiated
 * directly.
 *
 * There are three primary classes exported by this module:
 *
 * 1. {@linkplain ServiceBuilder}: configures the
 *     {@link selenium-webdriver/remote.DriverService remote.DriverService}
 *     that manages a WebDriver server child process.
 *
 * 2. {@linkplain Options}: defines configuration options for each new Chromium
 *     session, such as which {@linkplain Options#setProxy proxy} to use,
 *     what {@linkplain Options#addExtensions extensions} to install, or
 *     what {@linkplain Options#addArguments command-line switches} to use when
 *     starting the browser.
 *
 * 3. {@linkplain Driver}: the WebDriver client; each new instance will control
 *     a unique browser session with a clean user profile (unless otherwise
 *     configured through the {@link Options} class).
 *
 *     let chrome = require('selenium-webdriver/chrome');
 *     let {Builder} = require('selenium-webdriver');
 *
 *     let driver = new Builder()
 *         .forBrowser('chrome')
 *         .setChromeOptions(new chrome.Options())
 *         .build();
 *
 * __Customizing the Chromium WebDriver Server__ <a id="custom-server"></a>
 *
 * Subclasses of {@link Driver} are expected to provide a static
 * getDefaultService method. By default, this method will be called every time
 * a {@link Driver} instance is created to obtain the default driver service
 * for that specific browser (e.g. Chrome or Chromium Edge). Subclasses are
 * responsible for managing the lifetime of the default service.
 *
 * You may also create a {@link Driver} with its own driver service. This is
 * useful if you need to capture the server's log output for a specific session:
 *
 *     let chrome = require('selenium-webdriver/chrome');
 *
 *     let service = new chrome.ServiceBuilder()
 *         .loggingTo('/my/log/file.txt')
 *         .enableVerboseLogging()
 *         .build();
 *
 *     let options = new chrome.Options();
 *     // configure browser options ...
 *
 *     let driver = chrome.Driver.createSession(options, service);
 *
 *     @module selenium-webdriver/chromium
 */

'use strict'

const http = require('./http')
const io = require('./io')
const { Capabilities, Capability } = require('./lib/capabilities')
const command = require('./lib/command')
const error = require('./lib/error')
const Symbols = require('./lib/symbols')
const webdriver = require('./lib/webdriver')
const remote = require('./remote')
const { getBinaryPaths } = require('./common/driverFinder')

/**
 * Custom command names supported by Chromium WebDriver.
 * @enum {string}
 */
const Command = {
  LAUNCH_APP: 'launchApp',
  GET_NETWORK_CONDITIONS: 'getNetworkConditions',
  SET_NETWORK_CONDITIONS: 'setNetworkConditions',
  DELETE_NETWORK_CONDITIONS: 'deleteNetworkConditions',
  SEND_DEVTOOLS_COMMAND: 'sendDevToolsCommand',
  SEND_AND_GET_DEVTOOLS_COMMAND: 'sendAndGetDevToolsCommand',
  SET_PERMISSION: 'setPermission',
  GET_CAST_SINKS: 'getCastSinks',
  SET_CAST_SINK_TO_USE: 'setCastSinkToUse',
  START_CAST_DESKTOP_MIRRORING: 'startDesktopMirroring',
  START_CAST_TAB_MIRRORING: 'setCastTabMirroring',
  GET_CAST_ISSUE_MESSAGE: 'getCastIssueMessage',
  STOP_CASTING: 'stopCasting',
}

/**
 * Creates a command executor with support for Chromium's custom commands.
 * @param {!Promise<string>} url The server's URL.
 * @param vendorPrefix
 * @return {!command.Executor} The new command executor.
 */
function createExecutor(url, vendorPrefix) {
  const agent = new http.Agent({ keepAlive: true })
  const client = url.then((url) => new http.HttpClient(url, agent))
  const executor = new http.Executor(client)
  configureExecutor(executor, vendorPrefix)
  return executor
}

/**
 * Configures the given executor with Chromium-specific commands.
 * @param {!http.Executor} executor the executor to configure.
 */
function configureExecutor(executor, vendorPrefix) {
  executor.defineCommand(Command.LAUNCH_APP, 'POST', '/session/:sessionId/chromium/launch_app')
  executor.defineCommand(Command.GET_NETWORK_CONDITIONS, 'GET', '/session/:sessionId/chromium/network_conditions')
  executor.defineCommand(Command.SET_NETWORK_CONDITIONS, 'POST', '/session/:sessionId/chromium/network_conditions')
  executor.defineCommand(Command.DELETE_NETWORK_CONDITIONS, 'DELETE', '/session/:sessionId/chromium/network_conditions')
  executor.defineCommand(Command.SEND_DEVTOOLS_COMMAND, 'POST', '/session/:sessionId/chromium/send_command')
  executor.defineCommand(
    Command.SEND_AND_GET_DEVTOOLS_COMMAND,
    'POST',
    '/session/:sessionId/chromium/send_command_and_get_result',
  )
  executor.defineCommand(Command.SET_PERMISSION, 'POST', '/session/:sessionId/permissions')
  executor.defineCommand(Command.GET_CAST_SINKS, 'GET', `/session/:sessionId/${vendorPrefix}/cast/get_sinks`)
  executor.defineCommand(
    Command.SET_CAST_SINK_TO_USE,
    'POST',
    `/session/:sessionId/${vendorPrefix}/cast/set_sink_to_use`,
  )
  executor.defineCommand(
    Command.START_CAST_DESKTOP_MIRRORING,
    'POST',
    `/session/:sessionId/${vendorPrefix}/cast/start_desktop_mirroring`,
  )
  executor.defineCommand(
    Command.START_CAST_TAB_MIRRORING,
    'POST',
    `/session/:sessionId/${vendorPrefix}/cast/start_tab_mirroring`,
  )
  executor.defineCommand(
    Command.GET_CAST_ISSUE_MESSAGE,
    'GET',
    `/session/:sessionId/${vendorPrefix}/cast/get_issue_message`,
  )
  executor.defineCommand(Command.STOP_CASTING, 'POST', `/session/:sessionId/${vendorPrefix}/cast/stop_casting`)
}

/**
 * Creates {@link selenium-webdriver/remote.DriverService} instances that manage
 * a WebDriver server in a child process.
 */
class ServiceBuilder extends remote.DriverService.Builder {
  /**
   * @param {string=} exe Path to the server executable to use. Subclasses
   * should ensure a valid path to the appropriate exe is provided.
   */
  constructor(exe) {
    super(exe)
    this.setLoopback(true) // Required
  }

  /**
   * Sets which port adb is listening to. _The driver will connect to adb
   * if an {@linkplain Options#androidPackage Android session} is requested, but
   * adb **must** be started beforehand._
   *
   * @param {number} port Which port adb is running on.
   * @return {!ServiceBuilder} A self reference.
   */
  setAdbPort(port) {
    return this.addArguments('--adb-port=' + port)
  }

  /**
   * Sets the path of the log file the driver should log to. If a log file is
   * not specified, the driver will log to stderr.
   * @param {string} path Path of the log file to use.
   * @return {!ServiceBuilder} A self reference.
   */
  loggingTo(path) {
    return this.addArguments('--log-path=' + path)
  }

  /**
   * Enables Chrome logging.
   * @returns {!ServiceBuilder} A self reference.
   */
  enableChromeLogging() {
    return this.addArguments('--enable-chrome-logs')
  }

  /**
   * Enables verbose logging.
   * @return {!ServiceBuilder} A self reference.
   */
  enableVerboseLogging() {
    return this.addArguments('--verbose')
  }

  /**
   * Sets the number of threads the driver should use to manage HTTP requests.
   * By default, the driver will use 4 threads.
   * @param {number} n The number of threads to use.
   * @return {!ServiceBuilder} A self reference.
   */
  setNumHttpThreads(n) {
    return this.addArguments('--http-threads=' + n)
  }

  /**
   * @override
   */
  setPath(path) {
    super.setPath(path)
    return this.addArguments('--url-base=' + path)
  }
}

/**
 * Class for managing WebDriver options specific to a Chromium-based browser.
 */
class Options extends Capabilities {
  /**
   * @param {(Capabilities|Map<string, ?>|Object)=} other Another set of
   *     capabilities to initialize this instance from.
   */
  constructor(other = undefined) {
    super(other)

    /** @private {!Object} */
    this.options_ = this.get(this.CAPABILITY_KEY) || {}

    this.setBrowserName(this.BROWSER_NAME_VALUE)
    this.set(this.CAPABILITY_KEY, this.options_)
  }

  /**
   * Add additional command line arguments to use when launching the browser.
   * Each argument may be specified with or without the "--" prefix
   * (e.g. "--foo" and "foo"). Arguments with an associated value should be
   * delimited by an "=": "foo=bar".
   *
   * @param {...(string|!Array<string>)} args The arguments to add.
   * @return {!Options} A self reference.
   */
  addArguments(...args) {
    let newArgs = (this.options_.args || []).concat(...args)
    if (newArgs.length) {
      this.options_.args = newArgs
    }
    return this
  }

  /**
   * Sets the address of a Chromium remote debugging server to connect to.
   * Address should be of the form "{hostname|IP address}:port"
   * (e.g. "localhost:9222").
   *
   * @param {string} address The address to connect to.
   * @return {!Options} A self reference.
   */
  debuggerAddress(address) {
    this.options_.debuggerAddress = address
    return this
  }

  /**
   * Sets the initial window size.
   *
   * @param {{width: number, height: number}} size The desired window size.
   * @return {!Options} A self reference.
   * @throws {TypeError} if width or height is unspecified, not a number, or
   *     less than or equal to 0.
   */
  windowSize({ width, height }) {
    function checkArg(arg) {
      if (typeof arg !== 'number' || arg <= 0) {
        throw TypeError('Arguments must be {width, height} with numbers > 0')
      }
    }

    checkArg(width)
    checkArg(height)
    return this.addArguments(`window-size=${width},${height}`)
  }

  /**
   * List of Chrome command line switches to exclude that ChromeDriver by default
   * passes when starting Chrome.  Do not prefix switches with "--".
   *
   * @param {...(string|!Array<string>)} args The switches to exclude.
   * @return {!Options} A self reference.
   */
  excludeSwitches(...args) {
    let switches = (this.options_.excludeSwitches || []).concat(...args)
    if (switches.length) {
      this.options_.excludeSwitches = switches
    }
    return this
  }

  /**
   * Add additional extensions to install when launching the browser. Each extension
   * should be specified as the path to the packed CRX file, or a Buffer for an
   * extension.
   * @param {...(string|!Buffer|!Array<(string|!Buffer)>)} args The
   *     extensions to add.
   * @return {!Options} A self reference.
   */
  addExtensions(...args) {
    let extensions = this.options_.extensions || new Extensions()
    extensions.add(...args)
    if (extensions.length) {
      this.options_.extensions = extensions
    }
    return this
  }

  /**
   * Sets the path to the browser binary to use. On Mac OS X, this path should
   * reference the actual Chromium executable, not just the application binary
   * (e.g. "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome").
   *
   * The binary path can be absolute or relative to the WebDriver server
   * executable, but it must exist on the machine that will launch the browser.
   *
   * @param {string} path The path to the browser binary to use.
   * @return {!Options} A self reference.
   */
  setBinaryPath(path) {
    this.options_.binary = path
    return this
  }

  /**
   * Sets whether to leave the started browser process running if the controlling
   * driver service is killed before {@link webdriver.WebDriver#quit()} is
   * called.
   * @param {boolean} detach Whether to leave the browser running if the
   *     driver service is killed before the session.
   * @return {!Options} A self reference.
   */
  detachDriver(detach) {
    this.options_.detach = detach
    return this
  }

  /**
   * Sets the user preferences for Chrome's user profile. See the "Preferences"
   * file in Chrome's user data directory for examples.
   * @param {!Object} prefs Dictionary of user preferences to use.
   * @return {!Options} A self reference.
   */
  setUserPreferences(prefs) {
    this.options_.prefs = prefs
    return this
  }

  /**
   * Sets the performance logging preferences. Options include:
   *
   * - `enableNetwork`: Whether or not to collect events from Network domain.
   * - `enablePage`: Whether or not to collect events from Page domain.
   * - `enableTimeline`: Whether or not to collect events from Timeline domain.
   *     Note: when tracing is enabled, Timeline domain is implicitly disabled,
   *     unless `enableTimeline` is explicitly set to true.
   * - `traceCategories`: A comma-separated string of Chromium tracing
   *     categories for which trace events should be collected. An unspecified
   *     or empty string disables tracing.
   * - `bufferUsageReportingInterval`: The requested number of milliseconds
   *     between DevTools trace buffer usage events. For example, if 1000, then
   *     once per second, DevTools will report how full the trace buffer is. If
   *     a report indicates the buffer usage is 100%, a warning will be issued.
   *
   * @param {{enableNetwork: boolean,
   *          enablePage: boolean,
   *          enableTimeline: boolean,
   *          traceCategories: string,
   *          bufferUsageReportingInterval: number}} prefs The performance
   *     logging preferences.
   * @return {!Options} A self reference.
   */
  setPerfLoggingPrefs(prefs) {
    this.options_.perfLoggingPrefs = prefs
    return this
  }

  /**
   * Sets preferences for the "Local State" file in Chrome's user data
   * directory.
   * @param {!Object} state Dictionary of local state preferences.
   * @return {!Options} A self reference.
   */
  setLocalState(state) {
    this.options_.localState = state
    return this
  }

  /**
   * Sets the name of the activity hosting a Chrome-based Android WebView. This
   * option must be set to connect to an [Android WebView](
   * https://chromedriver.chromium.org/getting-started/getting-started---android)
   *
   * @param {string} name The activity name.
   * @return {!Options} A self reference.
   */
  androidActivity(name) {
    this.options_.androidActivity = name
    return this
  }

  /**
   * Sets the device serial number to connect to via ADB. If not specified, the
   * WebDriver server will select an unused device at random. An error will be
   * returned if all devices already have active sessions.
   *
   * @param {string} serial The device serial number to connect to.
   * @return {!Options} A self reference.
   */
  androidDeviceSerial(serial) {
    this.options_.androidDeviceSerial = serial
    return this
  }

  /**
   * Sets the package name of the Chrome or WebView app.
   *
   * @param {?string} pkg The package to connect to, or `null` to disable Android
   *     and switch back to using desktop browser.
   * @return {!Options} A self reference.
   */
  androidPackage(pkg) {
    this.options_.androidPackage = pkg
    return this
  }

  /**
   * Sets the process name of the Activity hosting the WebView (as given by
   * `ps`). If not specified, the process name is assumed to be the same as
   * {@link #androidPackage}.
   *
   * @param {string} processName The main activity name.
   * @return {!Options} A self reference.
   */
  androidProcess(processName) {
    this.options_.androidProcess = processName
    return this
  }

  /**
   * Sets whether to connect to an already-running instead of the specified
   * {@linkplain #androidProcess app} instead of launching the app with a clean
   * data directory.
   *
   * @param {boolean} useRunning Whether to connect to a running instance.
   * @return {!Options} A self reference.
   */
  androidUseRunningApp(useRunning) {
    this.options_.androidUseRunningApp = useRunning
    return this
  }

  /**
   * Sets the path to the browser's log file. This path should exist on the machine
   * that will launch the browser.
   * @param {string} path Path to the log file to use.
   * @return {!Options} A self reference.
   */
  setBrowserLogFile(path) {
    this.options_.logPath = path
    return this
  }

  /**
   * Sets the directory to store browser minidumps in. This option is only
   * supported when the driver is running on Linux.
   * @param {string} path The directory path.
   * @return {!Options} A self reference.
   */
  setBrowserMinidumpPath(path) {
    this.options_.minidumpPath = path
    return this
  }

  /**
   * Configures the browser to emulate a mobile device. For more information, refer
   * to the ChromeDriver project page on [mobile emulation][em]. Configuration
   * options include:
   *
   * - `deviceName`: The name of a pre-configured [emulated device][devem]
   * - `width`: screen width, in pixels
   * - `height`: screen height, in pixels
   * - `pixelRatio`: screen pixel ratio
   *
   * __Example 1: Using a Pre-configured Device__
   *
   *     let options = new chrome.Options().setMobileEmulation(
   *         {deviceName: 'Google Nexus 5'});
   *
   *     let driver = chrome.Driver.createSession(options);
   *
   * __Example 2: Using Custom Screen Configuration__
   *
   *     let options = new chrome.Options().setMobileEmulation({deviceMetrics: {
   *         width: 360,
   *         height: 640,
   *         pixelRatio: 3.0
   *     }});
   *
   *     let driver = chrome.Driver.createSession(options);
   *
   *
   * [em]: https://chromedriver.chromium.org/mobile-emulation
   * [devem]: https://developer.chrome.com/devtools/docs/device-mode
   *
   * @param {?({deviceName: string}|
   *           {width: number, height: number, pixelRatio: number})} config The
   *     mobile emulation configuration, or `null` to disable emulation.
   * @return {!Options} A self reference.
   */
  setMobileEmulation(config) {
    this.options_.mobileEmulation = config
    return this
  }

  /**
   * Sets a list of the window types that will appear when getting window
   * handles. For access to <webview> elements, include "webview" in the list.
   * @param {...(string|!Array<string>)} args The window types that will appear
   * when getting window handles.
   * @return {!Options} A self reference.
   */
  windowTypes(...args) {
    let windowTypes = (this.options_.windowTypes || []).concat(...args)
    if (windowTypes.length) {
      this.options_.windowTypes = windowTypes
    }
    return this
  }

  /**
   * Enable bidi connection
   * @returns {!Capabilities}
   */
  enableBidi() {
    return this.set('webSocketUrl', true)
  }
}

/**
 * A list of extensions to install when launching the browser.
 */
class Extensions {
  constructor() {
    this.extensions = []
  }

  /**
   * @return {number} The length of the extensions list.
   */
  get length() {
    return this.extensions.length
  }

  /**
   * Add additional extensions to install when launching the browser. Each
   * extension should be specified as the path to the packed CRX file, or a
   * Buffer for an extension.
   *
   * @param {...(string|!Buffer|!Array<(string|!Buffer)>)} args The
   *     extensions to add.
   */
  add(...args) {
    this.extensions = this.extensions.concat(...args)
  }

  /**
   * @return {!Object} A serialized representation of this Extensions object.
   */
  [Symbols.serialize]() {
    return this.extensions.map(function (extension) {
      if (Buffer.isBuffer(extension)) {
        return extension.toString('base64')
      }
      return io.read(/** @type {string} */ (extension)).then((buffer) => buffer.toString('base64'))
    })
  }
}

/**
 * Creates a new WebDriver client for Chromium-based browsers.
 */
class Driver extends webdriver.WebDriver {
  /**
   * Creates a new session with the WebDriver server.
   *
   * @param {(Capabilities|Options)=} caps The configuration options.
   * @param {(remote.DriverService|http.Executor)=} opt_serviceExecutor Either
   *     a  DriverService to use for the remote end, or a preconfigured executor
   *     for an externally managed endpoint. If neither is provided, the
   *     {@linkplain ##getDefaultService default service} will be used by
   *     default.
   * @param vendorPrefix Either 'goog' or 'ms'
   * @param vendorCapabilityKey Either 'goog:chromeOptions' or 'ms:edgeOptions'
   * @return {!Driver} A new driver instance.
   */
  static createSession(caps, opt_serviceExecutor, vendorPrefix = '', vendorCapabilityKey = '') {
    let executor
    let onQuit
    if (opt_serviceExecutor instanceof http.Executor) {
      executor = opt_serviceExecutor
      configureExecutor(executor, vendorPrefix)
    } else {
      let service = opt_serviceExecutor || this.getDefaultService()
      if (!service.getExecutable()) {
        const { driverPath, browserPath } = getBinaryPaths(caps)
        service.setExecutable(driverPath)
        if (browserPath) {
          const vendorOptions = caps.get(vendorCapabilityKey)
          if (vendorOptions) {
            vendorOptions['binary'] = browserPath
            caps.set(vendorCapabilityKey, vendorOptions)
          } else {
            caps.set(vendorCapabilityKey, { binary: browserPath })
          }
          caps.delete(Capability.BROWSER_VERSION)
        }
      }
      onQuit = () => service.kill()
      executor = createExecutor(service.start(), vendorPrefix)
    }

    // W3C spec requires noProxy value to be an array of strings, but Chromium
    // expects a single host as a string.
    let proxy = caps.get(Capability.PROXY)
    if (proxy && Array.isArray(proxy.noProxy)) {
      proxy.noProxy = proxy.noProxy[0]
      if (!proxy.noProxy) {
        proxy.noProxy = undefined
      }
    }

    return /** @type {!Driver} */ (super.createSession(executor, caps, onQuit))
  }

  /**
   * This function is a no-op as file detectors are not supported by this
   * implementation.
   * @override
   */
  setFileDetector() {}

  /**
   * Schedules a command to launch Chrome App with given ID.
   * @param {string} id ID of the App to launch.
   * @return {!Promise<void>} A promise that will be resolved
   *     when app is launched.
   */
  launchApp(id) {
    return this.execute(new command.Command(Command.LAUNCH_APP).setParameter('id', id))
  }

  /**
   * Schedules a command to get Chromium network emulation settings.
   * @return {!Promise} A promise that will be resolved when network
   *     emulation settings are retrieved.
   */
  getNetworkConditions() {
    return this.execute(new command.Command(Command.GET_NETWORK_CONDITIONS))
  }

  /**
   * Schedules a command to delete Chromium network emulation settings.
   * @return {!Promise} A promise that will be resolved when network
   *     emulation settings have been deleted.
   */
  deleteNetworkConditions() {
    return this.execute(new command.Command(Command.DELETE_NETWORK_CONDITIONS))
  }

  /**
   * Schedules a command to set Chromium network emulation settings.
   *
   * __Sample Usage:__
   *
   *  driver.setNetworkConditions({
   *    offline: false,
   *    latency: 5, // Additional latency (ms).
   *    download_throughput: 500 * 1024, // Maximal aggregated download throughput.
   *    upload_throughput: 500 * 1024 // Maximal aggregated upload throughput.
   * });
   *
   * @param {Object} spec Defines the network conditions to set
   * @return {!Promise<void>} A promise that will be resolved when network
   *     emulation settings are set.
   */
  setNetworkConditions(spec) {
    if (!spec || typeof spec !== 'object') {
      throw TypeError('setNetworkConditions called with non-network-conditions parameter')
    }
    return this.execute(new command.Command(Command.SET_NETWORK_CONDITIONS).setParameter('network_conditions', spec))
  }

  /**
   * Sends an arbitrary devtools command to the browser.
   *
   * @param {string} cmd The name of the command to send.
   * @param {Object=} params The command parameters.
   * @return {!Promise<void>} A promise that will be resolved when the command
   *     has finished.
   * @see <https://chromedevtools.github.io/devtools-protocol/>
   */
  sendDevToolsCommand(cmd, params = {}) {
    return this.execute(
      new command.Command(Command.SEND_DEVTOOLS_COMMAND).setParameter('cmd', cmd).setParameter('params', params),
    )
  }

  /**
   * Sends an arbitrary devtools command to the browser and get the result.
   *
   * @param {string} cmd The name of the command to send.
   * @param {Object=} params The command parameters.
   * @return {!Promise<string>} A promise that will be resolved when the command
   *     has finished.
   * @see <https://chromedevtools.github.io/devtools-protocol/>
   */
  sendAndGetDevToolsCommand(cmd, params = {}) {
    return this.execute(
      new command.Command(Command.SEND_AND_GET_DEVTOOLS_COMMAND)
        .setParameter('cmd', cmd)
        .setParameter('params', params),
    )
  }

  /**
   * Set a permission state to the given value.
   *
   * @param {string} name A name of the permission to update.
   * @param {("granted"|"denied"|"prompt")} state State to set permission to.
   * @returns {!Promise<Object>} A promise that will be resolved when the
   *     command has finished.
   * @see <https://w3c.github.io/permissions/#permission-registry> for valid
   *     names
   */
  setPermission(name, state) {
    return this.execute(
      new command.Command(Command.SET_PERMISSION).setParameter('descriptor', { name }).setParameter('state', state),
    )
  }

  /**
   * Sends a DevTools command to change the browser's download directory.
   *
   * @param {string} path The desired download directory.
   * @return {!Promise<void>} A promise that will be resolved when the command
   *     has finished.
   * @see #sendDevToolsCommand
   */
  async setDownloadPath(path) {
    if (!path || typeof path !== 'string') {
      throw new error.InvalidArgumentError('invalid download path')
    }
    const stat = await io.stat(path)
    if (!stat.isDirectory()) {
      throw new error.InvalidArgumentError('not a directory: ' + path)
    }
    return this.sendDevToolsCommand('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: path,
    })
  }

  /**
   * Returns the list of cast sinks (Cast devices) available to the Chrome media router.
   *
   * @return {!promise.Thenable<void>} A promise that will be resolved with an array of Strings
   *   containing the friendly device names of available cast sink targets.
   */
  getCastSinks() {
    return this.execute(new command.Command(Command.GET_CAST_SINKS))
  }

  /**
   * Selects a cast sink (Cast device) as the recipient of media router intents (connect or play).
   *
   * @param {String} deviceName name of the target device.
   * @return {!promise.Thenable<void>} A promise that will be resolved
   *     when the target device has been selected to respond further webdriver commands.
   */
  setCastSinkToUse(deviceName) {
    return this.execute(new command.Command(Command.SET_CAST_SINK_TO_USE).setParameter('sinkName', deviceName))
  }

  /**
   * Initiates desktop mirroring for the current browser tab on the specified device.
   *
   * @param {String} deviceName name of the target device.
   * @return {!promise.Thenable<void>} A promise that will be resolved
   *     when the mirror command has been issued to the device.
   */
  startDesktopMirroring(deviceName) {
    return this.execute(new command.Command(Command.START_CAST_DESKTOP_MIRRORING).setParameter('sinkName', deviceName))
  }

  /**
   * Initiates tab mirroring for the current browser tab on the specified device.
   *
   * @param {String} deviceName name of the target device.
   * @return {!promise.Thenable<void>} A promise that will be resolved
   *     when the mirror command has been issued to the device.
   */
  startCastTabMirroring(deviceName) {
    return this.execute(new command.Command(Command.START_CAST_TAB_MIRRORING).setParameter('sinkName', deviceName))
  }

  /**
   * Returns an error message when there is any issue in a Cast session.
   * @return {!promise.Thenable<void>} A promise that will be resolved
   *     when the mirror command has been issued to the device.
   */
  getCastIssueMessage() {
    return this.execute(new command.Command(Command.GET_CAST_ISSUE_MESSAGE))
  }

  /**
   * Stops casting from media router to the specified device, if connected.
   *
   * @param {String} deviceName name of the target device.
   * @return {!promise.Thenable<void>} A promise that will be resolved
   *     when the stop command has been issued to the device.
   */
  stopCasting(deviceName) {
    return this.execute(new command.Command(Command.STOP_CASTING).setParameter('sinkName', deviceName))
  }
}

// PUBLIC API

module.exports = {
  Driver,
  Options,
  ServiceBuilder,
}
