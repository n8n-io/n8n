"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var playwrightServer_exports = {};
__export(playwrightServer_exports, {
  PlaywrightServer: () => PlaywrightServer
});
module.exports = __toCommonJS(playwrightServer_exports);
var import_playwrightConnection = require("./playwrightConnection");
var import_playwright = require("../server/playwright");
var import_semaphore = require("../utils/isomorphic/semaphore");
var import_time = require("../utils/isomorphic/time");
var import_wsServer = require("../server/utils/wsServer");
var import_ascii = require("../server/utils/ascii");
var import_userAgent = require("../server/utils/userAgent");
var import_utils = require("../utils");
var import_socksProxy = require("../server/utils/socksProxy");
var import_browser = require("../server/browser");
var import_progress = require("../server/progress");
class PlaywrightServer {
  constructor(options) {
    this._dontReuseBrowsers = /* @__PURE__ */ new Set();
    this._options = options;
    if (options.preLaunchedBrowser) {
      this._playwright = options.preLaunchedBrowser.attribution.playwright;
      this._dontReuse(options.preLaunchedBrowser);
    }
    if (options.preLaunchedAndroidDevice)
      this._playwright = options.preLaunchedAndroidDevice._android.attribution.playwright;
    this._playwright ??= (0, import_playwright.createPlaywright)({ sdkLanguage: "javascript", isServer: true });
    const browserSemaphore = new import_semaphore.Semaphore(this._options.maxConnections);
    const controllerSemaphore = new import_semaphore.Semaphore(1);
    const reuseBrowserSemaphore = new import_semaphore.Semaphore(1);
    this._wsServer = new import_wsServer.WSServer({
      onRequest: (request, response) => {
        if (request.method === "GET" && request.url === "/json") {
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({
            wsEndpointPath: this._options.path
          }));
          return;
        }
        response.end("Running");
      },
      onUpgrade: (request, socket) => {
        const uaError = userAgentVersionMatchesErrorMessage(request.headers["user-agent"] || "");
        if (uaError)
          return { error: `HTTP/${request.httpVersion} 428 Precondition Required\r
\r
${uaError}` };
      },
      onHeaders: (headers) => {
        if (process.env.PWTEST_SERVER_WS_HEADERS)
          headers.push(process.env.PWTEST_SERVER_WS_HEADERS);
      },
      onConnection: (request, url, ws, id) => {
        const browserHeader = request.headers["x-playwright-browser"];
        const browserName = url.searchParams.get("browser") || (Array.isArray(browserHeader) ? browserHeader[0] : browserHeader) || null;
        const proxyHeader = request.headers["x-playwright-proxy"];
        const proxyValue = url.searchParams.get("proxy") || (Array.isArray(proxyHeader) ? proxyHeader[0] : proxyHeader);
        const launchOptionsHeader = request.headers["x-playwright-launch-options"] || "";
        const launchOptionsHeaderValue = Array.isArray(launchOptionsHeader) ? launchOptionsHeader[0] : launchOptionsHeader;
        const launchOptionsParam = url.searchParams.get("launch-options");
        let launchOptions = { timeout: import_time.DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT };
        try {
          launchOptions = JSON.parse(launchOptionsParam || launchOptionsHeaderValue);
          if (!launchOptions.timeout)
            launchOptions.timeout = import_time.DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT;
        } catch (e) {
        }
        const isExtension = this._options.mode === "extension";
        const allowFSPaths = isExtension;
        launchOptions = filterLaunchOptions(launchOptions, allowFSPaths);
        if (isExtension) {
          const connectFilter = url.searchParams.get("connect");
          if (connectFilter) {
            if (connectFilter !== "first")
              throw new Error(`Unknown connect filter: ${connectFilter}`);
            return new import_playwrightConnection.PlaywrightConnection(
              browserSemaphore,
              ws,
              false,
              this._playwright,
              () => this._initConnectMode(id, connectFilter, browserName, launchOptions),
              id
            );
          }
          if (url.searchParams.has("debug-controller")) {
            return new import_playwrightConnection.PlaywrightConnection(
              controllerSemaphore,
              ws,
              true,
              this._playwright,
              async () => {
                throw new Error("shouldnt be used");
              },
              id
            );
          }
          return new import_playwrightConnection.PlaywrightConnection(
            reuseBrowserSemaphore,
            ws,
            false,
            this._playwright,
            () => this._initReuseBrowsersMode(browserName, launchOptions, id),
            id
          );
        }
        if (this._options.mode === "launchServer" || this._options.mode === "launchServerShared") {
          if (this._options.preLaunchedBrowser) {
            return new import_playwrightConnection.PlaywrightConnection(
              browserSemaphore,
              ws,
              false,
              this._playwright,
              () => this._initPreLaunchedBrowserMode(id),
              id
            );
          }
          return new import_playwrightConnection.PlaywrightConnection(
            browserSemaphore,
            ws,
            false,
            this._playwright,
            () => this._initPreLaunchedAndroidMode(id),
            id
          );
        }
        return new import_playwrightConnection.PlaywrightConnection(
          browserSemaphore,
          ws,
          false,
          this._playwright,
          () => this._initLaunchBrowserMode(browserName, proxyValue, launchOptions, id),
          id
        );
      }
    });
  }
  async _initReuseBrowsersMode(browserName, launchOptions, id) {
    import_utils.debugLogger.log("server", `[${id}] engaged reuse browsers mode for ${browserName}`);
    const requestedOptions = launchOptionsHash(launchOptions);
    let browser = this._playwright.allBrowsers().find((b) => {
      if (b.options.name !== browserName)
        return false;
      if (this._dontReuseBrowsers.has(b))
        return false;
      const existingOptions = launchOptionsHash({ ...b.options.originalLaunchOptions, timeout: import_time.DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT });
      return existingOptions === requestedOptions;
    });
    for (const b of this._playwright.allBrowsers()) {
      if (b === browser)
        continue;
      if (this._dontReuseBrowsers.has(b))
        continue;
      if (b.options.name === browserName && b.options.channel === launchOptions.channel)
        await b.close({ reason: "Connection terminated" });
    }
    if (!browser) {
      const browserType = this._playwright[browserName || "chromium"];
      const controller = new import_progress.ProgressController();
      browser = await controller.run((progress) => browserType.launch(progress, {
        ...launchOptions,
        headless: !!process.env.PW_DEBUG_CONTROLLER_HEADLESS
      }), launchOptions.timeout);
    }
    return {
      preLaunchedBrowser: browser,
      denyLaunch: true,
      dispose: async () => {
        for (const context of browser.contexts()) {
          if (!context.pages().length)
            await context.close({ reason: "Connection terminated" });
        }
      }
    };
  }
  async _initConnectMode(id, filter, browserName, launchOptions) {
    browserName ??= "chromium";
    import_utils.debugLogger.log("server", `[${id}] engaged connect mode`);
    let browser = this._playwright.allBrowsers().find((b) => b.options.name === browserName);
    if (!browser) {
      const browserType = this._playwright[browserName];
      const controller = new import_progress.ProgressController();
      browser = await controller.run((progress) => browserType.launch(progress, launchOptions), launchOptions.timeout);
      this._dontReuse(browser);
    }
    return {
      preLaunchedBrowser: browser,
      denyLaunch: true,
      sharedBrowser: true
    };
  }
  async _initPreLaunchedBrowserMode(id) {
    import_utils.debugLogger.log("server", `[${id}] engaged pre-launched (browser) mode`);
    const browser = this._options.preLaunchedBrowser;
    for (const b of this._playwright.allBrowsers()) {
      if (b !== browser)
        await b.close({ reason: "Connection terminated" });
    }
    return {
      preLaunchedBrowser: browser,
      socksProxy: this._options.preLaunchedSocksProxy,
      sharedBrowser: this._options.mode === "launchServerShared",
      denyLaunch: true
    };
  }
  async _initPreLaunchedAndroidMode(id) {
    import_utils.debugLogger.log("server", `[${id}] engaged pre-launched (Android) mode`);
    const androidDevice = this._options.preLaunchedAndroidDevice;
    return {
      preLaunchedAndroidDevice: androidDevice,
      denyLaunch: true
    };
  }
  async _initLaunchBrowserMode(browserName, proxyValue, launchOptions, id) {
    import_utils.debugLogger.log("server", `[${id}] engaged launch mode for "${browserName}"`);
    let socksProxy;
    if (proxyValue) {
      socksProxy = new import_socksProxy.SocksProxy();
      socksProxy.setPattern(proxyValue);
      launchOptions.socksProxyPort = await socksProxy.listen(0);
      import_utils.debugLogger.log("server", `[${id}] started socks proxy on port ${launchOptions.socksProxyPort}`);
    } else {
      launchOptions.socksProxyPort = void 0;
    }
    const browserType = this._playwright[browserName];
    const controller = new import_progress.ProgressController();
    const browser = await controller.run((progress) => browserType.launch(progress, launchOptions), launchOptions.timeout);
    this._dontReuseBrowsers.add(browser);
    return {
      preLaunchedBrowser: browser,
      socksProxy,
      denyLaunch: true,
      dispose: async () => {
        await browser.close({ reason: "Connection terminated" });
        socksProxy?.close();
      }
    };
  }
  _dontReuse(browser) {
    this._dontReuseBrowsers.add(browser);
    browser.on(import_browser.Browser.Events.Disconnected, () => {
      this._dontReuseBrowsers.delete(browser);
    });
  }
  async listen(port = 0, hostname) {
    return this._wsServer.listen(port, hostname, this._options.path);
  }
  async close() {
    await this._wsServer.close();
  }
}
function userAgentVersionMatchesErrorMessage(userAgent) {
  const match = userAgent.match(/^Playwright\/(\d+\.\d+\.\d+)/);
  if (!match) {
    return;
  }
  const received = match[1].split(".").slice(0, 2).join(".");
  const expected = (0, import_userAgent.getPlaywrightVersion)(true);
  if (received !== expected) {
    return (0, import_ascii.wrapInASCIIBox)([
      `Playwright version mismatch:`,
      `  - server version: v${expected}`,
      `  - client version: v${received}`,
      ``,
      `If you are using VSCode extension, restart VSCode.`,
      ``,
      `If you are connecting to a remote service,`,
      `keep your local Playwright version in sync`,
      `with the remote service version.`,
      ``,
      `<3 Playwright Team`
    ].join("\n"), 1);
  }
}
function launchOptionsHash(options) {
  const copy = { ...options };
  for (const k of Object.keys(copy)) {
    const key = k;
    if (copy[key] === defaultLaunchOptions[key])
      delete copy[key];
  }
  for (const key of optionsThatAllowBrowserReuse)
    delete copy[key];
  return JSON.stringify(copy);
}
function filterLaunchOptions(options, allowFSPaths) {
  return {
    channel: options.channel,
    args: options.args,
    ignoreAllDefaultArgs: options.ignoreAllDefaultArgs,
    ignoreDefaultArgs: options.ignoreDefaultArgs,
    timeout: options.timeout,
    headless: options.headless,
    proxy: options.proxy,
    chromiumSandbox: options.chromiumSandbox,
    firefoxUserPrefs: options.firefoxUserPrefs,
    slowMo: options.slowMo,
    executablePath: (0, import_utils.isUnderTest)() || allowFSPaths ? options.executablePath : void 0,
    downloadsPath: allowFSPaths ? options.downloadsPath : void 0
  };
}
const defaultLaunchOptions = {
  ignoreAllDefaultArgs: false,
  handleSIGINT: false,
  handleSIGTERM: false,
  handleSIGHUP: false,
  headless: true
};
const optionsThatAllowBrowserReuse = [
  "headless",
  "timeout",
  "tracesDir"
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PlaywrightServer
});
