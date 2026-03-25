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
 * @fileoverview Provides extensions for
 * [Jasmine](https://jasmine.github.io) and [Mocha](https://mochajs.org).
 *
 * You may conditionally suppress a test function using the exported
 * "ignore" function. If the provided predicate returns true, the attached
 * test case will be skipped:
 *
 *     test.ignore(maybe()).it('is flaky', function() {
 *       if (Math.random() < 0.5) throw Error();
 *     });
 *
 *     function maybe() { return Math.random() < 0.5; }
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { isatty } = require('node:tty')
const chrome = require('../chrome')
const edge = require('../edge')
const firefox = require('../firefox')
const ie = require('../ie')
const remote = require('../remote')
const safari = require('../safari')
const { Browser } = require('../lib/capabilities')
const { Builder } = require('../index')
const { getBinaryPaths } = require('../common/driverFinder')

let runfiles
try {
  // Attempt to require @bazel/runfiles
  runfiles = require('@bazel/runfiles').runfiles
} catch {
  // Fall through
}

/**
 * Describes a browser targeted by a {@linkplain suite test suite}.
 * @record
 */
function TargetBrowser() {}

/**
 * The {@linkplain Browser name} of the targeted browser.
 * @type {string}
 */
TargetBrowser.prototype.name

/**
 * The specific version of the targeted browser, if any.
 * @type {(string|undefined)}
 */
TargetBrowser.prototype.version

/**
 * The specific {@linkplain ../lib/capabilities.Platform platform} for the
 * targeted browser, if any.
 * @type {(string|undefined)}.
 */
TargetBrowser.prototype.platform

/** @suppress {checkTypes} */
function color(c, s) {
  return isatty(process.stdout) ? `\u001b[${c}m${s}\u001b[0m` : s
}

function green(s) {
  return color(32, s)
}

function cyan(s) {
  return color(36, s)
}

function info(msg) {
  console.info(`${green('[INFO]')} ${msg}`)
}

function warn(msg) {
  console.warn(`${cyan('[WARNING]')} ${msg}`)
}

/**
 * Extracts the browsers for a test suite to target from the `SELENIUM_BROWSER`
 * environment variable.
 *
 * @return {{name: string, version: string, platform: string}}[] the browsers to target.
 */
function getBrowsersToTestFromEnv() {
  let browsers = process.env['SELENIUM_BROWSER']
  if (!browsers) {
    return []
  }
  return browsers.split(',').map((spec) => {
    const parts = spec.split(/:/, 3)
    let name = parts[0]
    if (name === 'ie') {
      name = Browser.INTERNET_EXPLORER
    } else if (name === 'edge') {
      name = Browser.EDGE
    }
    let version = parts[1]
    let platform = parts[2]
    return { name, version, platform }
  })
}

/**
 * @return {!Array<!TargetBrowser>} the browsers available for testing on this
 *     system.
 */
function getAvailableBrowsers() {
  info(`Searching for WebDriver executables installed on the current system...`)

  let targets = [
    [getBinaryPaths(new chrome.Options()), Browser.CHROME],
    [getBinaryPaths(new edge.Options()), Browser.EDGE],
    [getBinaryPaths(new firefox.Options()), Browser.FIREFOX],
  ]
  if (process.platform === 'win32') {
    targets.push([getBinaryPaths(new ie.Options()), Browser.INTERNET_EXPLORER])
  }
  if (process.platform === 'darwin') {
    targets.push([getBinaryPaths(new safari.Options()), Browser.SAFARI])
  }

  let availableBrowsers = []
  for (let pair of targets) {
    const driverPath = pair[0].driverPath
    const browserPath = pair[0].browserPath
    const name = pair[1]
    const capabilities = pair[2]
    if (driverPath.length > 0 && browserPath && browserPath.length > 0) {
      info(`... located ${name}`)
      availableBrowsers.push({ name, capabilities })
    }
  }

  if (availableBrowsers.length === 0) {
    warn(`Unable to locate any WebDriver executables for testing`)
  }

  return availableBrowsers
}

let wasInit
let targetBrowsers
let seleniumJar
let seleniumUrl
let seleniumServer

/**
 * Initializes this module by determining which browsers a
 * {@linkplain ./index.suite test suite} should run against. The default
 * behavior is to run tests against every browser with a WebDriver executables
 * (chromedriver, firefoxdriver, etc.) are installed on the system by `PATH`.
 *
 * Specific browsers can be selected at runtime by setting the
 * `SELENIUM_BROWSER` environment variable. This environment variable has the
 * same semantics as  with the WebDriver {@link ../index.Builder Builder},
 * except you may use a comma-delimited list to run against multiple browsers:
 *
 *     SELENIUM_BROWSER=chrome,firefox mocha --recursive tests/
 *
 * The `SELENIUM_REMOTE_URL` environment variable may be set to configure tests
 * to run against an externally managed (usually remote) Selenium server. When
 * set, the WebDriver builder provided by each
 * {@linkplain TestEnvironment#builder TestEnvironment} will automatically be
 * configured to use this server instead of starting a browser driver locally.
 *
 * The `SELENIUM_SERVER_JAR` environment variable may be set to the path of a
 * standalone Selenium server on the local machine that should be used for
 * WebDriver sessions. When set, the WebDriver builder provided by each
 * {@linkplain TestEnvironment} will automatically be configured to use the
 * started server instead of using a browser driver directly. It should only be
 * necessary to set the `SELENIUM_SERVER_JAR` when testing locally against
 * browsers not natively supported by the WebDriver
 * {@link ../index.Builder Builder}.
 *
 * When either of the `SELENIUM_REMOTE_URL` or `SELENIUM_SERVER_JAR` environment
 * variables are set, the `SELENIUM_BROWSER` variable must also be set.
 *
 * @param {boolean=} force whether to force this module to re-initialize and
 *     scan `process.env` again to determine which browsers to run tests
 *     against.
 */
function init(force = false) {
  if (wasInit && !force) {
    return
  }
  wasInit = true

  // If force re-init, kill the current server if there is one.
  if (seleniumServer) {
    seleniumServer.kill()
    seleniumServer = null
  }

  seleniumJar = process.env['SELENIUM_SERVER_JAR']
  seleniumUrl = process.env['SELENIUM_REMOTE_URL']
  if (seleniumJar) {
    info(`Using Selenium server jar: ${seleniumJar}`)
  }

  if (seleniumUrl) {
    info(`Using Selenium remote end: ${seleniumUrl}`)
  }

  if (seleniumJar && seleniumUrl) {
    throw Error(
      'Ambiguous test configuration: both SELENIUM_REMOTE_URL' +
        ' && SELENIUM_SERVER_JAR environment variables are set',
    )
  }

  const envBrowsers = getBrowsersToTestFromEnv()
  if ((seleniumJar || seleniumUrl) && envBrowsers.length === 0) {
    throw Error(
      'Ambiguous test configuration: when either the SELENIUM_REMOTE_URL or' +
        ' SELENIUM_SERVER_JAR environment variable is set, the' +
        ' SELENIUM_BROWSER variable must also be set.',
    )
  }

  targetBrowsers = envBrowsers.length > 0 ? envBrowsers : getAvailableBrowsers()
  info(`Running tests against [${targetBrowsers.map((b) => b.name).join(', ')}]`)

  after(function () {
    if (seleniumServer) {
      return seleniumServer.kill()
    }
  })
}

const TARGET_MAP = /** !WeakMap<!Environment, !TargetBrowser> */ new WeakMap()
const URL_MAP = /** !WeakMap<!Environment, ?(string|remote.SeleniumServer)> */ new WeakMap()

/**
 * Defines the environment a {@linkplain suite test suite} is running against.
 * @final
 */
class Environment {
  /**
   * @param {!TargetBrowser} browser the browser targeted in this environment.
   * @param {?(string|remote.SeleniumServer)=} url remote URL of an existing
   *     Selenium server to test against.
   */
  constructor(browser, url = undefined) {
    browser = /** @type {!TargetBrowser} */ (Object.seal(Object.assign({}, browser)))

    TARGET_MAP.set(this, browser)
    URL_MAP.set(this, url || null)
  }

  /** @return {!TargetBrowser} the target browser for this test environment. */
  get browser() {
    return TARGET_MAP.get(this)
  }

  /**
   * Returns a predicate function that will suppress tests in this environment
   * if the {@linkplain #browser current browser} is in the list of
   * `browsersToIgnore`.
   *
   * @param {...(string|!Browser)} browsersToIgnore the browsers that should
   *     be ignored.
   * @return {function(): boolean} a new predicate function.
   */
  browsers(...browsersToIgnore) {
    return () => browsersToIgnore.indexOf(this.browser.name) !== -1
  }

  /**
   * @return {!Builder} a new WebDriver builder configured to target this
   *     environment's {@linkplain #browser browser}.
   */
  builder() {
    const browser = this.browser
    const urlOrServer = URL_MAP.get(this)

    const builder = new Builder()

    // Sniff the environment variables for paths to use for the common browsers
    // Chrome
    if ('SE_CHROMEDRIVER' in process.env) {
      const found = locate(process.env.SE_CHROMEDRIVER)
      const service = new chrome.ServiceBuilder(found)
      builder.setChromeService(service)
    }
    if ('SE_CHROME' in process.env) {
      const binary = locate(process.env.SE_CHROME)
      const options = new chrome.Options()
      options.setChromeBinaryPath(binary)
      options.setAcceptInsecureCerts(true)
      options.addArguments('disable-infobars', 'disable-breakpad', 'disable-dev-shm-usage', 'no-sandbox')
      builder.setChromeOptions(options)
    }
    // Edge
    // Firefox
    if ('SE_GECKODRIVER' in process.env) {
      const found = locate(process.env.SE_GECKODRIVER)
      const service = new firefox.ServiceBuilder(found)
      builder.setFirefoxService(service)
    }
    if ('SE_FIREFOX' in process.env) {
      const binary = locate(process.env.SE_FIREFOX)
      const options = new firefox.Options()
      options.enableBidi()
      options.setBinary(binary)
      builder.setFirefoxOptions(options)
    }

    builder.disableEnvironmentOverrides()

    const realBuild = builder.build
    builder.build = function () {
      builder.forBrowser(browser.name, browser.version, browser.platform)

      if (browser.capabilities) {
        builder.getCapabilities().merge(browser.capabilities)
      }

      if (browser.name === 'firefox') {
        builder.setCapability('moz:debuggerAddress', true)
      }

      // Enable BiDi for supporting browsers.
      if (browser.name === Browser.FIREFOX || browser.name === Browser.CHROME || browser.name === Browser.EDGE) {
        builder.setCapability('webSocketUrl', true)
        builder.setCapability('unhandledPromptBehavior', 'ignore')
      }

      if (typeof urlOrServer === 'string') {
        builder.usingServer(urlOrServer)
      } else if (urlOrServer) {
        builder.usingServer(urlOrServer.address())
      }
      return realBuild.call(builder)
    }

    return builder
  }
}

/**
 * Configuration options for a {@linkplain ./index.suite test suite}.
 * @record
 */
function SuiteOptions() {}

/**
 * The browsers to run the test suite against.
 * @type {!Array<!(Browser|TargetBrowser)>}
 */
SuiteOptions.prototype.browsers

let inSuite = false

/**
 * Defines a test suite by calling the provided function once for each of the
 * target browsers. If a suite is not limited to a specific set of browsers in
 * the provided {@linkplain ./index.SuiteOptions suite options}, the suite will
 * be configured to run against each of the {@linkplain ./index.init runtime
 * target browsers}.
 *
 * Sample usage:
 *
 *     const {By, Key, until} = require('selenium-webdriver');
 *     const {suite} = require('selenium-webdriver/testing');
 *
 *     suite(function(env) {
 *       describe('Google Search', function() {
 *         let driver;
 *
 *         before(async function() {
 *           driver = await env.builder().build();
 *         });
 *
 *         after(() => driver.quit());
 *
 *         it('demo', async function() {
 *           await driver.get('http://www.google.com/ncr');
 *
 *           let q = await driver.findElement(By.name('q'));
 *           await q.sendKeys('webdriver', Key.RETURN);
 *           await driver.wait(
 *               until.titleIs('webdriver - Google Search'), 1000);
 *         });
 *       });
 *     });
 *
 * By default, this example suite will run against every WebDriver-enabled
 * browser on the current system. Alternatively, the `SELENIUM_BROWSER`
 * environment variable may be used to run against a specific browser:
 *
 *     SELENIUM_BROWSER=firefox mocha -t 120000 example_test.js
 *
 * @param {function(!Environment)} fn the function to call to build the test
 *     suite.
 * @param {SuiteOptions=} options configuration options.
 */
function suite(fn, options = undefined) {
  if (inSuite) {
    throw Error('Calls to suite() may not be nested')
  }
  try {
    init()
    inSuite = true

    const suiteBrowsers = new Map()
    if (options && options.browsers) {
      for (let browser of options.browsers) {
        if (typeof browser === 'string') {
          suiteBrowsers.set(browser, { name: browser })
        } else {
          suiteBrowsers.set(browser.name, browser)
        }
      }
    }

    for (let browser of targetBrowsers) {
      if (suiteBrowsers.size > 0 && !suiteBrowsers.has(browser.name)) {
        continue
      }

      describe(`[${browser.name}]`, function () {
        if (!seleniumUrl && seleniumJar && !seleniumServer) {
          seleniumServer = new remote.SeleniumServer(seleniumJar)

          const startTimeout = 65 * 1000

          function startSelenium() {
            if (typeof this.timeout === 'function') {
              this.timeout(startTimeout) // For mocha.
            }

            info(`Starting selenium server ${seleniumJar}`)
            return seleniumServer.start(60 * 1000)
          }

          const /** !Function */ beforeHook = global.beforeAll || global.before
          beforeHook(startSelenium, startTimeout)
        }

        fn(new Environment(browser, seleniumUrl || seleniumServer))
      })
    }
  } finally {
    inSuite = false
  }
}

/**
 * Returns an object with wrappers for the standard mocha/jasmine test
 * functions: `describe` and `it`, which will redirect to `xdescribe` and `xit`,
 * respectively, if provided predicate function returns false.
 *
 * Sample usage:
 *
 *     const {Browser} = require('selenium-webdriver');
 *     const {suite, ignore} = require('selenium-webdriver/testing');
 *
 *     suite(function(env) {
 *
 *         // Skip tests the current environment targets Chrome.
 *         ignore(env.browsers(Browser.CHROME)).
 *         describe('something', async function() {
 *           let driver = await env.builder().build();
 *           // etc.
 *         });
 *     });
 *
 * @param {function(): boolean} predicateFn A predicate to call to determine
 *     if the test should be suppressed. This function MUST be synchronous.
 * @return {{describe: !Function, it: !Function}} an object with wrapped
 *     versions of the `describe` and `it` test functions.
 */
function ignore(predicateFn) {
  const isJasmine = global.jasmine && typeof global.jasmine === 'object'

  const hooks = {
    describe: getTestHook('describe'),
    xdescribe: getTestHook('xdescribe'),
    it: getTestHook('it'),
    xit: getTestHook('xit'),
  }
  hooks.fdescribe = isJasmine ? getTestHook('fdescribe') : hooks.describe.only
  hooks.fit = isJasmine ? getTestHook('fit') : hooks.it.only

  let describe = wrap(hooks.xdescribe, hooks.describe)
  let fdescribe = wrap(hooks.xdescribe, hooks.fdescribe)
  //eslint-disable-next-line no-only-tests/no-only-tests
  describe.only = fdescribe

  let it = wrap(hooks.xit, hooks.it)
  let fit = wrap(hooks.xit, hooks.fit)
  //eslint-disable-next-line no-only-tests/no-only-tests
  it.only = fit

  return { describe, it }

  function wrap(onSkip, onRun) {
    return function (...args) {
      if (predicateFn()) {
        onSkip(...args)
      } else {
        onRun(...args)
      }
    }
  }
}

/**
 * @param {string} name
 * @return {!Function}
 * @throws {TypeError}
 */
function getTestHook(name) {
  let fn = global[name]
  let type = typeof fn
  if (type !== 'function') {
    throw TypeError(
      `Expected global.${name} to be a function, but is ${type}.` +
        ' This can happen if you try using this module when running with' +
        ' node directly instead of using jasmine or mocha',
    )
  }
  return fn
}

function locate(fileLike) {
  if (fs.existsSync(fileLike)) {
    return fileLike
  }

  if (!runfiles) {
    throw new Error('Unable to find ' + fileLike)
  }

  try {
    return runfiles.resolve(fileLike)
  } catch {
    // Fall through
  }

  // Is the item in the workspace?
  try {
    return runfiles.resolveWorkspaceRelative(fileLike)
  } catch {
    // Fall through
  }

  // Find the repo mapping file
  let repoMappingFile
  try {
    repoMappingFile = runfiles.resolve('_repo_mapping')
  } catch {
    throw new Error('Unable to locate (no repo mapping file): ' + fileLike)
  }
  const lines = fs.readFileSync(repoMappingFile, { encoding: 'utf8' }).split('\n')

  // Build a map of "repo we declared we need" to "path"
  const mapping = {}
  for (const line of lines) {
    if (line.startsWith(',')) {
      const parts = line.split(',', 3)
      mapping[parts[1]] = parts[2]
    }
  }

  // Get the first segment of the path
  const pathSegments = fileLike.split('/')
  if (!pathSegments.length) {
    throw new Error('Unable to locate ' + fileLike)
  }

  pathSegments[0] = mapping[pathSegments[0]] ? mapping[pathSegments[0]] : '_main'

  try {
    return runfiles.resolve(path.join(...pathSegments))
  } catch {
    // Fall through
  }

  throw new Error('Unable to find ' + fileLike)
}

// PUBLIC API

module.exports = {
  Environment,
  SuiteOptions,
  init,
  ignore,
  suite,
}
