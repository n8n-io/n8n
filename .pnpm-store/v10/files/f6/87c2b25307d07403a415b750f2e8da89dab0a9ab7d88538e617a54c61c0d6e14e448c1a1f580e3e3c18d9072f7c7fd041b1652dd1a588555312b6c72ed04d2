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
var recorderApp_exports = {};
__export(recorderApp_exports, {
  ProgrammaticRecorderApp: () => ProgrammaticRecorderApp,
  RecorderApp: () => RecorderApp
});
module.exports = __toCommonJS(recorderApp_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_debug = require("../utils/debug");
var import_utilsBundle = require("../../utilsBundle");
var import_launchApp = require("../launchApp");
var import_launchApp2 = require("../launchApp");
var import_progress = require("../progress");
var import_throttledFile = require("./throttledFile");
var import_languages = require("../codegen/languages");
var import_recorderUtils = require("./recorderUtils");
var import_language = require("../codegen/language");
var import_recorder = require("../recorder");
var import_browserContext = require("../browserContext");
class RecorderApp {
  constructor(recorder, params, page, wsEndpointForTest) {
    this._throttledOutputFile = null;
    this._actions = [];
    this._userSources = [];
    this._recorderSources = [];
    this._page = page;
    this._recorder = recorder;
    this._frontend = createRecorderFrontend(page);
    this.wsEndpointForTest = wsEndpointForTest;
    this._languageGeneratorOptions = {
      browserName: params.browserName,
      launchOptions: { headless: false, ...params.launchOptions, tracesDir: void 0 },
      contextOptions: { ...params.contextOptions },
      deviceName: params.device,
      saveStorage: params.saveStorage
    };
    this._throttledOutputFile = params.outputFile ? new import_throttledFile.ThrottledFile(params.outputFile) : null;
    this._primaryGeneratorId = process.env.TEST_INSPECTOR_LANGUAGE || params.language || determinePrimaryGeneratorId(params.sdkLanguage);
    this._selectedGeneratorId = this._primaryGeneratorId;
    for (const languageGenerator of (0, import_languages.languageSet)()) {
      if (languageGenerator.id === this._primaryGeneratorId)
        this._recorder.setLanguage(languageGenerator.highlighter);
    }
  }
  async _init(inspectedContext) {
    await (0, import_launchApp.syncLocalStorageWithSettings)(this._page, "recorder");
    const controller = new import_progress.ProgressController();
    await controller.run(async (progress) => {
      await this._page.addRequestInterceptor(progress, (route) => {
        if (!route.request().url().startsWith("https://playwright/")) {
          route.continue({ isFallback: true }).catch(() => {
          });
          return;
        }
        const uri = route.request().url().substring("https://playwright/".length);
        const file = require.resolve("../../vite/recorder/" + uri);
        import_fs.default.promises.readFile(file).then((buffer) => {
          route.fulfill({
            status: 200,
            headers: [
              { name: "Content-Type", value: import_utilsBundle.mime.getType(import_path.default.extname(file)) || "application/octet-stream" }
            ],
            body: buffer.toString("base64"),
            isBase64: true
          }).catch(() => {
          });
        });
      });
      await this._createDispatcher(progress);
      this._page.once("close", () => {
        this._recorder.close();
        this._page.browserContext.close({ reason: "Recorder window closed" }).catch(() => {
        });
        delete inspectedContext[recorderAppSymbol];
      });
      await this._page.mainFrame().goto(progress, "https://playwright/index.html");
    });
    const url = this._recorder.url();
    if (url)
      this._frontend.pageNavigated({ url });
    this._frontend.modeChanged({ mode: this._recorder.mode() });
    this._frontend.pauseStateChanged({ paused: this._recorder.paused() });
    this._updateActions("reveal");
    this._onUserSourcesChanged(this._recorder.userSources(), this._recorder.pausedSourceId());
    this._frontend.callLogsUpdated({ callLogs: this._recorder.callLog() });
    this._wireListeners(this._recorder);
  }
  async _createDispatcher(progress) {
    const dispatcher = {
      clear: async () => {
        this._actions = [];
        this._updateActions("reveal");
        this._recorder.clear();
      },
      fileChanged: async (params) => {
        const source = [...this._recorderSources, ...this._userSources].find((s) => s.id === params.fileId);
        if (source) {
          if (source.isRecorded)
            this._selectedGeneratorId = source.id;
          this._recorder.setLanguage(source.language);
        }
      },
      setAutoExpect: async (params) => {
        this._languageGeneratorOptions.generateAutoExpect = params.autoExpect;
        this._updateActions();
      },
      setMode: async (params) => {
        this._recorder.setMode(params.mode);
      },
      resume: async () => {
        this._recorder.resume();
      },
      pause: async () => {
        this._recorder.pause();
      },
      step: async () => {
        this._recorder.step();
      },
      highlightRequested: async (params) => {
        if (params.selector)
          this._recorder.setHighlightedSelector(params.selector);
        if (params.ariaTemplate)
          this._recorder.setHighlightedAriaTemplate(params.ariaTemplate);
      }
    };
    await this._page.exposeBinding(progress, "sendCommand", false, async (_, data) => {
      const { method, params } = data;
      return await dispatcher[method].call(dispatcher, params);
    });
  }
  static async show(context, params) {
    if (process.env.PW_CODEGEN_NO_INSPECTOR)
      return;
    const recorder = await import_recorder.Recorder.forContext(context, params);
    if (params.recorderMode === "api") {
      const browserName = context._browser.options.name;
      await ProgrammaticRecorderApp.run(context, recorder, browserName, params);
      return;
    }
    await RecorderApp._show(recorder, context, params);
  }
  async close() {
    await this._page.close();
  }
  static showInspectorNoReply(context) {
    if (process.env.PW_CODEGEN_NO_INSPECTOR)
      return;
    void import_recorder.Recorder.forContext(context, {}).then((recorder) => RecorderApp._show(recorder, context, {})).catch(() => {
    });
  }
  static async _show(recorder, inspectedContext, params) {
    if (inspectedContext[recorderAppSymbol])
      return;
    inspectedContext[recorderAppSymbol] = true;
    const sdkLanguage = inspectedContext._browser.sdkLanguage();
    const headed = !!inspectedContext._browser.options.headful;
    const recorderPlaywright = require("../playwright").createPlaywright({ sdkLanguage: "javascript", isInternalPlaywright: true });
    const { context: appContext, page } = await (0, import_launchApp2.launchApp)(recorderPlaywright.chromium, {
      sdkLanguage,
      windowSize: { width: 600, height: 600 },
      windowPosition: { x: 1020, y: 10 },
      persistentContextOptions: {
        noDefaultViewport: true,
        headless: !!process.env.PWTEST_CLI_HEADLESS || (0, import_debug.isUnderTest)() && !headed,
        cdpPort: (0, import_debug.isUnderTest)() ? 0 : void 0,
        handleSIGINT: params.handleSIGINT,
        executablePath: inspectedContext._browser.options.isChromium ? inspectedContext._browser.options.customExecutablePath : void 0,
        // Use the same channel as the inspected context to guarantee that the browser is installed.
        channel: inspectedContext._browser.options.isChromium ? inspectedContext._browser.options.channel : void 0
      }
    });
    const controller = new import_progress.ProgressController();
    await controller.run(async (progress) => {
      await appContext._browser._defaultContext._loadDefaultContextAsIs(progress);
    });
    const appParams = {
      browserName: inspectedContext._browser.options.name,
      sdkLanguage: inspectedContext._browser.sdkLanguage(),
      wsEndpointForTest: inspectedContext._browser.options.wsEndpoint,
      headed: !!inspectedContext._browser.options.headful,
      executablePath: inspectedContext._browser.options.isChromium ? inspectedContext._browser.options.customExecutablePath : void 0,
      channel: inspectedContext._browser.options.isChromium ? inspectedContext._browser.options.channel : void 0,
      ...params
    };
    const recorderApp = new RecorderApp(recorder, appParams, page, appContext._browser.options.wsEndpoint);
    await recorderApp._init(inspectedContext);
    inspectedContext.recorderAppForTest = recorderApp;
  }
  _wireListeners(recorder) {
    recorder.on(import_recorder.RecorderEvent.ActionAdded, (action) => {
      this._onActionAdded(action);
    });
    recorder.on(import_recorder.RecorderEvent.SignalAdded, (signal) => {
      this._onSignalAdded(signal);
    });
    recorder.on(import_recorder.RecorderEvent.PageNavigated, (url) => {
      this._frontend.pageNavigated({ url });
    });
    recorder.on(import_recorder.RecorderEvent.ContextClosed, () => {
      this._throttledOutputFile?.flush();
      this._page.browserContext.close({ reason: "Recorder window closed" }).catch(() => {
      });
    });
    recorder.on(import_recorder.RecorderEvent.ModeChanged, (mode) => {
      this._frontend.modeChanged({ mode });
    });
    recorder.on(import_recorder.RecorderEvent.PausedStateChanged, (paused) => {
      this._frontend.pauseStateChanged({ paused });
    });
    recorder.on(import_recorder.RecorderEvent.UserSourcesChanged, (sources, pausedSourceId) => {
      this._onUserSourcesChanged(sources, pausedSourceId);
    });
    recorder.on(import_recorder.RecorderEvent.ElementPicked, (elementInfo, userGesture) => {
      if (userGesture)
        this._page.bringToFront();
      this._frontend.elementPicked({ elementInfo, userGesture });
    });
    recorder.on(import_recorder.RecorderEvent.CallLogsUpdated, (callLogs) => {
      this._frontend.callLogsUpdated({ callLogs });
    });
  }
  _onActionAdded(action) {
    this._actions.push(action);
    this._updateActions("reveal");
  }
  _onSignalAdded(signal) {
    const lastAction = this._actions.findLast((a) => a.frame.pageGuid === signal.frame.pageGuid);
    if (lastAction)
      lastAction.action.signals.push(signal.signal);
    this._updateActions();
  }
  _onUserSourcesChanged(sources, pausedSourceId) {
    if (!sources.length && !this._userSources.length)
      return;
    this._userSources = sources;
    this._pushAllSources();
    this._revealSource(pausedSourceId);
  }
  _pushAllSources() {
    const sources = [...this._userSources, ...this._recorderSources];
    this._frontend.sourcesUpdated({ sources });
  }
  _revealSource(sourceId) {
    if (!sourceId)
      return;
    this._frontend.sourceRevealRequested({ sourceId });
  }
  _updateActions(reveal) {
    const recorderSources = [];
    const actions = (0, import_recorderUtils.collapseActions)(this._actions);
    let revealSourceId;
    for (const languageGenerator of (0, import_languages.languageSet)()) {
      const { header, footer, actionTexts, text } = (0, import_language.generateCode)(actions, languageGenerator, this._languageGeneratorOptions);
      const source = {
        isRecorded: true,
        label: languageGenerator.name,
        group: languageGenerator.groupName,
        id: languageGenerator.id,
        text,
        header,
        footer,
        actions: actionTexts,
        language: languageGenerator.highlighter,
        highlight: []
      };
      source.revealLine = text.split("\n").length - 1;
      recorderSources.push(source);
      if (languageGenerator.id === this._primaryGeneratorId)
        this._throttledOutputFile?.setContent(source.text);
      if (reveal === "reveal" && source.id === this._selectedGeneratorId)
        revealSourceId = source.id;
    }
    this._recorderSources = recorderSources;
    this._pushAllSources();
    this._revealSource(revealSourceId);
  }
}
function determinePrimaryGeneratorId(sdkLanguage) {
  for (const language of (0, import_languages.languageSet)()) {
    if (language.highlighter === sdkLanguage)
      return language.id;
  }
  return sdkLanguage;
}
class ProgrammaticRecorderApp {
  static async run(inspectedContext, recorder, browserName, params) {
    let lastAction = null;
    const languages = [...(0, import_languages.languageSet)()];
    const languageGeneratorOptions = {
      browserName,
      launchOptions: { headless: false, ...params.launchOptions, tracesDir: void 0 },
      contextOptions: { ...params.contextOptions },
      deviceName: params.device,
      saveStorage: params.saveStorage
    };
    const languageGenerator = languages.find((l) => l.id === params.language) ?? languages.find((l) => l.id === "playwright-test");
    recorder.on(import_recorder.RecorderEvent.ActionAdded, (action) => {
      const page = findPageByGuid(inspectedContext, action.frame.pageGuid);
      if (!page)
        return;
      const { actionTexts } = (0, import_language.generateCode)([action], languageGenerator, languageGeneratorOptions);
      if (!lastAction || !(0, import_recorderUtils.shouldMergeAction)(action, lastAction))
        inspectedContext.emit(import_browserContext.BrowserContext.Events.RecorderEvent, { event: "actionAdded", data: action, page, code: actionTexts.join("\n") });
      else
        inspectedContext.emit(import_browserContext.BrowserContext.Events.RecorderEvent, { event: "actionUpdated", data: action, page, code: actionTexts.join("\n") });
      lastAction = action;
    });
    recorder.on(import_recorder.RecorderEvent.SignalAdded, (signal) => {
      const page = findPageByGuid(inspectedContext, signal.frame.pageGuid);
      if (!page)
        return;
      inspectedContext.emit(import_browserContext.BrowserContext.Events.RecorderEvent, { event: "signalAdded", data: signal, page, code: "" });
    });
  }
}
function findPageByGuid(context, guid) {
  return context.pages().find((p) => p.guid === guid);
}
function createRecorderFrontend(page) {
  return new Proxy({}, {
    get: (_target, prop) => {
      if (typeof prop !== "string")
        return void 0;
      return (params) => {
        page.mainFrame().evaluateExpression(((event) => {
          window.dispatch(event);
        }).toString(), { isFunction: true }, { method: prop, params }).catch(() => {
        });
      };
    }
  });
}
const recorderAppSymbol = Symbol("recorderApp");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ProgrammaticRecorderApp,
  RecorderApp
});
