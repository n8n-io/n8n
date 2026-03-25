"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var webServerPlugin_exports = {};
__export(webServerPlugin_exports, {
  WebServerPlugin: () => WebServerPlugin,
  webServer: () => webServer,
  webServerPluginsForConfig: () => webServerPluginsForConfig
});
module.exports = __toCommonJS(webServerPlugin_exports);
var import_net = __toESM(require("net"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
const DEFAULT_ENVIRONMENT_VARIABLES = {
  "BROWSER": "none",
  // Disable that create-react-app will open the page in the browser
  "FORCE_COLOR": "1",
  "DEBUG_COLORS": "1"
};
const debugWebServer = (0, import_utilsBundle.debug)("pw:webserver");
class WebServerPlugin {
  constructor(options, checkPortOnly) {
    this.name = "playwright:webserver";
    this._options = options;
    this._checkPortOnly = checkPortOnly;
  }
  async setup(config, configDir, reporter) {
    this._reporter = reporter;
    this._isAvailableCallback = this._options.url ? getIsAvailableFunction(this._options.url, this._checkPortOnly, !!this._options.ignoreHTTPSErrors, this._reporter.onStdErr?.bind(this._reporter)) : void 0;
    this._options.cwd = this._options.cwd ? import_path.default.resolve(configDir, this._options.cwd) : configDir;
    try {
      await this._startProcess();
      await this._waitForProcess();
    } catch (error) {
      await this.teardown();
      throw error;
    }
  }
  async teardown() {
    debugWebServer(`Terminating the WebServer`);
    await this._killProcess?.();
    debugWebServer(`Terminated the WebServer`);
  }
  async _startProcess() {
    let processExitedReject = (error) => {
    };
    this._processExitedPromise = new Promise((_, reject) => processExitedReject = reject);
    const isAlreadyAvailable = await this._isAvailableCallback?.();
    if (isAlreadyAvailable) {
      debugWebServer(`WebServer is already available`);
      if (this._options.reuseExistingServer)
        return;
      const port = new URL(this._options.url).port;
      throw new Error(`${this._options.url ?? `http://localhost${port ? ":" + port : ""}`} is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.`);
    }
    if (!this._options.command)
      throw new Error("config.webServer.command cannot be empty");
    debugWebServer(`Starting WebServer process ${this._options.command}...`);
    const { launchedProcess, gracefullyClose } = await (0, import_utils.launchProcess)({
      command: this._options.command,
      env: {
        ...DEFAULT_ENVIRONMENT_VARIABLES,
        ...process.env,
        ...this._options.env
      },
      cwd: this._options.cwd,
      stdio: "stdin",
      shell: true,
      attemptToGracefullyClose: async () => {
        if (process.platform === "win32")
          throw new Error("Graceful shutdown is not supported on Windows");
        if (!this._options.gracefulShutdown)
          throw new Error("skip graceful shutdown");
        const { signal, timeout = 0 } = this._options.gracefulShutdown;
        process.kill(-launchedProcess.pid, signal);
        return new Promise((resolve, reject) => {
          const timer = timeout !== 0 ? setTimeout(() => reject(new Error(`process didn't close gracefully within timeout`)), timeout) : void 0;
          launchedProcess.once("close", (...args) => {
            clearTimeout(timer);
            resolve();
          });
        });
      },
      log: () => {
      },
      onExit: (code) => processExitedReject(new Error(code ? `Process from config.webServer was not able to start. Exit code: ${code}` : "Process from config.webServer exited early.")),
      tempDirectories: []
    });
    this._killProcess = gracefullyClose;
    debugWebServer(`Process started`);
    if (this._options.wait?.stdout || this._options.wait?.stderr)
      this._waitForStdioPromise = new import_utils.ManualPromise();
    const stdioWaitCollectors = {
      stdout: this._options.wait?.stdout ? "" : void 0,
      stderr: this._options.wait?.stderr ? "" : void 0
    };
    launchedProcess.stdout.on("data", (data) => {
      if (debugWebServer.enabled || this._options.stdout === "pipe")
        this._reporter.onStdOut?.(prefixOutputLines(data.toString(), this._options.name));
    });
    launchedProcess.stderr.on("data", (data) => {
      if (debugWebServer.enabled || (this._options.stderr === "pipe" || !this._options.stderr))
        this._reporter.onStdErr?.(prefixOutputLines(data.toString(), this._options.name));
    });
    const resolveStdioPromise = () => {
      stdioWaitCollectors.stdout = void 0;
      stdioWaitCollectors.stderr = void 0;
      this._waitForStdioPromise?.resolve();
    };
    for (const stdio of ["stdout", "stderr"]) {
      launchedProcess[stdio].on("data", (data) => {
        if (!this._options.wait?.[stdio] || stdioWaitCollectors[stdio] === void 0)
          return;
        stdioWaitCollectors[stdio] += data.toString();
        this._options.wait[stdio].lastIndex = 0;
        const result = this._options.wait[stdio].exec(stdioWaitCollectors[stdio]);
        if (result) {
          for (const [key, value] of Object.entries(result.groups || {}))
            process.env[key.toUpperCase()] = value;
          resolveStdioPromise();
        }
      });
    }
  }
  async _waitForProcess() {
    if (!this._isAvailableCallback && !this._waitForStdioPromise) {
      this._processExitedPromise.catch(() => {
      });
      return;
    }
    debugWebServer(`Waiting for availability...`);
    const launchTimeout = this._options.timeout || 60 * 1e3;
    const cancellationToken = { canceled: false };
    const deadline = (0, import_utils.monotonicTime)() + launchTimeout;
    const racingPromises = [this._processExitedPromise];
    if (this._isAvailableCallback)
      racingPromises.push((0, import_utils.raceAgainstDeadline)(() => waitFor(this._isAvailableCallback, cancellationToken), deadline));
    if (this._waitForStdioPromise)
      racingPromises.push((0, import_utils.raceAgainstDeadline)(() => this._waitForStdioPromise, deadline));
    const { timedOut } = await Promise.race(racingPromises);
    cancellationToken.canceled = true;
    if (timedOut)
      throw new Error(`Timed out waiting ${launchTimeout}ms from config.webServer.`);
    debugWebServer(`WebServer available`);
  }
}
async function isPortUsed(port) {
  const innerIsPortUsed = (host) => new Promise((resolve) => {
    const conn = import_net.default.connect(port, host).on("error", () => {
      resolve(false);
    }).on("connect", () => {
      conn.end();
      resolve(true);
    });
  });
  return await innerIsPortUsed("127.0.0.1") || await innerIsPortUsed("::1");
}
async function waitFor(waitFn, cancellationToken) {
  const logScale = [100, 250, 500];
  while (!cancellationToken.canceled) {
    const connected = await waitFn();
    if (connected)
      return;
    const delay = logScale.shift() || 1e3;
    debugWebServer(`Waiting ${delay}ms`);
    await new Promise((x) => setTimeout(x, delay));
  }
}
function getIsAvailableFunction(url, checkPortOnly, ignoreHTTPSErrors, onStdErr) {
  const urlObject = new URL(url);
  if (!checkPortOnly)
    return () => (0, import_utils.isURLAvailable)(urlObject, ignoreHTTPSErrors, debugWebServer, onStdErr);
  const port = urlObject.port;
  return () => isPortUsed(+port);
}
const webServer = (options) => {
  return new WebServerPlugin(options, false);
};
const webServerPluginsForConfig = (config) => {
  const shouldSetBaseUrl = !!config.config.webServer;
  const webServerPlugins = [];
  for (const webServerConfig of config.webServers) {
    if (webServerConfig.port && webServerConfig.url)
      throw new Error(`Either 'port' or 'url' should be specified in config.webServer.`);
    let url;
    if (webServerConfig.port || webServerConfig.url) {
      url = webServerConfig.url || `http://localhost:${webServerConfig.port}`;
      if (shouldSetBaseUrl && !webServerConfig.url)
        process.env.PLAYWRIGHT_TEST_BASE_URL = url;
    }
    webServerPlugins.push(new WebServerPlugin({ ...webServerConfig, url }, webServerConfig.port !== void 0));
  }
  return webServerPlugins;
};
function prefixOutputLines(output, prefixName = "WebServer") {
  const lastIsNewLine = output[output.length - 1] === "\n";
  let lines = output.split("\n");
  if (lastIsNewLine)
    lines.pop();
  lines = lines.map((line) => import_utils2.colors.dim(`[${prefixName}] `) + line);
  if (lastIsNewLine)
    lines.push("");
  return lines.join("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebServerPlugin,
  webServer,
  webServerPluginsForConfig
});
