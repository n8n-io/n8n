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
var index_exports = {};
__export(index_exports, {
  _baseTest: () => _baseTest,
  defineConfig: () => import_configLoader.defineConfig,
  expect: () => import_expect.expect,
  mergeExpects: () => import_expect2.mergeExpects,
  mergeTests: () => import_testType2.mergeTests,
  test: () => test
});
module.exports = __toCommonJS(index_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var playwrightLibrary = __toESM(require("playwright-core"));
var import_utils = require("playwright-core/lib/utils");
var import_globals = require("./common/globals");
var import_testType = require("./common/testType");
var import_browserBackend = require("./mcp/test/browserBackend");
var import_expect = require("./matchers/expect");
var import_configLoader = require("./common/configLoader");
var import_testType2 = require("./common/testType");
var import_expect2 = require("./matchers/expect");
const _baseTest = import_testType.rootTestType.test;
(0, import_utils.setBoxedStackPrefixes)([import_path.default.dirname(require.resolve("../package.json"))]);
if (process["__pw_initiator__"]) {
  const originalStackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 200;
  try {
    throw new Error("Requiring @playwright/test second time, \nFirst:\n" + process["__pw_initiator__"] + "\n\nSecond: ");
  } finally {
    Error.stackTraceLimit = originalStackTraceLimit;
  }
} else {
  process["__pw_initiator__"] = new Error().stack;
}
const playwrightFixtures = {
  defaultBrowserType: ["chromium", { scope: "worker", option: true, box: true }],
  browserName: [({ defaultBrowserType }, use) => use(defaultBrowserType), { scope: "worker", option: true, box: true }],
  playwright: [async ({}, use) => {
    await use(require("playwright-core"));
  }, { scope: "worker", box: true }],
  headless: [({ launchOptions }, use) => use(launchOptions.headless ?? true), { scope: "worker", option: true, box: true }],
  channel: [({ launchOptions }, use) => use(launchOptions.channel), { scope: "worker", option: true, box: true }],
  launchOptions: [{}, { scope: "worker", option: true, box: true }],
  connectOptions: [async ({ _optionConnectOptions }, use) => {
    await use(connectOptionsFromEnv() || _optionConnectOptions);
  }, { scope: "worker", option: true, box: true }],
  screenshot: ["off", { scope: "worker", option: true, box: true }],
  video: ["off", { scope: "worker", option: true, box: true }],
  trace: ["off", { scope: "worker", option: true, box: true }],
  _browserOptions: [async ({ playwright, headless, channel, launchOptions }, use) => {
    const options = {
      handleSIGINT: false,
      ...launchOptions,
      tracesDir: tracing().tracesDir()
    };
    if (headless !== void 0)
      options.headless = headless;
    if (channel !== void 0)
      options.channel = channel;
    playwright._defaultLaunchOptions = options;
    await use(options);
    playwright._defaultLaunchOptions = void 0;
  }, { scope: "worker", auto: true, box: true }],
  browser: [async ({ playwright, browserName, _browserOptions, connectOptions }, use) => {
    if (!["chromium", "firefox", "webkit"].includes(browserName))
      throw new Error(`Unexpected browserName "${browserName}", must be one of "chromium", "firefox" or "webkit"`);
    if (connectOptions) {
      const browser2 = await playwright[browserName].connect({
        ...connectOptions,
        exposeNetwork: connectOptions.exposeNetwork ?? connectOptions._exposeNetwork,
        headers: {
          // HTTP headers are ASCII only (not UTF-8).
          "x-playwright-launch-options": (0, import_utils.jsonStringifyForceASCII)(_browserOptions),
          ...connectOptions.headers
        }
      });
      await use(browser2);
      await browser2.close({ reason: "Test ended." });
      return;
    }
    const browser = await playwright[browserName].launch();
    await use(browser);
    await browser.close({ reason: "Test ended." });
  }, { scope: "worker", timeout: 0 }],
  acceptDownloads: [({ contextOptions }, use) => use(contextOptions.acceptDownloads ?? true), { option: true, box: true }],
  bypassCSP: [({ contextOptions }, use) => use(contextOptions.bypassCSP ?? false), { option: true, box: true }],
  colorScheme: [({ contextOptions }, use) => use(contextOptions.colorScheme === void 0 ? "light" : contextOptions.colorScheme), { option: true, box: true }],
  deviceScaleFactor: [({ contextOptions }, use) => use(contextOptions.deviceScaleFactor), { option: true, box: true }],
  extraHTTPHeaders: [({ contextOptions }, use) => use(contextOptions.extraHTTPHeaders), { option: true, box: true }],
  geolocation: [({ contextOptions }, use) => use(contextOptions.geolocation), { option: true, box: true }],
  hasTouch: [({ contextOptions }, use) => use(contextOptions.hasTouch ?? false), { option: true, box: true }],
  httpCredentials: [({ contextOptions }, use) => use(contextOptions.httpCredentials), { option: true, box: true }],
  ignoreHTTPSErrors: [({ contextOptions }, use) => use(contextOptions.ignoreHTTPSErrors ?? false), { option: true, box: true }],
  isMobile: [({ contextOptions }, use) => use(contextOptions.isMobile ?? false), { option: true, box: true }],
  javaScriptEnabled: [({ contextOptions }, use) => use(contextOptions.javaScriptEnabled ?? true), { option: true, box: true }],
  locale: [({ contextOptions }, use) => use(contextOptions.locale ?? "en-US"), { option: true, box: true }],
  offline: [({ contextOptions }, use) => use(contextOptions.offline ?? false), { option: true, box: true }],
  permissions: [({ contextOptions }, use) => use(contextOptions.permissions), { option: true, box: true }],
  proxy: [({ contextOptions }, use) => use(contextOptions.proxy), { option: true, box: true }],
  storageState: [({ contextOptions }, use) => use(contextOptions.storageState), { option: true, box: true }],
  clientCertificates: [({ contextOptions }, use) => use(contextOptions.clientCertificates), { option: true, box: true }],
  timezoneId: [({ contextOptions }, use) => use(contextOptions.timezoneId), { option: true, box: true }],
  userAgent: [({ contextOptions }, use) => use(contextOptions.userAgent), { option: true, box: true }],
  viewport: [({ contextOptions }, use) => use(contextOptions.viewport === void 0 ? { width: 1280, height: 720 } : contextOptions.viewport), { option: true, box: true }],
  actionTimeout: [0, { option: true, box: true }],
  testIdAttribute: ["data-testid", { option: true, box: true }],
  navigationTimeout: [0, { option: true, box: true }],
  baseURL: [async ({}, use) => {
    await use(process.env.PLAYWRIGHT_TEST_BASE_URL);
  }, { option: true, box: true }],
  serviceWorkers: [({ contextOptions }, use) => use(contextOptions.serviceWorkers ?? "allow"), { option: true, box: true }],
  contextOptions: [{}, { option: true, box: true }],
  agentOptions: [void 0, { option: true, box: true }],
  _combinedContextOptions: [async ({
    acceptDownloads,
    bypassCSP,
    clientCertificates,
    colorScheme,
    deviceScaleFactor,
    extraHTTPHeaders,
    hasTouch,
    geolocation,
    httpCredentials,
    ignoreHTTPSErrors,
    isMobile,
    javaScriptEnabled,
    locale,
    offline,
    permissions,
    proxy,
    storageState,
    viewport,
    timezoneId,
    userAgent,
    baseURL,
    contextOptions,
    serviceWorkers
  }, use, testInfo) => {
    const options = {};
    if (acceptDownloads !== void 0)
      options.acceptDownloads = acceptDownloads;
    if (bypassCSP !== void 0)
      options.bypassCSP = bypassCSP;
    if (colorScheme !== void 0)
      options.colorScheme = colorScheme;
    if (deviceScaleFactor !== void 0)
      options.deviceScaleFactor = deviceScaleFactor;
    if (extraHTTPHeaders !== void 0)
      options.extraHTTPHeaders = extraHTTPHeaders;
    if (geolocation !== void 0)
      options.geolocation = geolocation;
    if (hasTouch !== void 0)
      options.hasTouch = hasTouch;
    if (httpCredentials !== void 0)
      options.httpCredentials = httpCredentials;
    if (ignoreHTTPSErrors !== void 0)
      options.ignoreHTTPSErrors = ignoreHTTPSErrors;
    if (isMobile !== void 0)
      options.isMobile = isMobile;
    if (javaScriptEnabled !== void 0)
      options.javaScriptEnabled = javaScriptEnabled;
    if (locale !== void 0)
      options.locale = locale;
    if (offline !== void 0)
      options.offline = offline;
    if (permissions !== void 0)
      options.permissions = permissions;
    if (proxy !== void 0)
      options.proxy = proxy;
    if (storageState !== void 0)
      options.storageState = storageState;
    if (clientCertificates?.length)
      options.clientCertificates = resolveClientCerticates(clientCertificates);
    if (timezoneId !== void 0)
      options.timezoneId = timezoneId;
    if (userAgent !== void 0)
      options.userAgent = userAgent;
    if (viewport !== void 0)
      options.viewport = viewport;
    if (baseURL !== void 0)
      options.baseURL = baseURL;
    if (serviceWorkers !== void 0)
      options.serviceWorkers = serviceWorkers;
    await use({
      ...contextOptions,
      ...options
    });
  }, { box: true }],
  _setupContextOptions: [async ({ playwright, actionTimeout, navigationTimeout, testIdAttribute }, use, testInfo) => {
    if (testIdAttribute)
      playwrightLibrary.selectors.setTestIdAttribute(testIdAttribute);
    testInfo.snapshotSuffix = process.platform;
    if ((0, import_utils.debugMode)() === "inspector")
      testInfo._setDebugMode();
    playwright._defaultContextTimeout = actionTimeout || 0;
    playwright._defaultContextNavigationTimeout = navigationTimeout || 0;
    await use();
    playwright._defaultContextTimeout = void 0;
    playwright._defaultContextNavigationTimeout = void 0;
  }, { auto: "all-hooks-included", title: "context configuration", box: true }],
  _setupArtifacts: [async ({ playwright, screenshot, _combinedContextOptions }, use, testInfo) => {
    testInfo.setTimeout(testInfo.project.timeout);
    const artifactsRecorder = new ArtifactsRecorder(playwright, tracing().artifactsDir(), screenshot);
    await artifactsRecorder.willStartTest(testInfo);
    const tracingGroupSteps = [];
    const csiListener = {
      onApiCallBegin: (data, channel) => {
        const testInfo2 = (0, import_globals.currentTestInfo)();
        if (!testInfo2 || data.apiName.includes("setTestIdAttribute") || data.apiName === "tracing.groupEnd")
          return;
        const zone = (0, import_utils.currentZone)().data("stepZone");
        const isExpectCall = data.apiName === "locator._expect" || data.apiName === "frame._expect" || data.apiName === "page._expectScreenshot";
        if (zone && zone.category === "expect" && isExpectCall) {
          if (zone.apiName)
            data.apiName = zone.apiName;
          if (zone.shortTitle || zone.title)
            data.title = zone.shortTitle ?? zone.title;
          data.stepId = zone.stepId;
          return;
        }
        const step = testInfo2._addStep({
          location: data.frames[0],
          category: "pw:api",
          title: renderTitle(channel.type, channel.method, channel.params, data.title),
          apiName: data.apiName,
          params: channel.params,
          group: (0, import_utils.getActionGroup)({ type: channel.type, method: channel.method })
        }, tracingGroupSteps[tracingGroupSteps.length - 1]);
        data.userData = step;
        data.stepId = step.stepId;
        if (data.apiName === "tracing.group")
          tracingGroupSteps.push(step);
      },
      onApiCallEnd: (data) => {
        if (data.apiName === "tracing.group")
          return;
        if (data.apiName === "tracing.groupEnd") {
          const step2 = tracingGroupSteps.pop();
          step2?.complete({ error: data.error });
          return;
        }
        const step = data.userData;
        step?.complete({ error: data.error });
      },
      onWillPause: ({ keepTestTimeout }) => {
        if (!keepTestTimeout)
          (0, import_globals.currentTestInfo)()?._setDebugMode();
      },
      runBeforeCreateBrowserContext: async (options) => {
        for (const [key, value] of Object.entries(_combinedContextOptions)) {
          if (!(key in options))
            options[key] = value;
        }
      },
      runBeforeCreateRequestContext: async (options) => {
        for (const [key, value] of Object.entries(_combinedContextOptions)) {
          if (!(key in options))
            options[key] = value;
        }
      },
      runAfterCreateBrowserContext: async (context) => {
        await artifactsRecorder.didCreateBrowserContext(context);
        const testInfo2 = (0, import_globals.currentTestInfo)();
        if (testInfo2)
          attachConnectedHeaderIfNeeded(testInfo2, context.browser());
      },
      runAfterCreateRequestContext: async (context) => {
        await artifactsRecorder.didCreateRequestContext(context);
      },
      runBeforeCloseBrowserContext: async (context) => {
        await artifactsRecorder.willCloseBrowserContext(context);
      },
      runBeforeCloseRequestContext: async (context) => {
        await artifactsRecorder.willCloseRequestContext(context);
      }
    };
    const clientInstrumentation = playwright._instrumentation;
    clientInstrumentation.addListener(csiListener);
    await use();
    clientInstrumentation.removeListener(csiListener);
    await artifactsRecorder.didFinishTest();
  }, { auto: "all-hooks-included", title: "trace recording", box: true, timeout: 0 }],
  _contextFactory: [async ({
    browser,
    video,
    _reuseContext,
    _combinedContextOptions
    /** mitigate dep-via-auto lack of traceability */
  }, use, testInfo) => {
    const testInfoImpl = testInfo;
    const videoMode = normalizeVideoMode(video);
    const captureVideo = shouldCaptureVideo(videoMode, testInfo) && !_reuseContext;
    const contexts = /* @__PURE__ */ new Map();
    let counter = 0;
    await use(async (options) => {
      const hook = testInfoImpl._currentHookType();
      if (hook === "beforeAll" || hook === "afterAll") {
        throw new Error([
          `"context" and "page" fixtures are not supported in "${hook}" since they are created on a per-test basis.`,
          `If you would like to reuse a single page between tests, create context manually with browser.newContext(). See https://aka.ms/playwright/reuse-page for details.`,
          `If you would like to configure your page before each test, do that in beforeEach hook instead.`
        ].join("\n"));
      }
      const videoOptions = captureVideo ? {
        recordVideo: {
          dir: tracing().artifactsDir(),
          size: typeof video === "string" ? void 0 : video.size
        }
      } : {};
      const context = await browser.newContext({ ...videoOptions, ...options });
      if (process.env.PW_CLOCK === "frozen") {
        await context._wrapApiCall(async () => {
          await context.clock.install({ time: 0 });
          await context.clock.pauseAt(1e3);
        }, { internal: true });
      } else if (process.env.PW_CLOCK === "realtime") {
        await context._wrapApiCall(async () => {
          await context.clock.install({ time: 0 });
        }, { internal: true });
      }
      let closed = false;
      const close = async () => {
        if (closed)
          return;
        closed = true;
        const closeReason = testInfo.status === "timedOut" ? "Test timeout of " + testInfo.timeout + "ms exceeded." : "Test ended.";
        await context.close({ reason: closeReason });
        const testFailed = testInfo.status !== testInfo.expectedStatus;
        const preserveVideo = captureVideo && (videoMode === "on" || testFailed && videoMode === "retain-on-failure" || videoMode === "on-first-retry" && testInfo.retry === 1);
        if (preserveVideo) {
          const { pagesWithVideo: pagesForVideo } = contexts.get(context);
          const videos = pagesForVideo.map((p) => p.video()).filter((video2) => !!video2);
          await Promise.all(videos.map(async (v) => {
            try {
              const savedPath = testInfo.outputPath(`video${counter ? "-" + counter : ""}.webm`);
              ++counter;
              await v.saveAs(savedPath);
              testInfo.attachments.push({ name: "video", path: savedPath, contentType: "video/webm" });
            } catch (e) {
            }
          }));
        }
      };
      const contextData = { close, pagesWithVideo: [] };
      if (captureVideo)
        context.on("page", (page) => contextData.pagesWithVideo.push(page));
      contexts.set(context, contextData);
      return { context, close };
    });
    await Promise.all([...contexts.values()].map((data) => data.close()));
  }, { scope: "test", title: "context", box: true }],
  _optionContextReuseMode: ["none", { scope: "worker", option: true, box: true }],
  _optionConnectOptions: [void 0, { scope: "worker", option: true, box: true }],
  _reuseContext: [async ({ video, _optionContextReuseMode }, use) => {
    let mode = _optionContextReuseMode;
    if (process.env.PW_TEST_REUSE_CONTEXT)
      mode = "when-possible";
    const reuse = mode === "when-possible" && normalizeVideoMode(video) === "off";
    await use(reuse);
  }, { scope: "worker", title: "context", box: true }],
  context: async ({ browser, _reuseContext, _contextFactory }, use, testInfo) => {
    const browserImpl = browser;
    attachConnectedHeaderIfNeeded(testInfo, browserImpl);
    if (!_reuseContext) {
      const { context: context2, close } = await _contextFactory();
      testInfo._onCustomMessageCallback = (0, import_browserBackend.createCustomMessageHandler)(testInfo, context2);
      await use(context2);
      await close();
      return;
    }
    const context = await browserImpl._wrapApiCall(() => browserImpl._newContextForReuse(), { internal: true });
    testInfo._onCustomMessageCallback = (0, import_browserBackend.createCustomMessageHandler)(testInfo, context);
    await use(context);
    const closeReason = testInfo.status === "timedOut" ? "Test timeout of " + testInfo.timeout + "ms exceeded." : "Test ended.";
    await browserImpl._wrapApiCall(() => browserImpl._disconnectFromReusedContext(closeReason), { internal: true });
  },
  page: async ({ context, _reuseContext }, use) => {
    if (!_reuseContext) {
      await use(await context.newPage());
      return;
    }
    let [page] = context.pages();
    if (!page)
      page = await context.newPage();
    await use(page);
  },
  agent: async ({ page, agentOptions }, use, testInfo) => {
    const testInfoImpl = testInfo;
    const cachePathTemplate = agentOptions?.cachePathTemplate ?? "{testDir}/{testFilePath}-cache.json";
    const resolvedCacheFile = testInfoImpl._applyPathTemplate(cachePathTemplate, "", ".json");
    const cacheFile = testInfoImpl.config.runAgents === "all" ? void 0 : await testInfoImpl._cloneStorage(resolvedCacheFile);
    const cacheOutFile = import_path.default.join(testInfoImpl.artifactsDir(), "agent-cache-" + (0, import_utils.createGuid)() + ".json");
    const provider = agentOptions?.provider && testInfo.config.runAgents !== "none" ? agentOptions.provider : void 0;
    if (provider)
      testInfo.setTimeout(0);
    const cache = {
      cacheFile,
      cacheOutFile
    };
    const agent = await page.agent({
      provider,
      cache,
      limits: agentOptions?.limits,
      secrets: agentOptions?.secrets,
      systemPrompt: agentOptions?.systemPrompt,
      expect: {
        timeout: testInfoImpl._projectInternal.expect?.timeout
      }
    });
    await use(agent);
    const usage = await agent.usage();
    if (usage.turns > 0)
      await testInfoImpl.attach("agent-usage", { contentType: "application/json", body: Buffer.from(JSON.stringify(usage, null, 2)) });
    if (!resolvedCacheFile || !cacheOutFile)
      return;
    if (testInfo.status !== "passed")
      return;
    await testInfoImpl._upstreamStorage(resolvedCacheFile, cacheOutFile);
  },
  request: async ({ playwright }, use) => {
    const request = await playwright.request.newContext();
    await use(request);
    const hook = test.info()._currentHookType();
    if (hook === "beforeAll") {
      await request.dispose({ reason: [
        `Fixture { request } from beforeAll cannot be reused in a test.`,
        `  - Recommended fix: use a separate { request } in the test.`,
        `  - Alternatively, manually create APIRequestContext in beforeAll and dispose it in afterAll.`,
        `See https://playwright.dev/docs/api-testing#sending-api-requests-from-ui-tests for more details.`
      ].join("\n") });
    } else {
      await request.dispose();
    }
  }
};
function normalizeVideoMode(video) {
  if (!video)
    return "off";
  let videoMode = typeof video === "string" ? video : video.mode;
  if (videoMode === "retry-with-video")
    videoMode = "on-first-retry";
  return videoMode;
}
function shouldCaptureVideo(videoMode, testInfo) {
  return videoMode === "on" || videoMode === "retain-on-failure" || videoMode === "on-first-retry" && testInfo.retry === 1;
}
function normalizeScreenshotMode(screenshot) {
  if (!screenshot)
    return "off";
  return typeof screenshot === "string" ? screenshot : screenshot.mode;
}
function attachConnectedHeaderIfNeeded(testInfo, browser) {
  const connectHeaders = browser?._connection.headers;
  if (!connectHeaders)
    return;
  for (const header of connectHeaders) {
    if (header.name !== "x-playwright-attachment")
      continue;
    const [name, value] = header.value.split("=");
    if (!name || !value)
      continue;
    if (testInfo.attachments.some((attachment) => attachment.name === name))
      continue;
    testInfo.attachments.push({ name, contentType: "text/plain", body: Buffer.from(value) });
  }
}
function resolveFileToConfig(file) {
  const config = test.info().config.configFile;
  if (!config || !file)
    return file;
  if (import_path.default.isAbsolute(file))
    return file;
  return import_path.default.resolve(import_path.default.dirname(config), file);
}
function resolveClientCerticates(clientCertificates) {
  for (const cert of clientCertificates) {
    cert.certPath = resolveFileToConfig(cert.certPath);
    cert.keyPath = resolveFileToConfig(cert.keyPath);
    cert.pfxPath = resolveFileToConfig(cert.pfxPath);
  }
  return clientCertificates;
}
const kTracingStarted = Symbol("kTracingStarted");
function connectOptionsFromEnv() {
  const wsEndpoint = process.env.PW_TEST_CONNECT_WS_ENDPOINT;
  if (!wsEndpoint)
    return void 0;
  const headers = process.env.PW_TEST_CONNECT_HEADERS ? JSON.parse(process.env.PW_TEST_CONNECT_HEADERS) : void 0;
  return {
    wsEndpoint,
    headers,
    exposeNetwork: process.env.PW_TEST_CONNECT_EXPOSE_NETWORK
  };
}
class SnapshotRecorder {
  constructor(_artifactsRecorder, _mode, _name, _contentType, _extension, _doSnapshot) {
    this._artifactsRecorder = _artifactsRecorder;
    this._mode = _mode;
    this._name = _name;
    this._contentType = _contentType;
    this._extension = _extension;
    this._doSnapshot = _doSnapshot;
    this._ordinal = 0;
    this._temporary = [];
  }
  fixOrdinal() {
    this._ordinal = this.testInfo.attachments.filter((a) => a.name === this._name).length;
  }
  shouldCaptureUponFinish() {
    return this._mode === "on" || this._mode === "only-on-failure" && this.testInfo._isFailure() || this._mode === "on-first-failure" && this.testInfo._isFailure() && this.testInfo.retry === 0;
  }
  async maybeCapture() {
    if (!this.shouldCaptureUponFinish())
      return;
    await Promise.all(this._artifactsRecorder._playwright._allPages().map((page) => this._snapshotPage(page, false)));
  }
  async persistTemporary() {
    if (this.shouldCaptureUponFinish()) {
      await Promise.all(this._temporary.map(async (file) => {
        try {
          const path2 = this._createAttachmentPath();
          await import_fs.default.promises.rename(file, path2);
          this._attach(path2);
        } catch {
        }
      }));
    }
  }
  async captureTemporary(context) {
    if (this._mode === "on" || this._mode === "only-on-failure" || this._mode === "on-first-failure" && this.testInfo.retry === 0)
      await Promise.all(context.pages().map((page) => this._snapshotPage(page, true)));
  }
  _attach(screenshotPath) {
    this.testInfo.attachments.push({ name: this._name, path: screenshotPath, contentType: this._contentType });
  }
  _createAttachmentPath() {
    const testFailed = this.testInfo._isFailure();
    const index = this._ordinal + 1;
    ++this._ordinal;
    const path2 = this.testInfo.outputPath(`test-${testFailed ? "failed" : "finished"}-${index}${this._extension}`);
    return path2;
  }
  _createTemporaryArtifact(...name) {
    const file = import_path.default.join(this._artifactsRecorder._artifactsDir, ...name);
    return file;
  }
  async _snapshotPage(page, temporary) {
    if (page[this.testInfo._uniqueSymbol])
      return;
    page[this.testInfo._uniqueSymbol] = true;
    try {
      const path2 = temporary ? this._createTemporaryArtifact((0, import_utils.createGuid)() + this._extension) : this._createAttachmentPath();
      await this._doSnapshot(page, path2);
      if (temporary)
        this._temporary.push(path2);
      else
        this._attach(path2);
    } catch {
    }
  }
  get testInfo() {
    return this._artifactsRecorder._testInfo;
  }
}
class ArtifactsRecorder {
  constructor(playwright, artifactsDir, screenshot) {
    this._playwright = playwright;
    this._artifactsDir = artifactsDir;
    const screenshotOptions = typeof screenshot === "string" ? void 0 : screenshot;
    this._startedCollectingArtifacts = Symbol("startedCollectingArtifacts");
    this._screenshotRecorder = new SnapshotRecorder(this, normalizeScreenshotMode(screenshot), "screenshot", "image/png", ".png", async (page, path2) => {
      await page._wrapApiCall(async () => {
        await page.screenshot({ ...screenshotOptions, timeout: 5e3, path: path2, caret: "initial" });
      }, { internal: true });
    });
  }
  async willStartTest(testInfo) {
    this._testInfo = testInfo;
    testInfo._onDidFinishTestFunctionCallback = () => this.didFinishTestFunction();
    this._screenshotRecorder.fixOrdinal();
    await Promise.all(this._playwright._allContexts().map((context) => this.didCreateBrowserContext(context)));
    const existingApiRequests = Array.from(this._playwright.request._contexts);
    await Promise.all(existingApiRequests.map((c) => this.didCreateRequestContext(c)));
  }
  async didCreateBrowserContext(context) {
    await this._startTraceChunkOnContextCreation(context, context.tracing);
  }
  async willCloseBrowserContext(context) {
    await this._stopTracing(context, context.tracing);
    await this._screenshotRecorder.captureTemporary(context);
    await this._takePageSnapshot(context);
  }
  async _takePageSnapshot(context) {
    if (process.env.PLAYWRIGHT_NO_COPY_PROMPT)
      return;
    if (this._testInfo.errors.length === 0)
      return;
    if (this._pageSnapshot)
      return;
    const page = context.pages()[0];
    if (!page)
      return;
    try {
      await page._wrapApiCall(async () => {
        this._pageSnapshot = (await page._snapshotForAI({ timeout: 5e3 })).full;
      }, { internal: true });
    } catch {
    }
  }
  async didCreateRequestContext(context) {
    await this._startTraceChunkOnContextCreation(context, context._tracing);
  }
  async willCloseRequestContext(context) {
    await this._stopTracing(context, context._tracing);
  }
  async didFinishTestFunction() {
    await this._screenshotRecorder.maybeCapture();
  }
  async didFinishTest() {
    await this.didFinishTestFunction();
    const leftoverContexts = this._playwright._allContexts();
    const leftoverApiRequests = Array.from(this._playwright.request._contexts);
    await Promise.all(leftoverContexts.map(async (context2) => {
      await this._stopTracing(context2, context2.tracing);
    }).concat(leftoverApiRequests.map(async (context2) => {
      await this._stopTracing(context2, context2._tracing);
    })));
    await this._screenshotRecorder.persistTemporary();
    const context = leftoverContexts[0];
    if (context)
      await this._takePageSnapshot(context);
    if (this._pageSnapshot && this._testInfo.errors.length > 0 && !this._testInfo.attachments.some((a) => a.name === "error-context")) {
      const lines = [
        "# Page snapshot",
        "",
        "```yaml",
        this._pageSnapshot,
        "```"
      ];
      const filePath = this._testInfo.outputPath("error-context.md");
      await import_fs.default.promises.writeFile(filePath, lines.join("\n"), "utf8");
      this._testInfo._attach({
        name: "error-context",
        contentType: "text/markdown",
        path: filePath
      }, void 0);
    }
  }
  async _startTraceChunkOnContextCreation(channelOwner, tracing2) {
    await channelOwner._wrapApiCall(async () => {
      const options = this._testInfo._tracing.traceOptions();
      if (options) {
        const title = this._testInfo._tracing.traceTitle();
        const name = this._testInfo._tracing.generateNextTraceRecordingName();
        if (!tracing2[kTracingStarted]) {
          await tracing2.start({ ...options, title, name });
          tracing2[kTracingStarted] = true;
        } else {
          await tracing2.startChunk({ title, name });
        }
      } else {
        if (tracing2[kTracingStarted]) {
          tracing2[kTracingStarted] = false;
          await tracing2.stop();
        }
      }
    }, { internal: true });
  }
  async _stopTracing(channelOwner, tracing2) {
    await channelOwner._wrapApiCall(async () => {
      if (tracing2[this._startedCollectingArtifacts])
        return;
      tracing2[this._startedCollectingArtifacts] = true;
      if (this._testInfo._tracing.traceOptions() && tracing2[kTracingStarted])
        await tracing2.stopChunk({ path: this._testInfo._tracing.maybeGenerateNextTraceRecordingPath() });
    }, { internal: true });
  }
}
function renderTitle(type, method, params, title) {
  const prefix = (0, import_utils.renderTitleForCall)({ title, type, method, params });
  let selector;
  if (params?.["selector"] && typeof params.selector === "string")
    selector = (0, import_utils.asLocatorDescription)("javascript", params.selector);
  return prefix + (selector ? ` ${selector}` : "");
}
function tracing() {
  return test.info()._tracing;
}
const test = _baseTest.extend(playwrightFixtures);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  _baseTest,
  defineConfig,
  expect,
  mergeExpects,
  mergeTests,
  test
});
