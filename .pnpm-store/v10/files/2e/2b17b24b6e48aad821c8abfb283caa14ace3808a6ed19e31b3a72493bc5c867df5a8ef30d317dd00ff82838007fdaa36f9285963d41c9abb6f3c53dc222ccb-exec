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

const url = require('node:url')

const httpUtil = require('../http/util')
const io = require('../io')
const { exec } = require('../io/exec')
const { Zip } = require('../io/zip')
const cmd = require('../lib/command')
const input = require('../lib/input')
const net = require('../net')
const portprober = require('../net/portprober')
const logging = require('../lib/logging')

const { getJavaPath, formatSpawnArgs } = require('./util')

/**
 * @typedef {(string|!Array<string|number|!stream.Stream|null|undefined>)}
 */
let StdIoOptions // eslint-disable-line

/**
 * @typedef {(string|!IThenable<string>)}
 */
let CommandLineFlag // eslint-disable-line

/**
 * A record object that defines the configuration options for a DriverService
 * instance.
 *
 * @record
 */
function ServiceOptions() {}

/**
 * Whether the service should only be accessed on this host's loopback address.
 *
 * @type {(boolean|undefined)}
 */
ServiceOptions.prototype.loopback

/**
 * The host name to access the server on. If this option is specified, the
 * {@link #loopback} option will be ignored.
 *
 * @type {(string|undefined)}
 */
ServiceOptions.prototype.hostname

/**
 * The port to start the server on (must be > 0). If the port is provided as a
 * promise, the service will wait for the promise to resolve before starting.
 *
 * @type {(number|!IThenable<number>)}
 */
ServiceOptions.prototype.port

/**
 * The arguments to pass to the service. If a promise is provided, the service
 * will wait for it to resolve before starting.
 *
 * @type {!(Array<CommandLineFlag>|IThenable<!Array<CommandLineFlag>>)}
 */
ServiceOptions.prototype.args

/**
 * The base path on the server for the WebDriver wire protocol (e.g. '/wd/hub').
 * Defaults to '/'.
 *
 * @type {(string|undefined|null)}
 */
ServiceOptions.prototype.path

/**
 * The environment variables that should be visible to the server process.
 * Defaults to inheriting the current process's environment.
 *
 * @type {(Object<string, string>|undefined)}
 */
ServiceOptions.prototype.env

/**
 * IO configuration for the spawned server process. For more information, refer
 * to the documentation of `child_process.spawn`.
 *
 * @type {(StdIoOptions|undefined)}
 * @see https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_options_stdio
 */
ServiceOptions.prototype.stdio

/**
 * Manages the life and death of a native executable WebDriver server.
 *
 * It is expected that the driver server implements the
 * https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol.
 * Furthermore, the managed server should support multiple concurrent sessions,
 * so that this class may be reused for multiple clients.
 */
class DriverService {
  /**
   * @param {string} executable Path to the executable to run.
   * @param {!ServiceOptions} options Configuration options for the service.
   */
  constructor(executable, options) {
    /** @private @const */
    this.log_ = logging.getLogger(`${logging.Type.DRIVER}.DriverService`)
    /** @private {string} */
    this.executable_ = executable

    /** @private {boolean} */
    this.loopbackOnly_ = !!options.loopback

    /** @private {(string|undefined)} */
    this.hostname_ = options.hostname

    /** @private {(number|!IThenable<number>)} */
    this.port_ = options.port

    /**
     * @private {!(Array<CommandLineFlag>|
     *             IThenable<!Array<CommandLineFlag>>)}
     */
    this.args_ = options.args

    /** @private {string} */
    this.path_ = options.path || '/'

    /** @private {!Object<string, string>} */
    this.env_ = options.env || process.env

    /**
     * @private {(string|!Array<string|number|!stream.Stream|null|undefined>)}
     */
    this.stdio_ = options.stdio || 'ignore'

    /**
     * A promise for the managed subprocess, or null if the server has not been
     * started yet. This promise will never be rejected.
     * @private {Promise<!exec.Command>}
     */
    this.command_ = null

    /**
     * Promise that resolves to the server's address or null if the server has
     * not been started. This promise will be rejected if the server terminates
     * before it starts accepting WebDriver requests.
     * @private {Promise<string>}
     */
    this.address_ = null
  }

  getExecutable() {
    return this.executable_
  }

  setExecutable(value) {
    this.executable_ = value
  }

  /**
   * @return {!Promise<string>} A promise that resolves to the server's address.
   * @throws {Error} If the server has not been started.
   */
  address() {
    if (this.address_) {
      return this.address_
    }
    throw Error('Server has not been started.')
  }

  /**
   * Returns whether the underlying process is still running. This does not take
   * into account whether the process is in the process of shutting down.
   * @return {boolean} Whether the underlying service process is running.
   */
  isRunning() {
    return !!this.address_
  }

  /**
   * Starts the server if it is not already running.
   * @param {number=} opt_timeoutMs How long to wait, in milliseconds, for the
   *     server to start accepting requests. Defaults to 30 seconds.
   * @return {!Promise<string>} A promise that will resolve to the server's base
   *     URL when it has started accepting requests. If the timeout expires
   *     before the server has started, the promise will be rejected.
   */
  start(opt_timeoutMs) {
    if (this.address_) {
      return this.address_
    }

    const timeout = opt_timeoutMs || DriverService.DEFAULT_START_TIMEOUT_MS
    const self = this

    let resolveCommand
    this.command_ = new Promise((resolve) => (resolveCommand = resolve))

    this.address_ = new Promise((resolveAddress, rejectAddress) => {
      resolveAddress(
        Promise.resolve(this.port_).then((port) => {
          if (port <= 0) {
            throw Error('Port must be > 0: ' + port)
          }

          return resolveCommandLineFlags(this.args_).then((args) => {
            const command = exec(self.executable_, {
              args: args,
              env: self.env_,
              stdio: self.stdio_,
            })

            resolveCommand(command)

            const earlyTermination = command.result().then(function (result) {
              const error =
                result.code == null
                  ? Error('Server was killed with ' + result.signal)
                  : Error('Server terminated early with status ' + result.code)
              rejectAddress(error)
              self.address_ = null
              self.command_ = null
              throw error
            })

            let hostname = self.hostname_
            if (!hostname) {
              hostname = (!self.loopbackOnly_ && net.getAddress()) || net.getLoopbackAddress()
            }

            const serverUrl = url.format({
              protocol: 'http',
              hostname: hostname,
              port: port + '',
              pathname: self.path_,
            })

            return new Promise((fulfill, reject) => {
              let cancelToken = earlyTermination.catch((e) => reject(Error(e.message)))

              httpUtil.waitForServer(serverUrl, timeout, cancelToken).then(
                (_) => fulfill(serverUrl),
                (err) => {
                  if (err instanceof httpUtil.CancellationError) {
                    fulfill(serverUrl)
                  } else {
                    reject(err)
                  }
                },
              )
            })
          })
        }),
      )
    })

    return this.address_
  }

  /**
   * Stops the service if it is not currently running. This function will kill
   * the server immediately. To synchronize with the active control flow, use
   * {@link #stop()}.
   * @return {!Promise} A promise that will be resolved when the server has been
   *     stopped.
   */
  kill() {
    if (!this.address_ || !this.command_) {
      return Promise.resolve() // Not currently running.
    }
    let cmd = this.command_
    this.address_ = null
    this.command_ = null
    return cmd.then((c) => c.kill('SIGTERM'))
  }
}

/**
 * @param {!(Array<CommandLineFlag>|IThenable<!Array<CommandLineFlag>>)} args
 * @return {!Promise<!Array<string>>}
 */
function resolveCommandLineFlags(args) {
  // Resolve the outer array, then the individual flags.
  return Promise.resolve(args).then(/** !Array<CommandLineFlag> */ (args) => Promise.all(args))
}

/**
 * The default amount of time, in milliseconds, to wait for the server to
 * start.
 * @const {number}
 */
DriverService.DEFAULT_START_TIMEOUT_MS = 30 * 1000

/**
 * Creates {@link DriverService} objects that manage a WebDriver server in a
 * child process.
 */
DriverService.Builder = class {
  /**
   * @param {string} exe Path to the executable to use. This executable must
   *     accept the `--port` flag for defining the port to start the server on.
   * @throws {Error} If the provided executable path does not exist.
   */
  constructor(exe) {
    /** @private @const {string} */
    this.exe_ = exe

    /** @private {!ServiceOptions} */
    this.options_ = {
      args: [],
      port: 0,
      env: null,
      stdio: 'ignore',
    }
  }

  /**
   * Define additional command line arguments to use when starting the server.
   *
   * @param {...CommandLineFlag} var_args The arguments to include.
   * @return {!THIS} A self reference.
   * @this {THIS}
   * @template THIS
   */
  addArguments(...arguments_) {
    this.options_.args = this.options_.args.concat(arguments_)
    return this
  }

  /**
   * Sets the host name to access the server on. If specified, the
   * {@linkplain #setLoopback() loopback} setting will be ignored.
   *
   * @param {string} hostname
   * @return {!DriverService.Builder} A self reference.
   */
  setHostname(hostname) {
    this.options_.hostname = hostname
    return this
  }

  /**
   * Sets whether the service should be accessed at this host's loopback
   * address.
   *
   * @param {boolean} loopback
   * @return {!DriverService.Builder} A self reference.
   */
  setLoopback(loopback) {
    this.options_.loopback = loopback
    return this
  }

  /**
   * Sets the base path for WebDriver REST commands (e.g. "/wd/hub").
   * By default, the driver will accept commands relative to "/".
   *
   * @param {?string} basePath The base path to use, or `null` to use the
   *     default.
   * @return {!DriverService.Builder} A self reference.
   */
  setPath(basePath) {
    this.options_.path = basePath
    return this
  }

  /**
   * Sets the port to start the server on.
   *
   * @param {number} port The port to use, or 0 for any free port.
   * @return {!DriverService.Builder} A self reference.
   * @throws {Error} If an invalid port is specified.
   */
  setPort(port) {
    if (port < 0) {
      throw Error(`port must be >= 0: ${port}`)
    }
    this.options_.port = port
    return this
  }

  /**
   * Defines the environment to start the server under. This setting will be
   * inherited by every browser session started by the server. By default, the
   * server will inherit the environment of the current process.
   *
   * @param {(Map<string, string>|Object<string, string>|null)} env The desired
   *     environment to use, or `null` if the server should inherit the
   *     current environment.
   * @return {!DriverService.Builder} A self reference.
   */
  setEnvironment(env) {
    if (env instanceof Map) {
      let tmp = {}
      env.forEach((value, key) => (tmp[key] = value))
      env = tmp
    }
    this.options_.env = env
    return this
  }

  /**
   * IO configuration for the spawned server process. For more information,
   * refer to the documentation of `child_process.spawn`.
   *
   * @param {StdIoOptions} config The desired IO configuration.
   * @return {!DriverService.Builder} A self reference.
   * @see https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_options_stdio
   */
  setStdio(config) {
    this.options_.stdio = config
    return this
  }

  /**
   * Creates a new DriverService using this instance's current configuration.
   *
   * @return {!DriverService} A new driver service.
   */
  build() {
    let port = this.options_.port || portprober.findFreePort()
    let args = Promise.resolve(port).then((port) => {
      return this.options_.args.concat('--port=' + port)
    })

    let options =
      /** @type {!ServiceOptions} */
      (Object.assign({}, this.options_, { args, port }))
    return new DriverService(this.exe_, options)
  }
}

/**
 * Manages the life and death of the
 * <a href="https://www.selenium.dev/downloads/">
 * standalone Selenium server</a>.
 */
class SeleniumServer extends DriverService {
  /**
   * @param {string} jar Path to the Selenium server jar.
   * @param {SeleniumServer.Options=} opt_options Configuration options for the
   *     server.
   * @throws {Error} If the path to the Selenium jar is not specified or if an
   *     invalid port is specified.
   */
  constructor(jar, opt_options) {
    if (!jar) {
      throw Error('Path to the Selenium jar not specified')
    }

    const options = opt_options || {}

    if (options.port < 0) {
      throw Error('Port must be >= 0: ' + options.port)
    }

    let port = options.port || portprober.findFreePort()
    let args = Promise.all([port, options.jvmArgs || [], options.args || []]).then((resolved) => {
      let port = resolved[0]
      let jvmArgs = resolved[1]
      let args = resolved[2]

      const fullArgsList = jvmArgs.concat('-jar', jar, '-port', port).concat(args)

      return formatSpawnArgs(jar, fullArgsList)
    })

    const java = getJavaPath()

    super(java, {
      loopback: options.loopback,
      port: port,
      args: args,
      path: '/wd/hub',
      env: options.env,
      stdio: options.stdio,
    })
  }
}

/**
 * A record object describing configuration options for a {@link SeleniumServer}
 * instance.
 *
 * @record
 */
SeleniumServer.Options = class {
  constructor() {
    /**
     * Whether the server should only be accessible on this host's loopback
     * address.
     *
     * @type {(boolean|undefined)}
     */
    this.loopback

    /**
     * The port to start the server on (must be > 0). If the port is provided as
     * a promise, the service will wait for the promise to resolve before
     * starting.
     *
     * @type {(number|!IThenable<number>)}
     */
    this.port

    /**
     * The arguments to pass to the service. If a promise is provided,
     * the service will wait for it to resolve before starting.
     *
     * @type {!(Array<string>|IThenable<!Array<string>>)}
     */
    this.args

    /**
     * The arguments to pass to the JVM. If a promise is provided,
     * the service will wait for it to resolve before starting.
     *
     * @type {(!Array<string>|!IThenable<!Array<string>>|undefined)}
     */
    this.jvmArgs

    /**
     * The environment variables that should be visible to the server
     * process. Defaults to inheriting the current process's environment.
     *
     * @type {(!Object<string, string>|undefined)}
     */
    this.env

    /**
     * IO configuration for the spawned server process. If unspecified, IO will
     * be ignored.
     *
     * @type {(string|!Array<string|number|!stream.Stream|null|undefined>|
     *         undefined)}
     * @see <https://nodejs.org/dist/latest-v8.x/docs/api/child_process.html#child_process_options_stdio>
     */
    this.stdio
  }
}

/**
 * A {@link webdriver.FileDetector} that may be used when running
 * against a remote
 * [Selenium server](https://www.selenium.dev/downloads/).
 *
 * When a file path on the local machine running this script is entered with
 * {@link webdriver.WebElement#sendKeys WebElement#sendKeys}, this file detector
 * will transfer the specified file to the Selenium server's host; the sendKeys
 * command will be updated to use the transferred file's path.
 *
 * __Note:__ This class depends on a non-standard command supported on the
 * Java Selenium server. The file detector will fail if used with a server that
 * only supports standard WebDriver commands (such as the ChromeDriver).
 *
 * @final
 */
class FileDetector extends input.FileDetector {
  /**
   * Prepares a `file` for use with the remote browser. If the provided path
   * does not reference a normal file (i.e. it does not exist or is a
   * directory), then the promise returned by this method will be resolved with
   * the original file path. Otherwise, this method will upload the file to the
   * remote server, which will return the file's path on the remote system so
   * it may be referenced in subsequent commands.
   *
   * @override
   */
  handleFile(driver, file) {
    return io.stat(file).then(
      function (stats) {
        if (stats.isDirectory()) {
          return file // Not a valid file, return original input.
        }

        let zip = new Zip()
        return zip
          .addFile(file)
          .then(() => zip.toBuffer())
          .then((buf) => buf.toString('base64'))
          .then((encodedZip) => {
            let command = new cmd.Command(cmd.Name.UPLOAD_FILE).setParameter('file', encodedZip)
            return driver.execute(command)
          })
      },
      function (err) {
        if (err.code === 'ENOENT') {
          return file // Not a file; return original input.
        }
        throw err
      },
    )
  }
}

// PUBLIC API

module.exports = {
  DriverService,
  FileDetector,
  SeleniumServer,
  // Exported for API docs.
  ServiceOptions,
}
