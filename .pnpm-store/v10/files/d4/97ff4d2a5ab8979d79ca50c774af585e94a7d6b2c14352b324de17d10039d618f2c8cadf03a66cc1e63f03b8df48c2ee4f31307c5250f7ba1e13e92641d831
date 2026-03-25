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
var locator_exports = {};
__export(locator_exports, {
  FrameLocator: () => FrameLocator,
  Locator: () => Locator,
  setTestIdAttribute: () => setTestIdAttribute,
  testIdAttributeName: () => testIdAttributeName
});
module.exports = __toCommonJS(locator_exports);
var import_elementHandle = require("./elementHandle");
var import_locatorGenerators = require("../utils/isomorphic/locatorGenerators");
var import_locatorUtils = require("../utils/isomorphic/locatorUtils");
var import_stringUtils = require("../utils/isomorphic/stringUtils");
var import_rtti = require("../utils/isomorphic/rtti");
var import_time = require("../utils/isomorphic/time");
class Locator {
  constructor(frame, selector, options) {
    this._frame = frame;
    this._selector = selector;
    if (options?.hasText)
      this._selector += ` >> internal:has-text=${(0, import_stringUtils.escapeForTextSelector)(options.hasText, false)}`;
    if (options?.hasNotText)
      this._selector += ` >> internal:has-not-text=${(0, import_stringUtils.escapeForTextSelector)(options.hasNotText, false)}`;
    if (options?.has) {
      const locator = options.has;
      if (locator._frame !== frame)
        throw new Error(`Inner "has" locator must belong to the same frame.`);
      this._selector += ` >> internal:has=` + JSON.stringify(locator._selector);
    }
    if (options?.hasNot) {
      const locator = options.hasNot;
      if (locator._frame !== frame)
        throw new Error(`Inner "hasNot" locator must belong to the same frame.`);
      this._selector += ` >> internal:has-not=` + JSON.stringify(locator._selector);
    }
    if (options?.visible !== void 0)
      this._selector += ` >> visible=${options.visible ? "true" : "false"}`;
    if (this._frame._platform.inspectCustom)
      this[this._frame._platform.inspectCustom] = () => this._inspect();
  }
  async _withElement(task, options) {
    const timeout = this._frame._timeout({ timeout: options.timeout });
    const deadline = timeout ? (0, import_time.monotonicTime)() + timeout : 0;
    return await this._frame._wrapApiCall(async () => {
      const result = await this._frame._channel.waitForSelector({ selector: this._selector, strict: true, state: "attached", timeout });
      const handle = import_elementHandle.ElementHandle.fromNullable(result.element);
      if (!handle)
        throw new Error(`Could not resolve ${this._selector} to DOM Element`);
      try {
        return await task(handle, deadline ? deadline - (0, import_time.monotonicTime)() : 0);
      } finally {
        await handle.dispose();
      }
    }, { title: options.title, internal: options.internal });
  }
  _equals(locator) {
    return this._frame === locator._frame && this._selector === locator._selector;
  }
  page() {
    return this._frame.page();
  }
  async boundingBox(options) {
    return await this._withElement((h) => h.boundingBox(), { title: "Bounding box", timeout: options?.timeout });
  }
  async check(options = {}) {
    return await this._frame.check(this._selector, { strict: true, ...options });
  }
  async click(options = {}) {
    return await this._frame.click(this._selector, { strict: true, ...options });
  }
  async dblclick(options = {}) {
    await this._frame.dblclick(this._selector, { strict: true, ...options });
  }
  async dispatchEvent(type, eventInit = {}, options) {
    return await this._frame.dispatchEvent(this._selector, type, eventInit, { strict: true, ...options });
  }
  async dragTo(target, options = {}) {
    return await this._frame.dragAndDrop(this._selector, target._selector, {
      strict: true,
      ...options
    });
  }
  async evaluate(pageFunction, arg, options) {
    return await this._withElement((h) => h.evaluate(pageFunction, arg), { title: "Evaluate", timeout: options?.timeout });
  }
  async _evaluateFunction(functionDeclaration, options) {
    return await this._withElement((h) => h._evaluateFunction(functionDeclaration), { title: "Evaluate", timeout: options?.timeout });
  }
  async evaluateAll(pageFunction, arg) {
    return await this._frame.$$eval(this._selector, pageFunction, arg);
  }
  async evaluateHandle(pageFunction, arg, options) {
    return await this._withElement((h) => h.evaluateHandle(pageFunction, arg), { title: "Evaluate", timeout: options?.timeout });
  }
  async fill(value, options = {}) {
    return await this._frame.fill(this._selector, value, { strict: true, ...options });
  }
  async clear(options = {}) {
    await this._frame._wrapApiCall(() => this.fill("", options), { title: "Clear" });
  }
  async _highlight() {
    return await this._frame._highlight(this._selector);
  }
  async highlight() {
    return await this._frame._highlight(this._selector);
  }
  locator(selectorOrLocator, options) {
    if ((0, import_rtti.isString)(selectorOrLocator))
      return new Locator(this._frame, this._selector + " >> " + selectorOrLocator, options);
    if (selectorOrLocator._frame !== this._frame)
      throw new Error(`Locators must belong to the same frame.`);
    return new Locator(this._frame, this._selector + " >> internal:chain=" + JSON.stringify(selectorOrLocator._selector), options);
  }
  getByTestId(testId) {
    return this.locator((0, import_locatorUtils.getByTestIdSelector)(testIdAttributeName(), testId));
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
    return new FrameLocator(this._frame, this._selector + " >> " + selector);
  }
  filter(options) {
    return new Locator(this._frame, this._selector, options);
  }
  async elementHandle(options) {
    return await this._frame.waitForSelector(this._selector, { strict: true, state: "attached", ...options });
  }
  async elementHandles() {
    return await this._frame.$$(this._selector);
  }
  contentFrame() {
    return new FrameLocator(this._frame, this._selector);
  }
  describe(description) {
    return new Locator(this._frame, this._selector + " >> internal:describe=" + JSON.stringify(description));
  }
  description() {
    return (0, import_locatorGenerators.locatorCustomDescription)(this._selector) || null;
  }
  first() {
    return new Locator(this._frame, this._selector + " >> nth=0");
  }
  last() {
    return new Locator(this._frame, this._selector + ` >> nth=-1`);
  }
  nth(index) {
    return new Locator(this._frame, this._selector + ` >> nth=${index}`);
  }
  and(locator) {
    if (locator._frame !== this._frame)
      throw new Error(`Locators must belong to the same frame.`);
    return new Locator(this._frame, this._selector + ` >> internal:and=` + JSON.stringify(locator._selector));
  }
  or(locator) {
    if (locator._frame !== this._frame)
      throw new Error(`Locators must belong to the same frame.`);
    return new Locator(this._frame, this._selector + ` >> internal:or=` + JSON.stringify(locator._selector));
  }
  async focus(options) {
    return await this._frame.focus(this._selector, { strict: true, ...options });
  }
  async blur(options) {
    await this._frame._channel.blur({ selector: this._selector, strict: true, ...options, timeout: this._frame._timeout(options) });
  }
  // options are only here for testing
  async count(_options) {
    return await this._frame._queryCount(this._selector, _options);
  }
  async _resolveSelector() {
    return await this._frame._channel.resolveSelector({ selector: this._selector });
  }
  async getAttribute(name, options) {
    return await this._frame.getAttribute(this._selector, name, { strict: true, ...options });
  }
  async hover(options = {}) {
    return await this._frame.hover(this._selector, { strict: true, ...options });
  }
  async innerHTML(options) {
    return await this._frame.innerHTML(this._selector, { strict: true, ...options });
  }
  async innerText(options) {
    return await this._frame.innerText(this._selector, { strict: true, ...options });
  }
  async inputValue(options) {
    return await this._frame.inputValue(this._selector, { strict: true, ...options });
  }
  async isChecked(options) {
    return await this._frame.isChecked(this._selector, { strict: true, ...options });
  }
  async isDisabled(options) {
    return await this._frame.isDisabled(this._selector, { strict: true, ...options });
  }
  async isEditable(options) {
    return await this._frame.isEditable(this._selector, { strict: true, ...options });
  }
  async isEnabled(options) {
    return await this._frame.isEnabled(this._selector, { strict: true, ...options });
  }
  async isHidden(options) {
    return await this._frame.isHidden(this._selector, { strict: true, ...options });
  }
  async isVisible(options) {
    return await this._frame.isVisible(this._selector, { strict: true, ...options });
  }
  async press(key, options = {}) {
    return await this._frame.press(this._selector, key, { strict: true, ...options });
  }
  async screenshot(options = {}) {
    const mask = options.mask;
    return await this._withElement((h, timeout) => h.screenshot({ ...options, mask, timeout }), { title: "Screenshot", timeout: options.timeout });
  }
  async ariaSnapshot(options) {
    const result = await this._frame._channel.ariaSnapshot({ ...options, selector: this._selector, timeout: this._frame._timeout(options) });
    return result.snapshot;
  }
  async scrollIntoViewIfNeeded(options = {}) {
    return await this._withElement((h, timeout) => h.scrollIntoViewIfNeeded({ ...options, timeout }), { title: "Scroll into view", timeout: options.timeout });
  }
  async selectOption(values, options = {}) {
    return await this._frame.selectOption(this._selector, values, { strict: true, ...options });
  }
  async selectText(options = {}) {
    return await this._withElement((h, timeout) => h.selectText({ ...options, timeout }), { title: "Select text", timeout: options.timeout });
  }
  async setChecked(checked, options) {
    if (checked)
      await this.check(options);
    else
      await this.uncheck(options);
  }
  async setInputFiles(files, options = {}) {
    return await this._frame.setInputFiles(this._selector, files, { strict: true, ...options });
  }
  async tap(options = {}) {
    return await this._frame.tap(this._selector, { strict: true, ...options });
  }
  async textContent(options) {
    return await this._frame.textContent(this._selector, { strict: true, ...options });
  }
  async type(text, options = {}) {
    return await this._frame.type(this._selector, text, { strict: true, ...options });
  }
  async pressSequentially(text, options = {}) {
    return await this.type(text, options);
  }
  async uncheck(options = {}) {
    return await this._frame.uncheck(this._selector, { strict: true, ...options });
  }
  async all() {
    return new Array(await this.count()).fill(0).map((e, i) => this.nth(i));
  }
  async allInnerTexts() {
    return await this._frame.$$eval(this._selector, (ee) => ee.map((e) => e.innerText));
  }
  async allTextContents() {
    return await this._frame.$$eval(this._selector, (ee) => ee.map((e) => e.textContent || ""));
  }
  async waitFor(options) {
    await this._frame._channel.waitForSelector({ selector: this._selector, strict: true, omitReturnValue: true, ...options, timeout: this._frame._timeout(options) });
  }
  async _expect(expression, options) {
    return this._frame._expect(expression, {
      ...options,
      selector: this._selector
    });
  }
  _inspect() {
    return this.toString();
  }
  toString() {
    return (0, import_locatorGenerators.asLocatorDescription)("javascript", this._selector);
  }
}
class FrameLocator {
  constructor(frame, selector) {
    this._frame = frame;
    this._frameSelector = selector;
  }
  locator(selectorOrLocator, options) {
    if ((0, import_rtti.isString)(selectorOrLocator))
      return new Locator(this._frame, this._frameSelector + " >> internal:control=enter-frame >> " + selectorOrLocator, options);
    if (selectorOrLocator._frame !== this._frame)
      throw new Error(`Locators must belong to the same frame.`);
    return new Locator(this._frame, this._frameSelector + " >> internal:control=enter-frame >> " + selectorOrLocator._selector, options);
  }
  getByTestId(testId) {
    return this.locator((0, import_locatorUtils.getByTestIdSelector)(testIdAttributeName(), testId));
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
  owner() {
    return new Locator(this._frame, this._frameSelector);
  }
  frameLocator(selector) {
    return new FrameLocator(this._frame, this._frameSelector + " >> internal:control=enter-frame >> " + selector);
  }
  first() {
    return new FrameLocator(this._frame, this._frameSelector + " >> nth=0");
  }
  last() {
    return new FrameLocator(this._frame, this._frameSelector + ` >> nth=-1`);
  }
  nth(index) {
    return new FrameLocator(this._frame, this._frameSelector + ` >> nth=${index}`);
  }
}
let _testIdAttributeName = "data-testid";
function testIdAttributeName() {
  return _testIdAttributeName;
}
function setTestIdAttribute(attributeName) {
  _testIdAttributeName = attributeName;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FrameLocator,
  Locator,
  setTestIdAttribute,
  testIdAttributeName
});
