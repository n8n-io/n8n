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
var frame_exports = {};
__export(frame_exports, {
  Frame: () => Frame,
  verifyLoadState: () => verifyLoadState
});
module.exports = __toCommonJS(frame_exports);
var import_eventEmitter = require("./eventEmitter");
var import_channelOwner = require("./channelOwner");
var import_clientHelper = require("./clientHelper");
var import_elementHandle = require("./elementHandle");
var import_events = require("./events");
var import_jsHandle = require("./jsHandle");
var import_locator = require("./locator");
var network = __toESM(require("./network"));
var import_types = require("./types");
var import_waiter = require("./waiter");
var import_assert = require("../utils/isomorphic/assert");
var import_locatorUtils = require("../utils/isomorphic/locatorUtils");
var import_urlMatch = require("../utils/isomorphic/urlMatch");
var import_timeoutSettings = require("./timeoutSettings");
class Frame extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._parentFrame = null;
    this._url = "";
    this._name = "";
    this._detached = false;
    this._childFrames = /* @__PURE__ */ new Set();
    this._eventEmitter = new import_eventEmitter.EventEmitter(parent._platform);
    this._eventEmitter.setMaxListeners(0);
    this._parentFrame = Frame.fromNullable(initializer.parentFrame);
    if (this._parentFrame)
      this._parentFrame._childFrames.add(this);
    this._name = initializer.name;
    this._url = initializer.url;
    this._loadStates = new Set(initializer.loadStates);
    this._channel.on("loadstate", (event) => {
      if (event.add) {
        this._loadStates.add(event.add);
        this._eventEmitter.emit("loadstate", event.add);
      }
      if (event.remove)
        this._loadStates.delete(event.remove);
      if (!this._parentFrame && event.add === "load" && this._page)
        this._page.emit(import_events.Events.Page.Load, this._page);
      if (!this._parentFrame && event.add === "domcontentloaded" && this._page)
        this._page.emit(import_events.Events.Page.DOMContentLoaded, this._page);
    });
    this._channel.on("navigated", (event) => {
      this._url = event.url;
      this._name = event.name;
      this._eventEmitter.emit("navigated", event);
      if (!event.error && this._page)
        this._page.emit(import_events.Events.Page.FrameNavigated, this);
    });
  }
  static from(frame) {
    return frame._object;
  }
  static fromNullable(frame) {
    return frame ? Frame.from(frame) : null;
  }
  page() {
    return this._page;
  }
  _timeout(options) {
    const timeoutSettings = this._page?._timeoutSettings || new import_timeoutSettings.TimeoutSettings(this._platform);
    return timeoutSettings.timeout(options || {});
  }
  _navigationTimeout(options) {
    const timeoutSettings = this._page?._timeoutSettings || new import_timeoutSettings.TimeoutSettings(this._platform);
    return timeoutSettings.navigationTimeout(options || {});
  }
  async goto(url, options = {}) {
    const waitUntil = verifyLoadState("waitUntil", options.waitUntil === void 0 ? "load" : options.waitUntil);
    this.page().context()._checkUrlAllowed(url);
    return network.Response.fromNullable((await this._channel.goto({ url, ...options, waitUntil, timeout: this._navigationTimeout(options) })).response);
  }
  _setupNavigationWaiter(options) {
    const waiter = new import_waiter.Waiter(this._page, "");
    if (this._page.isClosed())
      waiter.rejectImmediately(this._page._closeErrorWithReason());
    waiter.rejectOnEvent(this._page, import_events.Events.Page.Close, () => this._page._closeErrorWithReason());
    waiter.rejectOnEvent(this._page, import_events.Events.Page.Crash, new Error("Navigation failed because page crashed!"));
    waiter.rejectOnEvent(this._page, import_events.Events.Page.FrameDetached, new Error("Navigating frame was detached!"), (frame) => frame === this);
    const timeout = this._page._timeoutSettings.navigationTimeout(options);
    waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded.`);
    return waiter;
  }
  async waitForNavigation(options = {}) {
    return await this._page._wrapApiCall(async () => {
      const waitUntil = verifyLoadState("waitUntil", options.waitUntil === void 0 ? "load" : options.waitUntil);
      const waiter = this._setupNavigationWaiter(options);
      const toUrl = typeof options.url === "string" ? ` to "${options.url}"` : "";
      waiter.log(`waiting for navigation${toUrl} until "${waitUntil}"`);
      const navigatedEvent = await waiter.waitForEvent(this._eventEmitter, "navigated", (event) => {
        if (event.error)
          return true;
        waiter.log(`  navigated to "${event.url}"`);
        return (0, import_urlMatch.urlMatches)(this._page?.context()._options.baseURL, event.url, options.url);
      });
      if (navigatedEvent.error) {
        const e = new Error(navigatedEvent.error);
        e.stack = "";
        await waiter.waitForPromise(Promise.reject(e));
      }
      if (!this._loadStates.has(waitUntil)) {
        await waiter.waitForEvent(this._eventEmitter, "loadstate", (s) => {
          waiter.log(`  "${s}" event fired`);
          return s === waitUntil;
        });
      }
      const request = navigatedEvent.newDocument ? network.Request.fromNullable(navigatedEvent.newDocument.request) : null;
      const response = request ? await waiter.waitForPromise(request._finalRequest()._internalResponse()) : null;
      waiter.dispose();
      return response;
    }, { title: "Wait for navigation" });
  }
  async waitForLoadState(state = "load", options = {}) {
    state = verifyLoadState("state", state);
    return await this._page._wrapApiCall(async () => {
      const waiter = this._setupNavigationWaiter(options);
      if (this._loadStates.has(state)) {
        waiter.log(`  not waiting, "${state}" event already fired`);
      } else {
        await waiter.waitForEvent(this._eventEmitter, "loadstate", (s) => {
          waiter.log(`  "${s}" event fired`);
          return s === state;
        });
      }
      waiter.dispose();
    }, { title: `Wait for load state "${state}"` });
  }
  async waitForURL(url, options = {}) {
    if ((0, import_urlMatch.urlMatches)(this._page?.context()._options.baseURL, this.url(), url))
      return await this.waitForLoadState(options.waitUntil, options);
    await this.waitForNavigation({ url, ...options });
  }
  async frameElement() {
    return import_elementHandle.ElementHandle.from((await this._channel.frameElement()).element);
  }
  async evaluateHandle(pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 2);
    const result = await this._channel.evaluateExpressionHandle({ expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: (0, import_jsHandle.serializeArgument)(arg) });
    return import_jsHandle.JSHandle.from(result.handle);
  }
  async evaluate(pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 2);
    const result = await this._channel.evaluateExpression({ expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: (0, import_jsHandle.serializeArgument)(arg) });
    return (0, import_jsHandle.parseResult)(result.value);
  }
  async _evaluateFunction(functionDeclaration) {
    const result = await this._channel.evaluateExpression({ expression: functionDeclaration, isFunction: true, arg: (0, import_jsHandle.serializeArgument)(void 0) });
    return (0, import_jsHandle.parseResult)(result.value);
  }
  async _evaluateExposeUtilityScript(pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 2);
    const result = await this._channel.evaluateExpression({ expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: (0, import_jsHandle.serializeArgument)(arg) });
    return (0, import_jsHandle.parseResult)(result.value);
  }
  async $(selector, options) {
    const result = await this._channel.querySelector({ selector, ...options });
    return import_elementHandle.ElementHandle.fromNullable(result.element);
  }
  async waitForSelector(selector, options = {}) {
    if (options.visibility)
      throw new Error("options.visibility is not supported, did you mean options.state?");
    if (options.waitFor && options.waitFor !== "visible")
      throw new Error("options.waitFor is not supported, did you mean options.state?");
    const result = await this._channel.waitForSelector({ selector, ...options, timeout: this._timeout(options) });
    return import_elementHandle.ElementHandle.fromNullable(result.element);
  }
  async dispatchEvent(selector, type, eventInit, options = {}) {
    await this._channel.dispatchEvent({ selector, type, eventInit: (0, import_jsHandle.serializeArgument)(eventInit), ...options, timeout: this._timeout(options) });
  }
  async $eval(selector, pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 3);
    const result = await this._channel.evalOnSelector({ selector, expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: (0, import_jsHandle.serializeArgument)(arg) });
    return (0, import_jsHandle.parseResult)(result.value);
  }
  async $$eval(selector, pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 3);
    const result = await this._channel.evalOnSelectorAll({ selector, expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: (0, import_jsHandle.serializeArgument)(arg) });
    return (0, import_jsHandle.parseResult)(result.value);
  }
  async $$(selector) {
    const result = await this._channel.querySelectorAll({ selector });
    return result.elements.map((e) => import_elementHandle.ElementHandle.from(e));
  }
  async _queryCount(selector, options) {
    return (await this._channel.queryCount({ selector, ...options })).value;
  }
  async content() {
    return (await this._channel.content()).value;
  }
  async setContent(html, options = {}) {
    const waitUntil = verifyLoadState("waitUntil", options.waitUntil === void 0 ? "load" : options.waitUntil);
    await this._channel.setContent({ html, ...options, waitUntil, timeout: this._navigationTimeout(options) });
  }
  name() {
    return this._name || "";
  }
  url() {
    return this._url;
  }
  parentFrame() {
    return this._parentFrame;
  }
  childFrames() {
    return Array.from(this._childFrames);
  }
  isDetached() {
    return this._detached;
  }
  async addScriptTag(options = {}) {
    const copy = { ...options };
    if (copy.path) {
      copy.content = (await this._platform.fs().promises.readFile(copy.path)).toString();
      copy.content = (0, import_clientHelper.addSourceUrlToScript)(copy.content, copy.path);
    }
    return import_elementHandle.ElementHandle.from((await this._channel.addScriptTag({ ...copy })).element);
  }
  async addStyleTag(options = {}) {
    const copy = { ...options };
    if (copy.path) {
      copy.content = (await this._platform.fs().promises.readFile(copy.path)).toString();
      copy.content += "/*# sourceURL=" + copy.path.replace(/\n/g, "") + "*/";
    }
    return import_elementHandle.ElementHandle.from((await this._channel.addStyleTag({ ...copy })).element);
  }
  async click(selector, options = {}) {
    return await this._channel.click({ selector, ...options, timeout: this._timeout(options) });
  }
  async dblclick(selector, options = {}) {
    return await this._channel.dblclick({ selector, ...options, timeout: this._timeout(options) });
  }
  async dragAndDrop(source, target, options = {}) {
    return await this._channel.dragAndDrop({ source, target, ...options, timeout: this._timeout(options) });
  }
  async tap(selector, options = {}) {
    return await this._channel.tap({ selector, ...options, timeout: this._timeout(options) });
  }
  async fill(selector, value, options = {}) {
    return await this._channel.fill({ selector, value, ...options, timeout: this._timeout(options) });
  }
  async _highlight(selector) {
    return await this._channel.highlight({ selector });
  }
  locator(selector, options) {
    return new import_locator.Locator(this, selector, options);
  }
  getByTestId(testId) {
    return this.locator((0, import_locatorUtils.getByTestIdSelector)((0, import_locator.testIdAttributeName)(), testId));
  }
  getByAltText(text, options) {
    return this.locator((0, import_locatorUtils.getByAltTextSelector)(text, options));
  }
  getByLabel(text, options) {
    return this.locator((0, import_locatorUtils.getByLabelSelector)(text, options));
  }
  getByPlaceholder(text, options) {
    return this.locator((0, import_locatorUtils.getByPlaceholderSelector)(text, options));
  }
  getByText(text, options) {
    return this.locator((0, import_locatorUtils.getByTextSelector)(text, options));
  }
  getByTitle(text, options) {
    return this.locator((0, import_locatorUtils.getByTitleSelector)(text, options));
  }
  getByRole(role, options = {}) {
    return this.locator((0, import_locatorUtils.getByRoleSelector)(role, options));
  }
  frameLocator(selector) {
    return new import_locator.FrameLocator(this, selector);
  }
  async focus(selector, options = {}) {
    await this._channel.focus({ selector, ...options, timeout: this._timeout(options) });
  }
  async textContent(selector, options = {}) {
    const value = (await this._channel.textContent({ selector, ...options, timeout: this._timeout(options) })).value;
    return value === void 0 ? null : value;
  }
  async innerText(selector, options = {}) {
    return (await this._channel.innerText({ selector, ...options, timeout: this._timeout(options) })).value;
  }
  async innerHTML(selector, options = {}) {
    return (await this._channel.innerHTML({ selector, ...options, timeout: this._timeout(options) })).value;
  }
  async getAttribute(selector, name, options = {}) {
    const value = (await this._channel.getAttribute({ selector, name, ...options, timeout: this._timeout(options) })).value;
    return value === void 0 ? null : value;
  }
  async inputValue(selector, options = {}) {
    return (await this._channel.inputValue({ selector, ...options, timeout: this._timeout(options) })).value;
  }
  async isChecked(selector, options = {}) {
    return (await this._channel.isChecked({ selector, ...options, timeout: this._timeout(options) })).value;
  }
  async isDisabled(selector, options = {}) {
    return (await this._channel.isDisabled({ selector, ...options, timeout: this._timeout(options) })).value;
  }
  async isEditable(selector, options = {}) {
    return (await this._channel.isEditable({ selector, ...options, timeout: this._timeout(options) })).value;
  }
  async isEnabled(selector, options = {}) {
    return (await this._channel.isEnabled({ selector, ...options, timeout: this._timeout(options) })).value;
  }
  async isHidden(selector, options = {}) {
    return (await this._channel.isHidden({ selector, ...options })).value;
  }
  async isVisible(selector, options = {}) {
    return (await this._channel.isVisible({ selector, ...options })).value;
  }
  async hover(selector, options = {}) {
    await this._channel.hover({ selector, ...options, timeout: this._timeout(options) });
  }
  async selectOption(selector, values, options = {}) {
    return (await this._channel.selectOption({ selector, ...(0, import_elementHandle.convertSelectOptionValues)(values), ...options, timeout: this._timeout(options) })).values;
  }
  async setInputFiles(selector, files, options = {}) {
    const converted = await (0, import_elementHandle.convertInputFiles)(this._platform, files, this.page().context());
    await this._channel.setInputFiles({ selector, ...converted, ...options, timeout: this._timeout(options) });
  }
  async type(selector, text, options = {}) {
    await this._channel.type({ selector, text, ...options, timeout: this._timeout(options) });
  }
  async press(selector, key, options = {}) {
    await this._channel.press({ selector, key, ...options, timeout: this._timeout(options) });
  }
  async check(selector, options = {}) {
    await this._channel.check({ selector, ...options, timeout: this._timeout(options) });
  }
  async uncheck(selector, options = {}) {
    await this._channel.uncheck({ selector, ...options, timeout: this._timeout(options) });
  }
  async setChecked(selector, checked, options) {
    if (checked)
      await this.check(selector, options);
    else
      await this.uncheck(selector, options);
  }
  async waitForTimeout(timeout) {
    await this._channel.waitForTimeout({ waitTimeout: timeout });
  }
  async waitForFunction(pageFunction, arg, options = {}) {
    if (typeof options.polling === "string")
      (0, import_assert.assert)(options.polling === "raf", "Unknown polling option: " + options.polling);
    const result = await this._channel.waitForFunction({
      ...options,
      pollingInterval: options.polling === "raf" ? void 0 : options.polling,
      expression: String(pageFunction),
      isFunction: typeof pageFunction === "function",
      arg: (0, import_jsHandle.serializeArgument)(arg),
      timeout: this._timeout(options)
    });
    return import_jsHandle.JSHandle.from(result.handle);
  }
  async title() {
    return (await this._channel.title()).value;
  }
  async _expect(expression, options) {
    const params = { expression, ...options, isNot: !!options.isNot };
    params.expectedValue = (0, import_jsHandle.serializeArgument)(options.expectedValue);
    const result = await this._channel.expect(params);
    if (result.received !== void 0)
      result.received = (0, import_jsHandle.parseResult)(result.received);
    return result;
  }
}
function verifyLoadState(name, waitUntil) {
  if (waitUntil === "networkidle0")
    waitUntil = "networkidle";
  if (!import_types.kLifecycleEvents.has(waitUntil))
    throw new Error(`${name}: expected one of (load|domcontentloaded|networkidle|commit)`);
  return waitUntil;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Frame,
  verifyLoadState
});
