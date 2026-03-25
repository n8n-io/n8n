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
var javascript_exports = {};
__export(javascript_exports, {
  JavaScriptFormatter: () => JavaScriptFormatter,
  JavaScriptLanguageGenerator: () => JavaScriptLanguageGenerator,
  quoteMultiline: () => quoteMultiline
});
module.exports = __toCommonJS(javascript_exports);
var import_language = require("./language");
var import_utils = require("../../utils");
var import_deviceDescriptors = require("../deviceDescriptors");
class JavaScriptLanguageGenerator {
  constructor(isTest) {
    this.groupName = "Node.js";
    this.highlighter = "javascript";
    this.id = isTest ? "playwright-test" : "javascript";
    this.name = isTest ? "Test Runner" : "Library";
    this._isTest = isTest;
  }
  generateAction(actionInContext) {
    const action = actionInContext.action;
    if (this._isTest && (action.name === "openPage" || action.name === "closePage"))
      return "";
    const pageAlias = actionInContext.frame.pageAlias;
    const formatter = new JavaScriptFormatter(2);
    if (action.name === "openPage") {
      formatter.add(`const ${pageAlias} = await context.newPage();`);
      if (action.url && action.url !== "about:blank" && action.url !== "chrome://newtab/")
        formatter.add(`await ${pageAlias}.goto(${quote(action.url)});`);
      return formatter.format();
    }
    const locators = actionInContext.frame.framePath.map((selector) => `.${this._asLocator(selector)}.contentFrame()`);
    const subject = `${pageAlias}${locators.join("")}`;
    const signals = (0, import_language.toSignalMap)(action);
    if (signals.dialog) {
      formatter.add(`  ${pageAlias}.once('dialog', dialog => {
    console.log(\`Dialog message: \${dialog.message()}\`);
    dialog.dismiss().catch(() => {});
  });`);
    }
    if (signals.popup)
      formatter.add(`const ${signals.popup.popupAlias}Promise = ${pageAlias}.waitForEvent('popup');`);
    if (signals.download)
      formatter.add(`const download${signals.download.downloadAlias}Promise = ${pageAlias}.waitForEvent('download');`);
    formatter.add(wrapWithStep(actionInContext.description, this._generateActionCall(subject, actionInContext)));
    if (signals.popup)
      formatter.add(`const ${signals.popup.popupAlias} = await ${signals.popup.popupAlias}Promise;`);
    if (signals.download)
      formatter.add(`const download${signals.download.downloadAlias} = await download${signals.download.downloadAlias}Promise;`);
    return formatter.format();
  }
  _generateActionCall(subject, actionInContext) {
    const action = actionInContext.action;
    switch (action.name) {
      case "openPage":
        throw Error("Not reached");
      case "closePage":
        return `await ${subject}.close();`;
      case "click": {
        let method = "click";
        if (action.clickCount === 2)
          method = "dblclick";
        const options = (0, import_language.toClickOptionsForSourceCode)(action);
        const optionsString = formatOptions(options, false);
        return `await ${subject}.${this._asLocator(action.selector)}.${method}(${optionsString});`;
      }
      case "hover":
        return `await ${subject}.${this._asLocator(action.selector)}.hover(${formatOptions({ position: action.position }, false)});`;
      case "check":
        return `await ${subject}.${this._asLocator(action.selector)}.check();`;
      case "uncheck":
        return `await ${subject}.${this._asLocator(action.selector)}.uncheck();`;
      case "fill":
        return `await ${subject}.${this._asLocator(action.selector)}.fill(${quote(action.text)});`;
      case "setInputFiles":
        return `await ${subject}.${this._asLocator(action.selector)}.setInputFiles(${(0, import_utils.formatObject)(action.files.length === 1 ? action.files[0] : action.files)});`;
      case "press": {
        const modifiers = (0, import_language.toKeyboardModifiers)(action.modifiers);
        const shortcut = [...modifiers, action.key].join("+");
        return `await ${subject}.${this._asLocator(action.selector)}.press(${quote(shortcut)});`;
      }
      case "navigate":
        return `await ${subject}.goto(${quote(action.url)});`;
      case "select":
        return `await ${subject}.${this._asLocator(action.selector)}.selectOption(${(0, import_utils.formatObject)(action.options.length === 1 ? action.options[0] : action.options)});`;
      case "assertText":
        return `${this._isTest ? "" : "// "}await expect(${subject}.${this._asLocator(action.selector)}).${action.substring ? "toContainText" : "toHaveText"}(${quote(action.text)});`;
      case "assertChecked":
        return `${this._isTest ? "" : "// "}await expect(${subject}.${this._asLocator(action.selector)})${action.checked ? "" : ".not"}.toBeChecked();`;
      case "assertVisible":
        return `${this._isTest ? "" : "// "}await expect(${subject}.${this._asLocator(action.selector)}).toBeVisible();`;
      case "assertValue": {
        const assertion = action.value ? `toHaveValue(${quote(action.value)})` : `toBeEmpty()`;
        return `${this._isTest ? "" : "// "}await expect(${subject}.${this._asLocator(action.selector)}).${assertion};`;
      }
      case "assertSnapshot": {
        const commentIfNeeded = this._isTest ? "" : "// ";
        return `${commentIfNeeded}await expect(${subject}.${this._asLocator(action.selector)}).toMatchAriaSnapshot(${quoteMultiline(action.ariaSnapshot, `${commentIfNeeded}  `)});`;
      }
    }
  }
  _asLocator(selector) {
    return (0, import_utils.asLocator)("javascript", selector);
  }
  generateHeader(options) {
    if (this._isTest)
      return this.generateTestHeader(options);
    return this.generateStandaloneHeader(options);
  }
  generateFooter(saveStorage) {
    if (this._isTest)
      return this.generateTestFooter(saveStorage);
    return this.generateStandaloneFooter(saveStorage);
  }
  generateTestHeader(options) {
    const formatter = new JavaScriptFormatter();
    const useText = formatContextOptions(options.contextOptions, options.deviceName, this._isTest);
    formatter.add(`
      import { test, expect${options.deviceName ? ", devices" : ""} } from '@playwright/test';
${useText ? "\ntest.use(" + useText + ");\n" : ""}
      test('test', async ({ page }) => {`);
    if (options.contextOptions.recordHar) {
      const url = options.contextOptions.recordHar.urlFilter;
      formatter.add(`  await page.routeFromHAR(${quote(options.contextOptions.recordHar.path)}${url ? `, ${formatOptions({ url }, false)}` : ""});`);
    }
    return formatter.format();
  }
  generateTestFooter(saveStorage) {
    return `});`;
  }
  generateStandaloneHeader(options) {
    const formatter = new JavaScriptFormatter();
    formatter.add(`
      const { ${options.browserName}${options.deviceName ? ", devices" : ""} } = require('playwright');

      (async () => {
        const browser = await ${options.browserName}.launch(${(0, import_utils.formatObjectOrVoid)(options.launchOptions)});
        const context = await browser.newContext(${formatContextOptions(options.contextOptions, options.deviceName, false)});`);
    if (options.contextOptions.recordHar)
      formatter.add(`        await context.routeFromHAR(${quote(options.contextOptions.recordHar.path)});`);
    return formatter.format();
  }
  generateStandaloneFooter(saveStorage) {
    const storageStateLine = saveStorage ? `
  await context.storageState({ path: ${quote(saveStorage)} });` : "";
    return `
  // ---------------------${storageStateLine}
  await context.close();
  await browser.close();
})();`;
  }
}
function formatOptions(value, hasArguments) {
  const keys = Object.keys(value).filter((key) => value[key] !== void 0);
  if (!keys.length)
    return "";
  return (hasArguments ? ", " : "") + (0, import_utils.formatObject)(value);
}
function formatContextOptions(options, deviceName, isTest) {
  const device = deviceName && import_deviceDescriptors.deviceDescriptors[deviceName];
  options = { ...options, recordHar: void 0 };
  if (!device)
    return (0, import_utils.formatObjectOrVoid)(options);
  let serializedObject = (0, import_utils.formatObjectOrVoid)((0, import_language.sanitizeDeviceOptions)(device, options));
  if (!serializedObject)
    serializedObject = "{\n}";
  const lines = serializedObject.split("\n");
  lines.splice(1, 0, `...devices[${quote(deviceName)}],`);
  return lines.join("\n");
}
class JavaScriptFormatter {
  constructor(offset = 0) {
    this._lines = [];
    this._baseIndent = " ".repeat(2);
    this._baseOffset = " ".repeat(offset);
  }
  prepend(text) {
    const trim = isMultilineString(text) ? (line) => line : (line) => line.trim();
    this._lines = text.trim().split("\n").map(trim).concat(this._lines);
  }
  add(text) {
    const trim = isMultilineString(text) ? (line) => line : (line) => line.trim();
    this._lines.push(...text.trim().split("\n").map(trim));
  }
  newLine() {
    this._lines.push("");
  }
  format() {
    let spaces = "";
    let previousLine = "";
    return this._lines.map((line) => {
      if (line === "")
        return line;
      if (line.startsWith("}") || line.startsWith("]"))
        spaces = spaces.substring(this._baseIndent.length);
      const extraSpaces = /^(for|while|if|try).*\(.*\)$/.test(previousLine) ? this._baseIndent : "";
      previousLine = line;
      const callCarryOver = line.startsWith(".set");
      line = spaces + extraSpaces + (callCarryOver ? this._baseIndent : "") + line;
      if (line.endsWith("{") || line.endsWith("["))
        spaces += this._baseIndent;
      return this._baseOffset + line;
    }).join("\n");
  }
}
function quote(text) {
  return (0, import_utils.escapeWithQuotes)(text, "'");
}
function wrapWithStep(description, body) {
  return description ? `await test.step(\`${description}\`, async () => {
${body}
});` : body;
}
function quoteMultiline(text, indent = "  ") {
  const escape = (text2) => text2.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const lines = text.split("\n");
  if (lines.length === 1)
    return "`" + escape(text) + "`";
  return "`\n" + lines.map((line) => indent + escape(line).replace(/\${/g, "\\${")).join("\n") + `
${indent}\``;
}
function isMultilineString(text) {
  return text.match(/`[\S\s]*`/)?.[0].includes("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JavaScriptFormatter,
  JavaScriptLanguageGenerator,
  quoteMultiline
});
