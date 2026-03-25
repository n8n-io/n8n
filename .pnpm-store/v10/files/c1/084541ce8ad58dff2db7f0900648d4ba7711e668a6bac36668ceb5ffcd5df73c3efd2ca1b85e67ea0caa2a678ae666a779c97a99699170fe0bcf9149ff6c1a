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
var csharp_exports = {};
__export(csharp_exports, {
  CSharpLanguageGenerator: () => CSharpLanguageGenerator
});
module.exports = __toCommonJS(csharp_exports);
var import_language = require("./language");
var import_utils = require("../../utils");
var import_deviceDescriptors = require("../deviceDescriptors");
class CSharpLanguageGenerator {
  constructor(mode) {
    this.groupName = ".NET C#";
    this.highlighter = "csharp";
    if (mode === "library") {
      this.name = "Library";
      this.id = "csharp";
    } else if (mode === "mstest") {
      this.name = "MSTest";
      this.id = "csharp-mstest";
    } else if (mode === "nunit") {
      this.name = "NUnit";
      this.id = "csharp-nunit";
    } else {
      throw new Error(`Unknown C# language mode: ${mode}`);
    }
    this._mode = mode;
  }
  generateAction(actionInContext) {
    const action = this._generateActionInner(actionInContext);
    if (action)
      return action;
    return "";
  }
  _generateActionInner(actionInContext) {
    const action = actionInContext.action;
    if (this._mode !== "library" && (action.name === "openPage" || action.name === "closePage"))
      return "";
    const pageAlias = this._formatPageAlias(actionInContext.frame.pageAlias);
    const formatter = new CSharpFormatter(this._mode === "library" ? 0 : 8);
    if (action.name === "openPage") {
      formatter.add(`var ${pageAlias} = await context.NewPageAsync();`);
      if (action.url && action.url !== "about:blank" && action.url !== "chrome://newtab/")
        formatter.add(`await ${pageAlias}.GotoAsync(${quote(action.url)});`);
      return formatter.format();
    }
    const locators = actionInContext.frame.framePath.map((selector) => `.${this._asLocator(selector)}.ContentFrame`);
    const subject = `${pageAlias}${locators.join("")}`;
    const signals = (0, import_language.toSignalMap)(action);
    if (signals.dialog) {
      formatter.add(`    void ${pageAlias}_Dialog${signals.dialog.dialogAlias}_EventHandler(object sender, IDialog dialog)
      {
          Console.WriteLine($"Dialog message: {dialog.Message}");
          dialog.DismissAsync();
          ${pageAlias}.Dialog -= ${pageAlias}_Dialog${signals.dialog.dialogAlias}_EventHandler;
      }
      ${pageAlias}.Dialog += ${pageAlias}_Dialog${signals.dialog.dialogAlias}_EventHandler;`);
    }
    const lines = [];
    lines.push(this._generateActionCall(subject, actionInContext));
    if (signals.download) {
      lines.unshift(`var download${signals.download.downloadAlias} = await ${pageAlias}.RunAndWaitForDownloadAsync(async () =>
{`);
      lines.push(`});`);
    }
    if (signals.popup) {
      lines.unshift(`var ${this._formatPageAlias(signals.popup.popupAlias)} = await ${pageAlias}.RunAndWaitForPopupAsync(async () =>
{`);
      lines.push(`});`);
    }
    for (const line of lines)
      formatter.add(line);
    return formatter.format();
  }
  _formatPageAlias(pageAlias) {
    if (this._mode === "library")
      return pageAlias;
    if (pageAlias === "page")
      return "Page";
    return pageAlias;
  }
  _generateActionCall(subject, actionInContext) {
    const action = actionInContext.action;
    switch (action.name) {
      case "openPage":
        throw Error("Not reached");
      case "closePage":
        return `await ${subject}.CloseAsync();`;
      case "click": {
        let method = "Click";
        if (action.clickCount === 2)
          method = "DblClick";
        const options = (0, import_language.toClickOptionsForSourceCode)(action);
        if (!Object.entries(options).length)
          return `await ${subject}.${this._asLocator(action.selector)}.${method}Async();`;
        const optionsString = formatObject(options, "    ");
        return `await ${subject}.${this._asLocator(action.selector)}.${method}Async(${optionsString});`;
      }
      case "hover": {
        const optionsString = action.position ? formatObject({ position: action.position }, "    ") : "";
        return `await ${subject}.${this._asLocator(action.selector)}.HoverAsync(${optionsString});`;
      }
      case "check":
        return `await ${subject}.${this._asLocator(action.selector)}.CheckAsync();`;
      case "uncheck":
        return `await ${subject}.${this._asLocator(action.selector)}.UncheckAsync();`;
      case "fill":
        return `await ${subject}.${this._asLocator(action.selector)}.FillAsync(${quote(action.text)});`;
      case "setInputFiles":
        return `await ${subject}.${this._asLocator(action.selector)}.SetInputFilesAsync(${formatObject(action.files)});`;
      case "press": {
        const modifiers = (0, import_language.toKeyboardModifiers)(action.modifiers);
        const shortcut = [...modifiers, action.key].join("+");
        return `await ${subject}.${this._asLocator(action.selector)}.PressAsync(${quote(shortcut)});`;
      }
      case "navigate":
        return `await ${subject}.GotoAsync(${quote(action.url)});`;
      case "select":
        return `await ${subject}.${this._asLocator(action.selector)}.SelectOptionAsync(${formatObject(action.options)});`;
      case "assertText":
        return `await Expect(${subject}.${this._asLocator(action.selector)}).${action.substring ? "ToContainTextAsync" : "ToHaveTextAsync"}(${quote(action.text)});`;
      case "assertChecked":
        return `await Expect(${subject}.${this._asLocator(action.selector)})${action.checked ? "" : ".Not"}.ToBeCheckedAsync();`;
      case "assertVisible":
        return `await Expect(${subject}.${this._asLocator(action.selector)}).ToBeVisibleAsync();`;
      case "assertValue": {
        const assertion = action.value ? `ToHaveValueAsync(${quote(action.value)})` : `ToBeEmptyAsync()`;
        return `await Expect(${subject}.${this._asLocator(action.selector)}).${assertion};`;
      }
      case "assertSnapshot":
        return `await Expect(${subject}.${this._asLocator(action.selector)}).ToMatchAriaSnapshotAsync(${quote(action.ariaSnapshot)});`;
    }
  }
  _asLocator(selector) {
    return (0, import_utils.asLocator)("csharp", selector);
  }
  generateHeader(options) {
    if (this._mode === "library")
      return this.generateStandaloneHeader(options);
    return this.generateTestRunnerHeader(options);
  }
  generateStandaloneHeader(options) {
    const formatter = new CSharpFormatter(0);
    formatter.add(`
      using Microsoft.Playwright;
      using System;
      using System.Threading.Tasks;

      using var playwright = await Playwright.CreateAsync();
      await using var browser = await playwright.${toPascal(options.browserName)}.LaunchAsync(${formatObject(options.launchOptions, "    ")});
      var context = await browser.NewContextAsync(${formatContextOptions(options.contextOptions, options.deviceName)});`);
    if (options.contextOptions.recordHar) {
      const url = options.contextOptions.recordHar.urlFilter;
      formatter.add(`      await context.RouteFromHARAsync(${quote(options.contextOptions.recordHar.path)}${url ? `, ${formatObject({ url }, "    ")}` : ""});`);
    }
    formatter.newLine();
    return formatter.format();
  }
  generateTestRunnerHeader(options) {
    const formatter = new CSharpFormatter(0);
    formatter.add(`
      using Microsoft.Playwright.${this._mode === "nunit" ? "NUnit" : "MSTest"};
      using Microsoft.Playwright;

      ${this._mode === "nunit" ? `[Parallelizable(ParallelScope.Self)]
      [TestFixture]` : "[TestClass]"}
      public class Tests : PageTest
      {`);
    const formattedContextOptions = formatContextOptions(options.contextOptions, options.deviceName);
    if (formattedContextOptions) {
      formatter.add(`public override BrowserNewContextOptions ContextOptions()
      {
          return ${formattedContextOptions};
      }`);
      formatter.newLine();
    }
    formatter.add(`    [${this._mode === "nunit" ? "Test" : "TestMethod"}]
    public async Task MyTest()
    {`);
    if (options.contextOptions.recordHar) {
      const url = options.contextOptions.recordHar.urlFilter;
      formatter.add(`    await Context.RouteFromHARAsync(${quote(options.contextOptions.recordHar.path)}${url ? `, ${formatObject({ url }, "    ")}` : ""});`);
    }
    return formatter.format();
  }
  generateFooter(saveStorage) {
    const offset = this._mode === "library" ? "" : "        ";
    let storageStateLine = saveStorage ? `
${offset}await context.StorageStateAsync(new()
${offset}{
${offset}    Path = ${quote(saveStorage)}
${offset}});
` : "";
    if (this._mode !== "library")
      storageStateLine += `    }
}
`;
    return storageStateLine;
  }
}
function formatObject(value, indent = "    ", name = "") {
  if (typeof value === "string") {
    if (["colorScheme", "modifiers", "button", "recordHarContent", "recordHarMode", "serviceWorkers"].includes(name))
      return `${getEnumName(name)}.${toPascal(value)}`;
    return quote(value);
  }
  if (Array.isArray(value))
    return `new[] { ${value.map((o) => formatObject(o, indent, name)).join(", ")} }`;
  if (typeof value === "object") {
    const keys = Object.keys(value).filter((key) => value[key] !== void 0).sort();
    if (!keys.length)
      return `new()`;
    const tokens = [];
    for (const key of keys) {
      const property = getPropertyName(key);
      tokens.push(`${property} = ${formatObject(value[key], indent, key)},`);
    }
    return `new()
{
${indent}${tokens.join(`
${indent}`)}
${indent}}`;
  }
  if (name === "latitude" || name === "longitude")
    return String(value) + "m";
  return String(value);
}
function getEnumName(value) {
  switch (value) {
    case "modifiers":
      return "KeyboardModifier";
    case "button":
      return "MouseButton";
    case "recordHarMode":
      return "HarMode";
    case "recordHarContent":
      return "HarContentPolicy";
    case "serviceWorkers":
      return "ServiceWorkerPolicy";
    default:
      return toPascal(value);
  }
}
function getPropertyName(key) {
  switch (key) {
    case "storageState":
      return "StorageStatePath";
    case "viewport":
      return "ViewportSize";
    default:
      return toPascal(key);
  }
}
function toPascal(value) {
  return value[0].toUpperCase() + value.slice(1);
}
function formatContextOptions(contextOptions, deviceName) {
  const options = { ...contextOptions };
  delete options.recordHar;
  const device = deviceName && import_deviceDescriptors.deviceDescriptors[deviceName];
  if (!device) {
    if (!Object.entries(options).length)
      return "";
    return formatObject(options, "    ");
  }
  if (!Object.entries((0, import_language.sanitizeDeviceOptions)(device, options)).length)
    return `playwright.Devices[${quote(deviceName)}]`;
  delete options["defaultBrowserType"];
  return formatObject(options, "    ");
}
class CSharpFormatter {
  constructor(offset = 0) {
    this._lines = [];
    this._baseIndent = " ".repeat(4);
    this._baseOffset = " ".repeat(offset);
  }
  prepend(text) {
    this._lines = text.trim().split("\n").map((line) => line.trim()).concat(this._lines);
  }
  add(text) {
    this._lines.push(...text.trim().split("\n").map((line) => line.trim()));
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
      if (line.startsWith("}") || line.startsWith("]") || line.includes("});") || line === ");")
        spaces = spaces.substring(this._baseIndent.length);
      const extraSpaces = /^(for|while|if).*\(.*\)$/.test(previousLine) ? this._baseIndent : "";
      previousLine = line;
      line = spaces + extraSpaces + line;
      if (line.endsWith("{") || line.endsWith("[") || line.endsWith("("))
        spaces += this._baseIndent;
      if (line.endsWith("));"))
        spaces = spaces.substring(this._baseIndent.length);
      return this._baseOffset + line;
    }).join("\n");
  }
}
function quote(text) {
  return (0, import_utils.escapeWithQuotes)(text, '"');
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CSharpLanguageGenerator
});
