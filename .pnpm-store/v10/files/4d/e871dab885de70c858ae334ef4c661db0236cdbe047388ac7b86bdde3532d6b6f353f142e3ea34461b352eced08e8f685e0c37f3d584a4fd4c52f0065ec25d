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
var elementHandlerDispatcher_exports = {};
__export(elementHandlerDispatcher_exports, {
  ElementHandleDispatcher: () => ElementHandleDispatcher
});
module.exports = __toCommonJS(elementHandlerDispatcher_exports);
var import_browserContextDispatcher = require("./browserContextDispatcher");
var import_frameDispatcher = require("./frameDispatcher");
var import_jsHandleDispatcher = require("./jsHandleDispatcher");
class ElementHandleDispatcher extends import_jsHandleDispatcher.JSHandleDispatcher {
  constructor(scope, elementHandle) {
    super(scope, elementHandle);
    this._type_ElementHandle = true;
    this._elementHandle = elementHandle;
  }
  static from(scope, handle) {
    return scope.connection.existingDispatcher(handle) || new ElementHandleDispatcher(scope, handle);
  }
  static fromNullable(scope, handle) {
    if (!handle)
      return void 0;
    return scope.connection.existingDispatcher(handle) || new ElementHandleDispatcher(scope, handle);
  }
  static fromJSOrElementHandle(scope, handle) {
    const result = scope.connection.existingDispatcher(handle);
    if (result)
      return result;
    const elementHandle = handle.asElement();
    if (!elementHandle)
      return new import_jsHandleDispatcher.JSHandleDispatcher(scope, handle);
    return new ElementHandleDispatcher(scope, elementHandle);
  }
  async ownerFrame(params, progress) {
    const frame = await this._elementHandle.ownerFrame();
    return { frame: frame ? import_frameDispatcher.FrameDispatcher.from(this._browserContextDispatcher(), frame) : void 0 };
  }
  async contentFrame(params, progress) {
    const frame = await progress.race(this._elementHandle.contentFrame());
    return { frame: frame ? import_frameDispatcher.FrameDispatcher.from(this._browserContextDispatcher(), frame) : void 0 };
  }
  async getAttribute(params, progress) {
    const value = await this._elementHandle.getAttribute(progress, params.name);
    return { value: value === null ? void 0 : value };
  }
  async inputValue(params, progress) {
    const value = await this._elementHandle.inputValue(progress);
    return { value };
  }
  async textContent(params, progress) {
    const value = await this._elementHandle.textContent(progress);
    return { value: value === null ? void 0 : value };
  }
  async innerText(params, progress) {
    return { value: await this._elementHandle.innerText(progress) };
  }
  async innerHTML(params, progress) {
    return { value: await this._elementHandle.innerHTML(progress) };
  }
  async isChecked(params, progress) {
    return { value: await this._elementHandle.isChecked(progress) };
  }
  async isDisabled(params, progress) {
    return { value: await this._elementHandle.isDisabled(progress) };
  }
  async isEditable(params, progress) {
    return { value: await this._elementHandle.isEditable(progress) };
  }
  async isEnabled(params, progress) {
    return { value: await this._elementHandle.isEnabled(progress) };
  }
  async isHidden(params, progress) {
    return { value: await this._elementHandle.isHidden(progress) };
  }
  async isVisible(params, progress) {
    return { value: await this._elementHandle.isVisible(progress) };
  }
  async dispatchEvent(params, progress) {
    await this._elementHandle.dispatchEvent(progress, params.type, (0, import_jsHandleDispatcher.parseArgument)(params.eventInit));
  }
  async scrollIntoViewIfNeeded(params, progress) {
    await this._elementHandle.scrollIntoViewIfNeeded(progress);
  }
  async hover(params, progress) {
    return await this._elementHandle.hover(progress, params);
  }
  async click(params, progress) {
    return await this._elementHandle.click(progress, params);
  }
  async dblclick(params, progress) {
    return await this._elementHandle.dblclick(progress, params);
  }
  async tap(params, progress) {
    return await this._elementHandle.tap(progress, params);
  }
  async selectOption(params, progress) {
    const elements = (params.elements || []).map((e) => e._elementHandle);
    return { values: await this._elementHandle.selectOption(progress, elements, params.options || [], params) };
  }
  async fill(params, progress) {
    return await this._elementHandle.fill(progress, params.value, params);
  }
  async selectText(params, progress) {
    await this._elementHandle.selectText(progress, params);
  }
  async setInputFiles(params, progress) {
    return await this._elementHandle.setInputFiles(progress, params);
  }
  async focus(params, progress) {
    await this._elementHandle.focus(progress);
  }
  async type(params, progress) {
    return await this._elementHandle.type(progress, params.text, params);
  }
  async press(params, progress) {
    return await this._elementHandle.press(progress, params.key, params);
  }
  async check(params, progress) {
    return await this._elementHandle.check(progress, params);
  }
  async uncheck(params, progress) {
    return await this._elementHandle.uncheck(progress, params);
  }
  async boundingBox(params, progress) {
    const value = await progress.race(this._elementHandle.boundingBox());
    return { value: value || void 0 };
  }
  async screenshot(params, progress) {
    const mask = (params.mask || []).map(({ frame, selector }) => ({
      frame: frame._object,
      selector
    }));
    return { binary: await this._elementHandle.screenshot(progress, { ...params, mask }) };
  }
  async querySelector(params, progress) {
    const handle = await progress.race(this._elementHandle.querySelector(params.selector, params));
    return { element: ElementHandleDispatcher.fromNullable(this.parentScope(), handle) };
  }
  async querySelectorAll(params, progress) {
    const elements = await progress.race(this._elementHandle.querySelectorAll(params.selector));
    return { elements: elements.map((e) => ElementHandleDispatcher.from(this.parentScope(), e)) };
  }
  async evalOnSelector(params, progress) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await progress.race(this._elementHandle.evalOnSelector(params.selector, !!params.strict, params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg)))) };
  }
  async evalOnSelectorAll(params, progress) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await progress.race(this._elementHandle.evalOnSelectorAll(params.selector, params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg)))) };
  }
  async waitForElementState(params, progress) {
    await this._elementHandle.waitForElementState(progress, params.state);
  }
  async waitForSelector(params, progress) {
    return { element: ElementHandleDispatcher.fromNullable(this.parentScope(), await this._elementHandle.waitForSelector(progress, params.selector, params)) };
  }
  _browserContextDispatcher() {
    const parentScope = this.parentScope().parentScope();
    if (parentScope instanceof import_browserContextDispatcher.BrowserContextDispatcher)
      return parentScope;
    return parentScope.parentScope();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ElementHandleDispatcher
});
