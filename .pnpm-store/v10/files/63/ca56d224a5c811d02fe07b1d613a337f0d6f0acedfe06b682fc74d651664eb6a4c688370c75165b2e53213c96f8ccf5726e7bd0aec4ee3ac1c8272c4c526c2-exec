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
 * @fileoverview Defines a {@linkplain Driver WebDriver} client for the Chrome
 * web browser. Before using this module, you must download the latest
 * [ChromeDriver release] and ensure it can be found on your system [PATH].
 *
 * There are three primary classes exported by this module:
 *
 * 1. {@linkplain ServiceBuilder}: configures the
 *     {@link selenium-webdriver/remote.DriverService remote.DriverService}
 *     that manages the [ChromeDriver] child process.
 *
 * 2. {@linkplain Options}: defines configuration options for each new Chrome
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
 * __Customizing the ChromeDriver Server__ <a id="custom-server"></a>
 *
 * By default, every Chrome session will use a single driver service, which is
 * started the first time a {@link Driver} instance is created and terminated
 * when this process exits. The default service will inherit its environment
 * from the current process and direct all output to /dev/null. You may obtain
 * a handle to this default service using
 * {@link #getDefaultService getDefaultService()} and change its configuration
 * with {@link #setDefaultService setDefaultService()}.
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
 * Users should only instantiate the {@link Driver} class directly when they
 * need a custom driver service configuration (as shown above). For normal
 * operation, users should start Chrome using the
 * {@link selenium-webdriver.Builder}.
 *
 * __Working with Android__ <a id="android"></a>
 *
 * The [ChromeDriver][android] supports running tests on the Chrome browser as
 * well as [WebView apps][webview] starting in Android 4.4 (KitKat). In order to
 * work with Android, you must first start the adb
 *
 *     adb start-server
 *
 * By default, adb will start on port 5037. You may change this port, but this
 * will require configuring a [custom server](#custom-server) that will connect
 * to adb on the {@linkplain ServiceBuilder#setAdbPort correct port}:
 *
 *     let service = new chrome.ServiceBuilder()
 *         .setAdbPort(1234)
 *         build();
 *     // etc.
 *
 * The ChromeDriver may be configured to launch Chrome on Android using
 * {@link Options#androidChrome()}:
 *
 *     let driver = new Builder()
 *         .forBrowser('chrome')
 *         .setChromeOptions(new chrome.Options().androidChrome())
 *         .build();
 *
 * Alternatively, you can configure the ChromeDriver to launch an app with a
 * Chrome-WebView by setting the {@linkplain Options#androidActivity
 * androidActivity} option:
 *
 *     let driver = new Builder()
 *         .forBrowser('chrome')
 *         .setChromeOptions(new chrome.Options()
 *             .androidPackage('com.example')
 *             .androidActivity('com.example.Activity'))
 *         .build();
 *
 * [Refer to the ChromeDriver site] for more information on using the
 * [ChromeDriver with Android][android].
 *
 * [ChromeDriver]: https://chromedriver.chromium.org/
 * [ChromeDriver release]: http://chromedriver.storage.googleapis.com/index.html
 * [PATH]: http://en.wikipedia.org/wiki/PATH_%28variable%29
 * [android]: https://chromedriver.chromium.org/getting-started/getting-started---android
 * [webview]: https://developer.chrome.com/multidevice/webview/overview
 *
 * @module selenium-webdriver/chrome
 */

'use strict'

const { Browser } = require('./lib/capabilities')
const chromium = require('./chromium')
const CHROME_CAPABILITY_KEY = 'goog:chromeOptions'

/** @type {remote.DriverService} */

/**
 * Creates {@link selenium-webdriver/remote.DriverService} instances that manage
 * a [ChromeDriver](https://chromedriver.chromium.org/)
 * server in a child process.
 */
class ServiceBuilder extends chromium.ServiceBuilder {
  /**
   * @param {string=} opt_exe Path to the server executable to use. If omitted,
   *     the builder will attempt to locate the chromedriver on the current
   *     PATH. If the chromedriver is not available in path, selenium-manager will
   *     download the chromedriver
   * @throws {Error} If provided executable does not exist, or the chromedriver
   *     cannot be found on the PATH.
   */
  constructor(opt_exe) {
    super(opt_exe)
  }
}

/**
 * Class for managing ChromeDriver specific options.
 */
class Options extends chromium.Options {
  /**
   * Sets the path to the Chrome binary to use. On Mac OS X, this path should
   * reference the actual Chrome executable, not just the application binary
   * (e.g. "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome").
   *
   * The binary path be absolute or relative to the chromedriver server
   * executable, but it must exist on the machine that will launch Chrome.
   *
   * @param {string} path The path to the Chrome binary to use.
   * @return {!Options} A self reference.
   */
  setChromeBinaryPath(path) {
    return this.setBinaryPath(path)
  }

  /**
   * Configures the ChromeDriver to launch Chrome on Android via adb. This
   * function is shorthand for
   * {@link #androidPackage options.androidPackage('com.android.chrome')}.
   * @return {!Options} A self reference.
   */
  androidChrome() {
    return this.androidPackage('com.android.chrome')
  }

  /**
   * Sets the path to Chrome's log file. This path should exist on the machine
   * that will launch Chrome.
   * @param {string} path Path to the log file to use.
   * @return {!Options} A self reference.
   */
  setChromeLogFile(path) {
    return this.setBrowserLogFile(path)
  }

  /**
   * Sets the directory to store Chrome minidumps in. This option is only
   * supported when ChromeDriver is running on Linux.
   * @param {string} path The directory path.
   * @return {!Options} A self reference.
   */
  setChromeMinidumpPath(path) {
    return this.setBrowserMinidumpPath(path)
  }
}

/**
 * Creates a new WebDriver client for Chrome.
 */
class Driver extends chromium.Driver {
  /**
   * Creates a new session with the ChromeDriver.
   *
   * @param {(Capabilities|Options)=} opt_config The configuration options.
   * @param {(remote.DriverService|http.Executor)=} opt_serviceExecutor Either
   *     a  DriverService to use for the remote end, or a preconfigured executor
   *     for an externally managed endpoint. If neither is provided, the
   *     {@linkplain ##getDefaultService default service} will be used by
   *     default.
   * @return {!Driver} A new driver instance.
   */
  static createSession(opt_config, opt_serviceExecutor) {
    let caps = opt_config || new Options()
    return /** @type {!Driver} */ (super.createSession(caps, opt_serviceExecutor, 'goog', CHROME_CAPABILITY_KEY))
  }

  /**
   * returns new instance chrome driver service
   * @returns {remote.DriverService}
   */
  static getDefaultService() {
    return new ServiceBuilder().build()
  }
}

Options.prototype.CAPABILITY_KEY = CHROME_CAPABILITY_KEY
Options.prototype.BROWSER_NAME_VALUE = Browser.CHROME

// PUBLIC API
module.exports = {
  Driver,
  Options,
  ServiceBuilder,
}
