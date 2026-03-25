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
var browserContextDispatcher_exports = {};
__export(browserContextDispatcher_exports, {
  BrowserContextDispatcher: () => BrowserContextDispatcher
});
module.exports = __toCommonJS(browserContextDispatcher_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_browserContext = require("../browserContext");
var import_artifactDispatcher = require("./artifactDispatcher");
var import_cdpSessionDispatcher = require("./cdpSessionDispatcher");
var import_dialogDispatcher = require("./dialogDispatcher");
var import_dispatcher = require("./dispatcher");
var import_frameDispatcher = require("./frameDispatcher");
var import_networkDispatchers = require("./networkDispatchers");
var import_pageDispatcher = require("./pageDispatcher");
var import_crBrowser = require("../chromium/crBrowser");
var import_errors = require("../errors");
var import_tracingDispatcher = require("./tracingDispatcher");
var import_webSocketRouteDispatcher = require("./webSocketRouteDispatcher");
var import_writableStreamDispatcher = require("./writableStreamDispatcher");
var import_crypto = require("../utils/crypto");
var import_urlMatch = require("../../utils/isomorphic/urlMatch");
var import_recorder = require("../recorder");
var import_recorderApp = require("../recorder/recorderApp");
var import_elementHandlerDispatcher = require("./elementHandlerDispatcher");
var import_jsHandleDispatcher = require("./jsHandleDispatcher");
class BrowserContextDispatcher extends import_dispatcher.Dispatcher {
  constructor(parentScope, context) {
    const requestContext = import_networkDispatchers.APIRequestContextDispatcher.from(parentScope, context.fetchRequest);
    const tracing = import_tracingDispatcher.TracingDispatcher.from(parentScope, context.tracing);
    super(parentScope, context, "BrowserContext", {
      isChromium: context._browser.options.isChromium,
      requestContext,
      tracing,
      options: context._options
    });
    this._type_EventTarget = true;
    this._type_BrowserContext = true;
    this._subscriptions = /* @__PURE__ */ new Set();
    this._webSocketInterceptionPatterns = [];
    this._bindings = [];
    this._initScripts = [];
    this._clockPaused = false;
    this._interceptionUrlMatchers = [];
    this.adopt(requestContext);
    this.adopt(tracing);
    this._requestInterceptor = (route, request) => {
      const matchesSome = this._interceptionUrlMatchers.some((urlMatch) => (0, import_urlMatch.urlMatches)(this._context._options.baseURL, request.url(), urlMatch));
      const routeDispatcher = this.connection.existingDispatcher(route);
      if (!matchesSome || routeDispatcher) {
        route.continue({ isFallback: true }).catch(() => {
        });
        return;
      }
      this._dispatchEvent("route", { route: new import_networkDispatchers.RouteDispatcher(import_networkDispatchers.RequestDispatcher.from(this, request), route) });
    };
    this._context = context;
    const onVideo = (artifact) => {
      const artifactDispatcher = import_artifactDispatcher.ArtifactDispatcher.from(parentScope, artifact);
      this._dispatchEvent("video", { artifact: artifactDispatcher });
    };
    this.addObjectListener(import_browserContext.BrowserContext.Events.VideoStarted, onVideo);
    for (const video of context._browser._idToVideo.values()) {
      if (video.context === context)
        onVideo(video.artifact);
    }
    for (const page of context.pages())
      this._dispatchEvent("page", { page: import_pageDispatcher.PageDispatcher.from(this, page) });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Page, (page) => {
      this._dispatchEvent("page", { page: import_pageDispatcher.PageDispatcher.from(this, page) });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Close, () => {
      this._dispatchEvent("close");
      this._dispose();
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.PageError, (error, page) => {
      this._dispatchEvent("pageError", { error: (0, import_errors.serializeError)(error), page: import_pageDispatcher.PageDispatcher.from(this, page) });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Console, (message) => {
      const pageDispatcher = import_pageDispatcher.PageDispatcher.fromNullable(this, message.page());
      const workerDispatcher = import_pageDispatcher.WorkerDispatcher.fromNullable(this, message.worker());
      if (this._shouldDispatchEvent(message.page(), "console") || workerDispatcher?._subscriptions.has("console")) {
        this._dispatchEvent("console", {
          page: pageDispatcher,
          worker: workerDispatcher,
          ...this.serializeConsoleMessage(message, workerDispatcher || pageDispatcher)
        });
      }
    });
    this._dialogHandler = (dialog) => {
      if (!this._shouldDispatchEvent(dialog.page(), "dialog"))
        return false;
      this._dispatchEvent("dialog", { dialog: new import_dialogDispatcher.DialogDispatcher(this, dialog) });
      return true;
    };
    context.dialogManager.addDialogHandler(this._dialogHandler);
    if (context._browser.options.name === "chromium" && this._object._browser instanceof import_crBrowser.CRBrowser) {
      for (const serviceWorker of context.serviceWorkers())
        this._dispatchEvent("serviceWorker", { worker: new import_pageDispatcher.WorkerDispatcher(this, serviceWorker) });
      this.addObjectListener(import_crBrowser.CRBrowserContext.CREvents.ServiceWorker, (serviceWorker) => this._dispatchEvent("serviceWorker", { worker: new import_pageDispatcher.WorkerDispatcher(this, serviceWorker) }));
    }
    this.addObjectListener(import_browserContext.BrowserContext.Events.Request, (request) => {
      const redirectFromDispatcher = request.redirectedFrom() && this.connection.existingDispatcher(request.redirectedFrom());
      if (!redirectFromDispatcher && !this._shouldDispatchNetworkEvent(request, "request") && !request.isNavigationRequest())
        return;
      const requestDispatcher = import_networkDispatchers.RequestDispatcher.from(this, request);
      this._dispatchEvent("request", {
        request: requestDispatcher,
        page: import_pageDispatcher.PageDispatcher.fromNullable(this, request.frame()?._page.initializedOrUndefined())
      });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Response, (response) => {
      const requestDispatcher = this.connection.existingDispatcher(response.request());
      if (!requestDispatcher && !this._shouldDispatchNetworkEvent(response.request(), "response"))
        return;
      this._dispatchEvent("response", {
        response: import_networkDispatchers.ResponseDispatcher.from(this, response),
        page: import_pageDispatcher.PageDispatcher.fromNullable(this, response.frame()?._page.initializedOrUndefined())
      });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.RequestFailed, (request) => {
      const requestDispatcher = this.connection.existingDispatcher(request);
      if (!requestDispatcher && !this._shouldDispatchNetworkEvent(request, "requestFailed"))
        return;
      this._dispatchEvent("requestFailed", {
        request: import_networkDispatchers.RequestDispatcher.from(this, request),
        failureText: request._failureText || void 0,
        responseEndTiming: request._responseEndTiming,
        page: import_pageDispatcher.PageDispatcher.fromNullable(this, request.frame()?._page.initializedOrUndefined())
      });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.RequestFinished, ({ request, response }) => {
      const requestDispatcher = this.connection.existingDispatcher(request);
      if (!requestDispatcher && !this._shouldDispatchNetworkEvent(request, "requestFinished"))
        return;
      this._dispatchEvent("requestFinished", {
        request: import_networkDispatchers.RequestDispatcher.from(this, request),
        response: import_networkDispatchers.ResponseDispatcher.fromNullable(this, response),
        responseEndTiming: request._responseEndTiming,
        page: import_pageDispatcher.PageDispatcher.fromNullable(this, request.frame()?._page.initializedOrUndefined())
      });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.RecorderEvent, ({ event, data, page, code }) => {
      this._dispatchEvent("recorderEvent", { event, data, code, page: import_pageDispatcher.PageDispatcher.from(this, page) });
    });
  }
  static from(parentScope, context) {
    const result = parentScope.connection.existingDispatcher(context);
    return result || new BrowserContextDispatcher(parentScope, context);
  }
  _shouldDispatchNetworkEvent(request, event) {
    return this._shouldDispatchEvent(request.frame()?._page?.initializedOrUndefined(), event);
  }
  _shouldDispatchEvent(page, event) {
    if (this._subscriptions.has(event))
      return true;
    const pageDispatcher = page ? this.connection.existingDispatcher(page) : void 0;
    if (pageDispatcher?._subscriptions.has(event))
      return true;
    return false;
  }
  serializeConsoleMessage(message, jsScope) {
    return {
      type: message.type(),
      text: message.text(),
      args: message.args().map((a) => {
        const elementHandle = a.asElement();
        if (elementHandle)
          return import_elementHandlerDispatcher.ElementHandleDispatcher.from(import_frameDispatcher.FrameDispatcher.from(this, elementHandle._frame), elementHandle);
        return import_jsHandleDispatcher.JSHandleDispatcher.fromJSHandle(jsScope, a);
      }),
      location: message.location()
    };
  }
  async createTempFiles(params, progress) {
    const dir = this._context._browser.options.artifactsDir;
    const tmpDir = import_path.default.join(dir, "upload-" + (0, import_crypto.createGuid)());
    const tempDirWithRootName = params.rootDirName ? import_path.default.join(tmpDir, import_path.default.basename(params.rootDirName)) : tmpDir;
    await progress.race(import_fs.default.promises.mkdir(tempDirWithRootName, { recursive: true }));
    this._context._tempDirs.push(tmpDir);
    return {
      rootDir: params.rootDirName ? new import_writableStreamDispatcher.WritableStreamDispatcher(this, tempDirWithRootName) : void 0,
      writableStreams: await Promise.all(params.items.map(async (item) => {
        await progress.race(import_fs.default.promises.mkdir(import_path.default.dirname(import_path.default.join(tempDirWithRootName, item.name)), { recursive: true }));
        const file = import_fs.default.createWriteStream(import_path.default.join(tempDirWithRootName, item.name));
        return new import_writableStreamDispatcher.WritableStreamDispatcher(this, file, item.lastModifiedMs);
      }))
    };
  }
  async exposeBinding(params, progress) {
    const binding = await this._context.exposeBinding(progress, params.name, !!params.needsHandle, (source, ...args) => {
      if (this._disposed)
        return;
      const pageDispatcher = import_pageDispatcher.PageDispatcher.from(this, source.page);
      const binding2 = new import_pageDispatcher.BindingCallDispatcher(pageDispatcher, params.name, !!params.needsHandle, source, args);
      this._dispatchEvent("bindingCall", { binding: binding2 });
      return binding2.promise();
    });
    this._bindings.push(binding);
  }
  async newPage(params, progress) {
    return { page: import_pageDispatcher.PageDispatcher.from(this, await this._context.newPage(progress)) };
  }
  async cookies(params, progress) {
    return { cookies: await progress.race(this._context.cookies(params.urls)) };
  }
  async addCookies(params, progress) {
    await this._context.addCookies(params.cookies);
  }
  async clearCookies(params, progress) {
    const nameRe = params.nameRegexSource !== void 0 && params.nameRegexFlags !== void 0 ? new RegExp(params.nameRegexSource, params.nameRegexFlags) : void 0;
    const domainRe = params.domainRegexSource !== void 0 && params.domainRegexFlags !== void 0 ? new RegExp(params.domainRegexSource, params.domainRegexFlags) : void 0;
    const pathRe = params.pathRegexSource !== void 0 && params.pathRegexFlags !== void 0 ? new RegExp(params.pathRegexSource, params.pathRegexFlags) : void 0;
    await this._context.clearCookies({
      name: nameRe || params.name,
      domain: domainRe || params.domain,
      path: pathRe || params.path
    });
  }
  async grantPermissions(params, progress) {
    await this._context.grantPermissions(params.permissions, params.origin);
  }
  async clearPermissions(params, progress) {
    await this._context.clearPermissions();
  }
  async setGeolocation(params, progress) {
    await this._context.setGeolocation(params.geolocation);
  }
  async setExtraHTTPHeaders(params, progress) {
    await this._context.setExtraHTTPHeaders(progress, params.headers);
  }
  async setOffline(params, progress) {
    await this._context.setOffline(progress, params.offline);
  }
  async setHTTPCredentials(params, progress) {
    await progress.race(this._context.setHTTPCredentials(params.httpCredentials));
  }
  async addInitScript(params, progress) {
    this._initScripts.push(await this._context.addInitScript(progress, params.source));
  }
  async setNetworkInterceptionPatterns(params, progress) {
    const hadMatchers = this._interceptionUrlMatchers.length > 0;
    if (!params.patterns.length) {
      if (hadMatchers)
        await this._context.removeRequestInterceptor(this._requestInterceptor);
      this._interceptionUrlMatchers = [];
    } else {
      this._interceptionUrlMatchers = params.patterns.map((pattern) => pattern.regexSource ? new RegExp(pattern.regexSource, pattern.regexFlags) : pattern.glob);
      if (!hadMatchers)
        await this._context.addRequestInterceptor(progress, this._requestInterceptor);
    }
  }
  async setWebSocketInterceptionPatterns(params, progress) {
    this._webSocketInterceptionPatterns = params.patterns;
    if (params.patterns.length && !this._routeWebSocketInitScript)
      this._routeWebSocketInitScript = await import_webSocketRouteDispatcher.WebSocketRouteDispatcher.install(progress, this.connection, this._context);
  }
  async storageState(params, progress) {
    return await progress.race(this._context.storageState(progress, params.indexedDB));
  }
  async close(params, progress) {
    progress.metadata.potentiallyClosesScope = true;
    await this._context.close(params);
  }
  async enableRecorder(params, progress) {
    await import_recorderApp.RecorderApp.show(this._context, params);
  }
  async disableRecorder(params, progress) {
    const recorder = await import_recorder.Recorder.existingForContext(this._context);
    if (recorder)
      recorder.setMode("none");
  }
  async exposeConsoleApi(params, progress) {
    await this._context.exposeConsoleApi();
  }
  async pause(params, progress) {
  }
  async newCDPSession(params, progress) {
    if (!this._object._browser.options.isChromium)
      throw new Error(`CDP session is only available in Chromium`);
    if (!params.page && !params.frame || params.page && params.frame)
      throw new Error(`CDP session must be initiated with either Page or Frame, not none or both`);
    const crBrowserContext = this._object;
    return { session: new import_cdpSessionDispatcher.CDPSessionDispatcher(this, await progress.race(crBrowserContext.newCDPSession((params.page ? params.page : params.frame)._object))) };
  }
  async harStart(params, progress) {
    const harId = this._context.harStart(params.page ? params.page._object : null, params.options);
    return { harId };
  }
  async harExport(params, progress) {
    const artifact = await progress.race(this._context.harExport(params.harId));
    if (!artifact)
      throw new Error("No HAR artifact. Ensure record.harPath is set.");
    return { artifact: import_artifactDispatcher.ArtifactDispatcher.from(this, artifact) };
  }
  async clockFastForward(params, progress) {
    await this._context.clock.fastForward(progress, params.ticksString ?? params.ticksNumber ?? 0);
  }
  async clockInstall(params, progress) {
    await this._context.clock.install(progress, params.timeString ?? params.timeNumber ?? void 0);
  }
  async clockPauseAt(params, progress) {
    await this._context.clock.pauseAt(progress, params.timeString ?? params.timeNumber ?? 0);
    this._clockPaused = true;
  }
  async clockResume(params, progress) {
    await this._context.clock.resume(progress);
    this._clockPaused = false;
  }
  async clockRunFor(params, progress) {
    await this._context.clock.runFor(progress, params.ticksString ?? params.ticksNumber ?? 0);
  }
  async clockSetFixedTime(params, progress) {
    await this._context.clock.setFixedTime(progress, params.timeString ?? params.timeNumber ?? 0);
  }
  async clockSetSystemTime(params, progress) {
    await this._context.clock.setSystemTime(progress, params.timeString ?? params.timeNumber ?? 0);
  }
  async updateSubscription(params, progress) {
    if (params.enabled)
      this._subscriptions.add(params.event);
    else
      this._subscriptions.delete(params.event);
  }
  async registerSelectorEngine(params, progress) {
    this._object.selectors().register(params.selectorEngine);
  }
  async setTestIdAttributeName(params, progress) {
    this._object.selectors().setTestIdAttributeName(params.testIdAttributeName);
  }
  _onDispose() {
    if (this._context.isClosingOrClosed())
      return;
    this._context.dialogManager.removeDialogHandler(this._dialogHandler);
    this._interceptionUrlMatchers = [];
    this._context.removeRequestInterceptor(this._requestInterceptor).catch(() => {
    });
    this._context.removeExposedBindings(this._bindings).catch(() => {
    });
    this._bindings = [];
    this._context.removeInitScripts(this._initScripts).catch(() => {
    });
    this._initScripts = [];
    if (this._routeWebSocketInitScript)
      import_webSocketRouteDispatcher.WebSocketRouteDispatcher.uninstall(this.connection, this._context, this._routeWebSocketInitScript).catch(() => {
      });
    this._routeWebSocketInitScript = void 0;
    if (this._clockPaused)
      this._context.clock.resumeNoReply();
    this._clockPaused = false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserContextDispatcher
});
