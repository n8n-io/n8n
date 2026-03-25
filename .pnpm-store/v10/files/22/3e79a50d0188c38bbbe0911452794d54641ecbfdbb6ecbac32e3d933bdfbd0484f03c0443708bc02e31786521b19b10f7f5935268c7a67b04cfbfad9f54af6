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
var context_exports = {};
__export(context_exports, {
  Context: () => Context
});
module.exports = __toCommonJS(context_exports);
var import_browserContext = require("../browserContext");
var import_actionRunner = require("./actionRunner");
var import_codegen = require("./codegen");
var import_stringUtils = require("../../utils/isomorphic/stringUtils");
class Context {
  constructor(page, agentParams, events) {
    this._actions = [];
    this._history = [];
    this.page = page;
    this.agentParams = agentParams;
    this.sdkLanguage = page.browserContext._browser.sdkLanguage();
    this.events = events;
    this._budget = { tokens: agentParams.maxTokens };
  }
  async runActionAndWait(progress, action) {
    return await this.runActionsAndWait(progress, [action]);
  }
  async runActionsAndWait(progress, action, options) {
    const error = await this.waitForCompletion(progress, async () => {
      for (const a of action) {
        await (0, import_actionRunner.runAction)(progress, "generate", this.page, a, this.agentParams?.secrets ?? []);
        const code = await (0, import_codegen.generateCode)(this.sdkLanguage, a);
        this._actions.push({ ...a, code });
      }
      return void 0;
    }, options).catch((error2) => error2);
    return await this.snapshotResult(progress, error);
  }
  async runActionNoWait(progress, action) {
    return await this.runActionsAndWait(progress, [action], { noWait: true });
  }
  actions() {
    return this._actions.slice();
  }
  history() {
    return this._history;
  }
  pushHistory(item) {
    this._history.push(item);
    this._actions = [];
  }
  consumeTokens(tokens) {
    if (this._budget.tokens === void 0)
      return;
    this._budget.tokens = Math.max(0, this._budget.tokens - tokens);
  }
  maxTokensRemaining() {
    return this._budget.tokens;
  }
  async waitForCompletion(progress, callback, options) {
    if (options?.noWait)
      return await callback();
    const requests = [];
    const requestListener = (request) => requests.push(request);
    const disposeListeners = () => {
      this.page.browserContext.off(import_browserContext.BrowserContext.Events.Request, requestListener);
    };
    this.page.browserContext.on(import_browserContext.BrowserContext.Events.Request, requestListener);
    let result;
    try {
      result = await callback();
      await progress.wait(500);
    } finally {
      disposeListeners();
    }
    const requestedNavigation = requests.some((request) => request.isNavigationRequest());
    if (requestedNavigation) {
      await this.page.mainFrame().waitForLoadState(progress, "load");
      return result;
    }
    const promises = [];
    for (const request of requests) {
      if (["document", "stylesheet", "script", "xhr", "fetch"].includes(request.resourceType()))
        promises.push(request.response().then((r) => r?.finished()));
      else
        promises.push(request.response());
    }
    await progress.race([...promises, progress.wait(5e3)]);
    if (!promises.length)
      await progress.wait(500);
    return result;
  }
  async takeSnapshot(progress) {
    const { full } = await this.page.snapshotForAI(progress, { doNotRenderActive: this.agentParams.doNotRenderActive });
    return full;
  }
  async snapshotResult(progress, error) {
    const snapshot = this._redactText(await this.takeSnapshot(progress));
    const text = [];
    if (error)
      text.push(`# Error
${(0, import_stringUtils.stripAnsiEscapes)(error.message)}`);
    else
      text.push(`# Success`);
    text.push(`# Page snapshot
${snapshot}`);
    return {
      isError: !!error,
      content: [{ type: "text", text: text.join("\n\n") }]
    };
  }
  async refSelectors(progress, params) {
    return Promise.all(params.map(async (param) => {
      try {
        const { resolvedSelector } = await this.page.mainFrame().resolveSelector(progress, `aria-ref=${param.ref}`);
        return resolvedSelector;
      } catch (e) {
        throw new Error(`Ref ${param.ref} not found in the current page snapshot. Try capturing new snapshot.`);
      }
    }));
  }
  _redactText(text) {
    const secrets = this.agentParams?.secrets;
    if (!secrets)
      return text;
    const redactText = (text2) => {
      for (const { name, value } of secrets)
        text2 = text2.replaceAll(value, `<secret>${name}</secret>`);
      return text2;
    };
    return redactText(text);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Context
});
