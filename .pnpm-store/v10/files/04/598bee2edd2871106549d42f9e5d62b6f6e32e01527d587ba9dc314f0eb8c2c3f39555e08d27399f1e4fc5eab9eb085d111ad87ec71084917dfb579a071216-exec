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
 * @fileoverview Defines a WebDriver client for Safari.
 *
 * @module selenium-webdriver/safari
 */

'use strict'

const http = require('./http')
const remote = require('./remote')
const webdriver = require('./lib/webdriver')
const { Browser, Capabilities } = require('./lib/capabilities')
const { getBinaryPaths } = require('./common/driverFinder')

/**
 * Creates {@link remote.DriverService} instances that manage
 * a [safaridriver] server in a child process.
 *
 * [safaridriver]: https://developer.apple.com/library/prerelease/content/releasenotes/General/WhatsNewInSafari/Articles/Safari_10_0.html#//apple_ref/doc/uid/TP40014305-CH11-DontLinkElementID_28
 */
class ServiceBuilder extends remote.DriverService.Builder {
  /**
   * @param {string=} opt_exe Path to the server executable to use. If omitted,
   *     the builder will attempt to locate the safaridriver on the system PATH.
   */
  constructor(opt_exe) {
    super(opt_exe)
    this.setLoopback(true) // Required.
  }
}

const OPTIONS_CAPABILITY_KEY = 'safari:options'
const TECHNOLOGY_PREVIEW_OPTIONS_KEY = 'technologyPreview'

/**
 * Configuration options specific to the {@link Driver SafariDriver}.
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
    this.setBrowserName(Browser.SAFARI)
  }

  /**
   * Instruct the SafariDriver to use the Safari Technology Preview if true.
   * Otherwise, use the release version of Safari. Defaults to using the release version of Safari.
   *
   * @param {boolean} useTechnologyPreview
   * @return {!Options} A self reference.
   */
  setTechnologyPreview(useTechnologyPreview) {
    this.options_[TECHNOLOGY_PREVIEW_OPTIONS_KEY] = !!useTechnologyPreview
    return this
  }

  /**
   * Enables diagnostic logging for Safari.
   *
   * This method sets the `safari:diagnose` option to `true` in the current configuration.
   * It is used to enable additional logging or diagnostic features specific to Safari.
   *
   * @returns {Options} Returns the current instance
   */
  enableLogging() {
    this.set('safari:diagnose', true)
    return this
  }
}

/**
 * @param  {(Capabilities|Object<string, *>)=} o The options object
 * @return {boolean}
 */
function useTechnologyPreview(o) {
  if (o instanceof Capabilities) {
    let options = o.get(OPTIONS_CAPABILITY_KEY)
    return !!(options && options[TECHNOLOGY_PREVIEW_OPTIONS_KEY])
  }

  if (o && typeof o === 'object') {
    return !!o[TECHNOLOGY_PREVIEW_OPTIONS_KEY]
  }

  return false
}

const SAFARIDRIVER_TECHNOLOGY_PREVIEW_EXE = '/Applications/Safari Technology Preview.app/Contents/MacOS/safaridriver'

/**
 * A WebDriver client for Safari. This class should never be instantiated
 * directly; instead, use the {@linkplain ./builder.Builder Builder}:
 *
 *     var driver = new Builder()
 *         .forBrowser('safari')
 *         .build();
 *
 */
class Driver extends webdriver.WebDriver {
  /**
   * Creates a new Safari session.
   *
   * @param {(Options|Capabilities)=} options The configuration options.
   * @return {!Driver} A new driver instance.
   */
  static createSession(options) {
    let caps = options || new Options()

    let exe
    if (useTechnologyPreview(caps.get(OPTIONS_CAPABILITY_KEY))) {
      exe = SAFARIDRIVER_TECHNOLOGY_PREVIEW_EXE
    }

    let service = new ServiceBuilder(exe).build()
    if (!service.getExecutable()) {
      service.setExecutable(getBinaryPaths(caps).driverPath)
    }
    let executor = new http.Executor(service.start().then((url) => new http.HttpClient(url)))

    return /** @type {!Driver} */ (super.createSession(executor, caps, () => service.kill()))
  }
}

// Public API

exports.Driver = Driver
exports.Options = Options
exports.ServiceBuilder = ServiceBuilder
