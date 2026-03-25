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
 * @fileoverview Defines a {@linkplain Driver WebDriver} client for
 * Microsoft's Edge web browser. Edge (Chromium) is supported and support
 * for Edge Legacy (EdgeHTML) as part of https://github.com/SeleniumHQ/selenium/issues/9166.
 * Before using this module, you must download and install the correct
 * [WebDriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/) server.
 *
 * Ensure that the msedgedriver (Chromium)
 * is on your [PATH](http://en.wikipedia.org/wiki/PATH_%28variable%29).
 *
 * You may use {@link Options} to specify whether Edge Chromium options should be used:

 *     const edge = require('selenium-webdriver/edge');
 *     const options = new edge.Options();

 * There are three primary classes exported by this module:
 *
 * 1. {@linkplain ServiceBuilder}: configures the
 *     {@link ./remote.DriverService remote.DriverService}
 *     that manages the [WebDriver] child process.
 *
 * 2. {@linkplain Options}: defines configuration options for each new
 *     WebDriver session, such as which
 *     {@linkplain Options#setProxy proxy} to use when starting the browser.
 *
 * 3. {@linkplain Driver}: the WebDriver client; each new instance will control
 *     a unique browser session.
 *
 * __Customizing the WebDriver Server__ <a id="custom-server"></a>
 *
 * By default, every MicrosoftEdge session will use a single driver service,
 * which is started the first time a {@link Driver} instance is created and
 * terminated when this process exits. The default service will inherit its
 * environment from the current process.
 * You may obtain a handle to this default service using
 * {@link #getDefaultService getDefaultService()} and change its configuration
 * with {@link #setDefaultService setDefaultService()}.
 *
 * You may also create a {@link Driver} with its own driver service. This is
 * useful if you need to capture the server's log output for a specific session:
 *
 *     const edge = require('selenium-webdriver/edge');
 *
 *     const service = new edge.ServiceBuilder()
 *         .setPort(55555)
 *         .build();
 *
 *     let options = new edge.Options();
 *     // configure browser options ...
 *
 *     let driver = edge.Driver.createSession(options, service);
 *
 * Users should only instantiate the {@link Driver} class directly when they
 * need a custom driver service configuration (as shown above). For normal
 * operation, users should start msedgedriver using the
 * {@link ./builder.Builder selenium-webdriver.Builder}.
 *
 * [WebDriver (Chromium)]: https://docs.microsoft.com/en-us/microsoft-edge/webdriver-chromium
 *
 * @module selenium-webdriver/edge
 */

'use strict'

const { Browser } = require('./lib/capabilities')
const chromium = require('./chromium')
const EDGE_CAPABILITY_KEY = 'ms:edgeOptions'

/** @type {remote.DriverService} */

/**
 * Creates {@link selenium-webdriver/remote.DriverService} instances that manage
 * a [MSEdgeDriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/)
 * server in a child process.
 */
class ServiceBuilder extends chromium.ServiceBuilder {
  /**
   * @param {string=} opt_exe Path to the server executable to use. If omitted,
   *     the builder will attempt to locate the msedgedriver on the current
   *     PATH.
   * @throws {Error} If provided executable does not exist, or the msedgedriver
   *     cannot be found on the PATH.
   */
  constructor(opt_exe) {
    super(opt_exe)
    this.setLoopback(true)
  }
}

/**
 * Class for managing edge chromium specific options.
 */
class Options extends chromium.Options {
  /**
   * Sets the path to the edge binary to use
   *
   * The binary path be absolute or relative to the msedgedriver server
   * executable, but it must exist on the machine that will launch edge chromium.
   *
   * @param {string} path The path to the msedgedriver binary to use.
   * @return {!Options} A self reference.
   */
  setEdgeChromiumBinaryPath(path) {
    return this.setBinaryPath(path)
  }

  /**
   * Changes the browser name to 'webview2' to enable
   * <a href="https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/webdriver">
   *   test automation of WebView2 apps with Microsoft Edge WebDriver
   * </a>
   *
   * @param {boolean} enable  flag to enable or disable the 'webview2' usage
   */
  useWebView(enable) {
    const browserName = enable ? 'webview2' : Browser.EDGE
    return this.setBrowserName(browserName)
  }
}

/**
 * Creates a new WebDriver client for Microsoft's Edge.
 */
class Driver extends chromium.Driver {
  /**
   * Creates a new browser session for Microsoft's Edge browser.
   *
   * @param {(Capabilities|Options)=} opt_config The configuration options.
   * @param {remote.DriverService=} opt_serviceExecutor The service to use; will create
   *     a new Legacy or Chromium service based on {@linkplain Options} by default.
   * @return {!Driver} A new driver instance.
   */
  static createSession(opt_config, opt_serviceExecutor) {
    let caps = opt_config || new Options()
    return /** @type {!Driver} */ (super.createSession(caps, opt_serviceExecutor, 'ms', EDGE_CAPABILITY_KEY))
  }

  /**
   * returns new instance of edge driver service
   * @returns {remote.DriverService}
   */
  static getDefaultService() {
    return new ServiceBuilder().build()
  }

  /**
   * This function is a no-op as file detectors are not supported by this
   * implementation.
   * @override
   */
  setFileDetector() {}
}

Options.prototype.BROWSER_NAME_VALUE = Browser.EDGE
Options.prototype.CAPABILITY_KEY = EDGE_CAPABILITY_KEY

// PUBLIC API

module.exports = {
  Driver,
  Options,
  ServiceBuilder,
}
