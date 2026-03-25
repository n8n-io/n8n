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
 * @fileoverview Defines the {@linkplain Driver WebDriver} client for Firefox.
 * Before using this module, you must download the latest
 * [geckodriver release] and ensure it can be found on your system [PATH].
 *
 * Each FirefoxDriver instance will be created with an anonymous profile,
 * ensuring browser historys do not share session data (cookies, history, cache,
 * offline storage, etc.)
 *
 * __Customizing the Firefox Profile__
 *
 * The profile used for each WebDriver session may be configured using the
 * {@linkplain Options} class. For example, you may install an extension, like
 * Firebug:
 *
 *     const {Builder} = require('selenium-webdriver');
 *     const firefox = require('selenium-webdriver/firefox');
 *
 *     let options = new firefox.Options()
 *         .addExtensions('/path/to/firebug.xpi')
 *         .setPreference('extensions.firebug.showChromeErrors', true);
 *
 *     let driver = new Builder()
 *         .forBrowser('firefox')
 *         .setFirefoxOptions(options)
 *         .build();
 *
 * The {@linkplain Options} class may also be used to configure WebDriver based
 * on a pre-existing browser profile:
 *
 *     let profile = '/usr/local/home/bob/.mozilla/firefox/3fgog75h.testing';
 *     let options = new firefox.Options().setProfile(profile);
 *
 * The FirefoxDriver will _never_ modify a pre-existing profile; instead it will
 * create a copy for it to modify. By extension, there are certain browser
 * preferences that are required for WebDriver to function properly and they
 * will always be overwritten.
 *
 * __Using a Custom Firefox Binary__
 *
 * On Windows and MacOS, the FirefoxDriver will search for Firefox in its
 * default installation location:
 *
 * - Windows: C:\Program Files and C:\Program Files (x86).
 * - MacOS: /Applications/Firefox.app
 *
 * For Linux, Firefox will always be located on the PATH: `$(where firefox)`.
 *
 * You can provide a custom location for Firefox by setting the binary in the
 * {@link Options}:setBinary method.
 *
 *     const {Builder} = require('selenium-webdriver');
 *     const firefox = require('selenium-webdriver/firefox');
 *
 *    let options = new firefox.Options()
 *         .setBinary('/my/firefox/install/dir/firefox');
 *     let driver = new Builder()
 *         .forBrowser('firefox')
 *         .setFirefoxOptions(options)
 *         .build();
 *
 * __Remote Testing__
 *
 * You may customize the Firefox binary and profile when running against a
 * remote Selenium server. Your custom profile will be packaged as a zip and
 * transferred to the remote host for use. The profile will be transferred
 * _once for each new session_. The performance impact should be minimal if
 * you've only configured a few extra browser preferences. If you have a large
 * profile with several extensions, you should consider installing it on the
 * remote host and defining its path via the {@link Options} class. Custom
 * binaries are never copied to remote machines and must be referenced by
 * installation path.
 *
 *     const {Builder} = require('selenium-webdriver');
 *     const firefox = require('selenium-webdriver/firefox');
 *
 *     let options = new firefox.Options()
 *         .setProfile('/profile/path/on/remote/host')
 *         .setBinary('/install/dir/on/remote/host/firefox');
 *
 *     let driver = new Builder()
 *         .forBrowser('firefox')
 *         .usingServer('http://127.0.0.1:4444/wd/hub')
 *         .setFirefoxOptions(options)
 *         .build();
 *
 * [geckodriver release]: https://github.com/mozilla/geckodriver/releases/
 * [PATH]: http://en.wikipedia.org/wiki/PATH_%28variable%29
 *
 * @module selenium-webdriver/firefox
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const Symbols = require('./lib/symbols')
const command = require('./lib/command')
const http = require('./http')
const io = require('./io')
const remote = require('./remote')
const webdriver = require('./lib/webdriver')
const zip = require('./io/zip')
const { Browser, Capabilities, Capability } = require('./lib/capabilities')
const { Zip } = require('./io/zip')
const { getBinaryPaths } = require('./common/driverFinder')
const { findFreePort } = require('./net/portprober')
const FIREFOX_CAPABILITY_KEY = 'moz:firefoxOptions'

/**
 * Thrown when there an add-on is malformed.
 * @final
 */
class AddonFormatError extends Error {
  /** @param {string} msg The error message. */
  constructor(msg) {
    super(msg)
    /** @override */
    this.name = this.constructor.name
  }
}

/**
 * Installs an extension to the given directory.
 * @param {string} extension Path to the xpi extension file to install.
 * @param {string} dir Path to the directory to install the extension in.
 * @return {!Promise<string>} A promise for the add-on ID once
 *     installed.
 */
async function installExtension(extension, dir) {
  const ext = extension.slice(-4)
  if (ext !== '.xpi' && ext !== '.zip') {
    throw Error('File name does not end in ".zip" or ".xpi": ' + ext)
  }

  let archive = await zip.load(extension)
  if (!archive.has('manifest.json')) {
    throw new AddonFormatError(`Couldn't find manifest.json in ${extension}`)
  }

  let buf = await archive.getFile('manifest.json')
  let parsedJSON = JSON.parse(buf.toString('utf8'))

  let { browser_specific_settings } =
    /** @type {{browser_specific_settings:{gecko:{id:string}}}} */
    parsedJSON

  if (browser_specific_settings && browser_specific_settings.gecko) {
    /* browser_specific_settings is an alternative to applications
     * It is meant to facilitate cross-browser plugins since Firefox48
     * see https://bugzilla.mozilla.org/show_bug.cgi?id=1262005
     */
    parsedJSON.applications = browser_specific_settings
  }

  let { applications } =
    /** @type {{applications:{gecko:{id:string}}}} */
    parsedJSON
  if (!(applications && applications.gecko && applications.gecko.id)) {
    throw new AddonFormatError(`Could not find add-on ID for ${extension}`)
  }

  await io.copy(extension, `${path.join(dir, applications.gecko.id)}.xpi`)
  return applications.gecko.id
}

class Profile {
  constructor() {
    /** @private {?string} */
    this.template_ = null

    /** @private {!Array<string>} */
    this.extensions_ = []
  }

  addExtensions(/** !Array<string> */ paths) {
    this.extensions_ = this.extensions_.concat(...paths)
  }

  /**
   * @return {(!Promise<string>|undefined)} a promise for a base64 encoded
   *     profile, or undefined if there's no data to include.
   */
  [Symbols.serialize]() {
    if (this.template_ || this.extensions_.length) {
      return buildProfile(this.template_, this.extensions_)
    }
    return undefined
  }
}

/**
 * @param {?string} template path to an existing profile to use as a template.
 * @param {!Array<string>} extensions paths to extensions to install in the new
 *     profile.
 * @return {!Promise<string>} a promise for the base64 encoded profile.
 */
async function buildProfile(template, extensions) {
  let dir = template

  if (extensions.length) {
    dir = await io.tmpDir()
    if (template) {
      await io.copyDir(/** @type {string} */ (template), dir, /(parent\.lock|lock|\.parentlock)/)
    }

    const extensionsDir = path.join(dir, 'extensions')
    await io.mkdir(extensionsDir)

    for (let i = 0; i < extensions.length; i++) {
      await installExtension(extensions[i], extensionsDir)
    }
  }

  let zip = new Zip()
  return zip
    .addDir(dir)
    .then(() => zip.toBuffer())
    .then((buf) => buf.toString('base64'))
}

/**
 * Configuration options for the FirefoxDriver.
 */
class Options extends Capabilities {
  /**
   * @param {(Capabilities|Map<string, ?>|Object)=} other Another set of
   *     capabilities to initialize this instance from.
   */
  constructor(other) {
    super(other)
    this.setBrowserName(Browser.FIREFOX)
    // https://fxdx.dev/deprecating-cdp-support-in-firefox-embracing-the-future-with-webdriver-bidi/.
    // Enable BiDi only
    this.setPreference('remote.active-protocols', 1)
  }

  /**
   * @return {!Object}
   * @private
   */
  firefoxOptions_() {
    let options = this.get(FIREFOX_CAPABILITY_KEY)
    if (!options) {
      options = {}
      this.set(FIREFOX_CAPABILITY_KEY, options)
    }
    return options
  }

  /**
   * @return {!Profile}
   * @private
   */
  profile_() {
    let options = this.firefoxOptions_()
    if (!options.profile) {
      options.profile = new Profile()
    }
    return options.profile
  }

  /**
   * Specify additional command line arguments that should be used when starting
   * the Firefox browser.
   *
   * @param {...(string|!Array<string>)} args The arguments to include.
   * @return {!Options} A self reference.
   */
  addArguments(...args) {
    if (args.length) {
      let options = this.firefoxOptions_()
      options.args = options.args ? options.args.concat(...args) : args
    }
    return this
  }

  /**
   * Sets the initial window size
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
    return this.addArguments(`--width=${width}`, `--height=${height}`)
  }

  /**
   * Add extensions that should be installed when starting Firefox.
   *
   * @param {...string} paths The paths to the extension XPI files to install.
   * @return {!Options} A self reference.
   */
  addExtensions(...paths) {
    this.profile_().addExtensions(paths)
    return this
  }

  /**
   * @param {string} key the preference key.
   * @param {(string|number|boolean)} value the preference value.
   * @return {!Options} A self reference.
   * @throws {TypeError} if either the key or value has an invalid type.
   */
  setPreference(key, value) {
    if (typeof key !== 'string') {
      throw TypeError(`key must be a string, but got ${typeof key}`)
    }
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      throw TypeError(`value must be a string, number, or boolean, but got ${typeof value}`)
    }
    let options = this.firefoxOptions_()
    options.prefs = options.prefs || {}
    options.prefs[key] = value
    return this
  }

  /**
   * Sets the path to an existing profile to use as a template for new browser
   * sessions. This profile will be copied for each new session - changes will
   * not be applied to the profile itself.
   *
   * @param {string} profile The profile to use.
   * @return {!Options} A self reference.
   * @throws {TypeError} if profile is not a string.
   */
  setProfile(profile) {
    if (typeof profile !== 'string') {
      throw TypeError(`profile must be a string, but got ${typeof profile}`)
    }
    this.profile_().template_ = profile
    return this
  }

  /**
   * Sets the binary to use. The binary may be specified as the path to a
   * Firefox executable.
   *
   * @param {(string)} binary The binary to use.
   * @return {!Options} A self reference.
   * @throws {TypeError} If `binary` is an invalid type.
   */
  setBinary(binary) {
    if (binary instanceof Channel || typeof binary === 'string') {
      this.firefoxOptions_().binary = binary
      return this
    }
    throw TypeError('binary must be a string path ')
  }

  /**
   * Enables Mobile start up features
   *
   * @param {string} androidPackage The package to use
   * @return {!Options} A self reference
   */
  enableMobile(androidPackage = 'org.mozilla.firefox', androidActivity = null, deviceSerial = null) {
    this.firefoxOptions_().androidPackage = androidPackage

    if (androidActivity) {
      this.firefoxOptions_().androidActivity = androidActivity
    }
    if (deviceSerial) {
      this.firefoxOptions_().deviceSerial = deviceSerial
    }
    return this
  }

  /**
   * Enables moz:debuggerAddress for firefox cdp
   */
  enableDebugger() {
    return this.set('moz:debuggerAddress', true)
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
 * Enum of available command contexts.
 *
 * Command contexts are specific to Marionette, and may be used with the
 * {@link #context=} method. Contexts allow you to direct all subsequent
 * commands to either "content" (default) or "chrome". The latter gives
 * you elevated security permissions.
 *
 * @enum {string}
 */
const Context = {
  CONTENT: 'content',
  CHROME: 'chrome',
}

/**
 * @param {string} file Path to the file to find, relative to the program files
 *     root.
 * @return {!Promise<?string>} A promise for the located executable.
 *     The promise will resolve to {@code null} if Firefox was not found.
 */
function findInProgramFiles(file) {
  let files = [
    process.env['PROGRAMFILES'] || 'C:\\Program Files',
    process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
  ].map((prefix) => path.join(prefix, file))
  return io.exists(files[0]).then(function (exists) {
    return exists
      ? files[0]
      : io.exists(files[1]).then(function (exists) {
          return exists ? files[1] : null
        })
  })
}

/** @enum {string} */
const ExtensionCommand = {
  GET_CONTEXT: 'getContext',
  SET_CONTEXT: 'setContext',
  INSTALL_ADDON: 'install addon',
  UNINSTALL_ADDON: 'uninstall addon',
  FULL_PAGE_SCREENSHOT: 'fullPage screenshot',
}

/**
 * Creates a command executor with support for Marionette's custom commands.
 * @param {!Promise<string>} serverUrl The server's URL.
 * @return {!command.Executor} The new command executor.
 */
function createExecutor(serverUrl) {
  let client = serverUrl.then((url) => new http.HttpClient(url))
  let executor = new http.Executor(client)
  configureExecutor(executor)
  return executor
}

/**
 * Configures the given executor with Firefox-specific commands.
 * @param {!http.Executor} executor the executor to configure.
 */
function configureExecutor(executor) {
  executor.defineCommand(ExtensionCommand.GET_CONTEXT, 'GET', '/session/:sessionId/moz/context')

  executor.defineCommand(ExtensionCommand.SET_CONTEXT, 'POST', '/session/:sessionId/moz/context')

  executor.defineCommand(ExtensionCommand.INSTALL_ADDON, 'POST', '/session/:sessionId/moz/addon/install')

  executor.defineCommand(ExtensionCommand.UNINSTALL_ADDON, 'POST', '/session/:sessionId/moz/addon/uninstall')

  executor.defineCommand(ExtensionCommand.FULL_PAGE_SCREENSHOT, 'GET', '/session/:sessionId/moz/screenshot/full')
}

/**
 * Creates {@link selenium-webdriver/remote.DriverService} instances that manage
 * a [geckodriver](https://github.com/mozilla/geckodriver) server in a child
 * process.
 */
class ServiceBuilder extends remote.DriverService.Builder {
  /**
   * @param {string=} opt_exe Path to the server executable to use. If omitted,
   *     the builder will attempt to locate the geckodriver on the system PATH.
   */
  constructor(opt_exe) {
    super(opt_exe)
    this.setLoopback(true) // Required.
  }

  /**
   * Enables verbose logging.
   *
   * @param {boolean=} opt_trace Whether to enable trace-level logging. By
   *     default, only debug logging is enabled.
   * @return {!ServiceBuilder} A self reference.
   */
  enableVerboseLogging(opt_trace) {
    return this.addArguments(opt_trace ? '-vv' : '-v')
  }

  /**
   * Overrides the parent build() method to add the websocket port argument
   * for Firefox when not connecting to an existing instance.
   *
   * @return {!DriverService} A new driver service instance.
   */
  build() {
    let port = this.options_.port || findFreePort()
    let argsPromise = Promise.resolve(port).then((port) => {
      // Start with the default --port argument.
      let args = this.options_.args.concat(`--port=${port}`)
      // If the "--connect-existing" flag is not set, add the websocket port.
      if (!this.options_.args.some((arg) => arg === '--connect-existing')) {
        return findFreePort().then((wsPort) => {
          args.push(`--websocket-port=${wsPort}`)
          return args
        })
      }
      return args
    })

    let options = Object.assign({}, this.options_, { args: argsPromise, port })
    return new remote.DriverService(this.exe_, options)
  }
}

/**
 * A WebDriver client for Firefox.
 */
class Driver extends webdriver.WebDriver {
  /**
   * Creates a new Firefox session.
   *
   * @param {(Options|Capabilities|Object)=} opt_config The
   *    configuration options for this driver, specified as either an
   *    {@link Options} or {@link Capabilities}, or as a raw hash object.
   * @param {(http.Executor|remote.DriverService)=} opt_executor Either a
   *   pre-configured command executor to use for communicating with an
   *   externally managed remote end (which is assumed to already be running),
   *   or the `DriverService` to use to start the geckodriver in a child
   *   process.
   *
   *   If an executor is provided, care should e taken not to use reuse it with
   *   other clients as its internal command mappings will be updated to support
   *   Firefox-specific commands.
   *
   *   _This parameter may only be used with Mozilla's GeckoDriver._
   *
   * @throws {Error} If a custom command executor is provided and the driver is
   *     configured to use the legacy FirefoxDriver from the Selenium project.
   * @return {!Driver} A new driver instance.
   */
  static createSession(opt_config, opt_executor) {
    let caps = opt_config instanceof Capabilities ? opt_config : new Options(opt_config)

    let firefoxBrowserPath = null

    let executor
    let onQuit

    if (opt_executor instanceof http.Executor) {
      executor = opt_executor
      configureExecutor(executor)
    } else if (opt_executor instanceof remote.DriverService) {
      if (!opt_executor.getExecutable()) {
        const { driverPath, browserPath } = getBinaryPaths(caps)
        opt_executor.setExecutable(driverPath)
        firefoxBrowserPath = browserPath
      }
      executor = createExecutor(opt_executor.start())
      onQuit = () => opt_executor.kill()
    } else {
      let service = new ServiceBuilder().build()
      if (!service.getExecutable()) {
        const { driverPath, browserPath } = getBinaryPaths(caps)
        service.setExecutable(driverPath)
        firefoxBrowserPath = browserPath
      }
      executor = createExecutor(service.start())
      onQuit = () => service.kill()
    }

    if (firefoxBrowserPath) {
      const vendorOptions = caps.get(FIREFOX_CAPABILITY_KEY)
      if (vendorOptions) {
        vendorOptions['binary'] = firefoxBrowserPath
        caps.set(FIREFOX_CAPABILITY_KEY, vendorOptions)
      } else {
        caps.set(FIREFOX_CAPABILITY_KEY, { binary: firefoxBrowserPath })
      }
      caps.delete(Capability.BROWSER_VERSION)
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
   * Get the context that is currently in effect.
   *
   * @return {!Promise<Context>} Current context.
   */
  getContext() {
    return this.execute(new command.Command(ExtensionCommand.GET_CONTEXT))
  }

  /**
   * Changes target context for commands between chrome- and content.
   *
   * Changing the current context has a stateful impact on all subsequent
   * commands. The {@link Context.CONTENT} context has normal web
   * platform document permissions, as if you would evaluate arbitrary
   * JavaScript. The {@link Context.CHROME} context gets elevated
   * permissions that lets you manipulate the browser chrome itself,
   * with full access to the XUL toolkit.
   *
   * Use your powers wisely.
   *
   * @param {!Promise<void>} ctx The context to switch to.
   */
  setContext(ctx) {
    return this.execute(new command.Command(ExtensionCommand.SET_CONTEXT).setParameter('context', ctx))
  }

  /**
   * Installs a new addon with the current session. This function will return an
   * ID that may later be used to {@linkplain #uninstallAddon uninstall} the
   * addon.
   *
   *
   * @param {string} path Path on the local filesystem to the web extension to
   *     install.
   * @param {boolean} temporary Flag indicating whether the extension should be
   *     installed temporarily - gets removed on restart
   * @return {!Promise<string>} A promise that will resolve to an ID for the
   *     newly installed addon.
   * @see #uninstallAddon
   */
  async installAddon(path, temporary = false) {
    let stats = fs.statSync(path)
    let buf
    if (stats.isDirectory()) {
      let zip = new Zip()
      await zip.addDir(path)
      buf = await zip.toBuffer('DEFLATE')
    } else {
      buf = await io.read(path)
    }
    return this.execute(
      new command.Command(ExtensionCommand.INSTALL_ADDON)
        .setParameter('addon', buf.toString('base64'))
        .setParameter('temporary', temporary),
    )
  }

  /**
   * Uninstalls an addon from the current browser session's profile.
   *
   * @param {(string|!Promise<string>)} id ID of the addon to uninstall.
   * @return {!Promise} A promise that will resolve when the operation has
   *     completed.
   * @see #installAddon
   */
  async uninstallAddon(id) {
    id = await Promise.resolve(id)
    return this.execute(new command.Command(ExtensionCommand.UNINSTALL_ADDON).setParameter('id', id))
  }

  /**
   * Take full page screenshot of the visible region
   *
   * @return {!Promise<string>} A promise that will be
   *     resolved to the screenshot as a base-64 encoded PNG.
   */
  takeFullPageScreenshot() {
    return this.execute(new command.Command(ExtensionCommand.FULL_PAGE_SCREENSHOT))
  }
}

/**
 * Provides methods for locating the executable for a Firefox release channel
 * on Windows and MacOS. For other systems (i.e. Linux), Firefox will always
 * be located on the system PATH.
 * @deprecated Instead of using this class, you should configure the
 *    {@link Options} with the appropriate binary location or let Selenium
 *    Manager handle it for you.
 * @final
 */
class Channel {
  /**
   * @param {string} darwin The path to check when running on MacOS.
   * @param {string} win32 The path to check when running on Windows.
   */
  constructor(darwin, win32) {
    /** @private @const */ this.darwin_ = darwin
    /** @private @const */ this.win32_ = win32
    /** @private {Promise<string>} */
    this.found_ = null
  }

  /**
   * Attempts to locate the Firefox executable for this release channel. This
   * will first check the default installation location for the channel before
   * checking the user's PATH. The returned promise will be rejected if Firefox
   * can not be found.
   *
   * @return {!Promise<string>} A promise for the location of the located
   *     Firefox executable.
   */
  locate() {
    if (this.found_) {
      return this.found_
    }

    let found
    switch (process.platform) {
      case 'darwin':
        found = io.exists(this.darwin_).then((exists) => (exists ? this.darwin_ : io.findInPath('firefox')))
        break

      case 'win32':
        found = findInProgramFiles(this.win32_).then((found) => found || io.findInPath('firefox.exe'))
        break

      default:
        found = Promise.resolve(io.findInPath('firefox'))
        break
    }

    this.found_ = found.then((found) => {
      if (found) {
        // TODO: verify version info.
        return found
      }
      throw Error('Could not locate Firefox on the current system')
    })
    return this.found_
  }

  /** @return {!Promise<string>} */
  [Symbols.serialize]() {
    return this.locate()
  }
}

/**
 * Firefox's developer channel.
 * @const
 * @see <https://www.mozilla.org/en-US/firefox/channel/desktop/#developer>
 */
Channel.DEV = new Channel(
  '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
  'Firefox Developer Edition\\firefox.exe',
)

/**
 * Firefox's beta channel. Note this is provided mainly for convenience as
 * the beta channel has the same installation location as the main release
 * channel.
 * @const
 * @see <https://www.mozilla.org/en-US/firefox/channel/desktop/#beta>
 */
Channel.BETA = new Channel('/Applications/Firefox.app/Contents/MacOS/firefox', 'Mozilla Firefox\\firefox.exe')

/**
 * Firefox's release channel.
 * @const
 * @see <https://www.mozilla.org/en-US/firefox/desktop/>
 */
Channel.RELEASE = new Channel('/Applications/Firefox.app/Contents/MacOS/firefox', 'Mozilla Firefox\\firefox.exe')

/**
 * Firefox's nightly release channel.
 * @const
 * @see <https://www.mozilla.org/en-US/firefox/channel/desktop/#nightly>
 */
Channel.NIGHTLY = new Channel('/Applications/Firefox Nightly.app/Contents/MacOS/firefox', 'Nightly\\firefox.exe')

// PUBLIC API

module.exports = {
  Channel,
  Context,
  Driver,
  Options,
  ServiceBuilder,
}
