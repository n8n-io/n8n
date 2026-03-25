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
var java_exports = {};
__export(java_exports, {
  JavaLanguageGenerator: () => JavaLanguageGenerator
});
module.exports = __toCommonJS(java_exports);
var import_language = require("./language");
var import_deviceDescriptors = require("../deviceDescriptors");
var import_javascript = require("./javascript");
var import_utils = require("../../utils");
class JavaLanguageGenerator {
  constructor(mode) {
    this.groupName = "Java";
    this.highlighter = "java";
    if (mode === "library") {
      this.name = "Library";
      this.id = "java";
    } else if (mode === "junit") {
      this.name = "JUnit";
      this.id = "java-junit";
    } else {
      throw new Error(`Unknown Java language mode: ${mode}`);
    }
    this._mode = mode;
  }
  generateAction(actionInContext) {
    const action = actionInContext.action;
    const pageAlias = actionInContext.frame.pageAlias;
    const offset = this._mode === "junit" ? 4 : 6;
    const formatter = new import_javascript.JavaScriptFormatter(offset);
    if (this._mode !== "library" && (action.name === "openPage" || action.name === "closePage"))
      return "";
    if (action.name === "openPage") {
      formatter.add(`Page ${pageAlias} = context.newPage();`);
      if (action.url && action.url !== "about:blank" && action.url !== "chrome://newtab/")
        formatter.add(`${pageAlias}.navigate(${quote(action.url)});`);
      return formatter.format();
    }
    const locators = actionInContext.frame.framePath.map((selector) => `.${this._asLocator(selector, false)}.contentFrame()`);
    const subject = `${pageAlias}${locators.join("")}`;
    const signals = (0, import_language.toSignalMap)(action);
    if (signals.dialog) {
      formatter.add(`  ${pageAlias}.onceDialog(dialog -> {
        System.out.println(String.format("Dialog message: %s", dialog.message()));
        dialog.dismiss();
      });`);
    }
    let code = this._generateActionCall(subject, actionInContext, !!actionInContext.frame.framePath.length);
    if (signals.popup) {
      code = `Page ${signals.popup.popupAlias} = ${pageAlias}.waitForPopup(() -> {
        ${code}
      });`;
    }
    if (signals.download) {
      code = `Download download${signals.download.downloadAlias} = ${pageAlias}.waitForDownload(() -> {
        ${code}
      });`;
    }
    formatter.add(code);
    return formatter.format();
  }
  _generateActionCall(subject, actionInContext, inFrameLocator) {
    const action = actionInContext.action;
    switch (action.name) {
      case "openPage":
        throw Error("Not reached");
      case "closePage":
        return `${subject}.close();`;
      case "click": {
        let method = "click";
        if (action.clickCount === 2)
          method = "dblclick";
        const options = (0, import_language.toClickOptionsForSourceCode)(action);
        const optionsText = formatClickOptions(options);
        return `${subject}.${this._asLocator(action.selector, inFrameLocator)}.${method}(${optionsText});`;
      }
      case "hover": {
        const optionsText = action.position ? `new Locator.HoverOptions().setPosition(${action.position.x}, ${action.position.y})` : "";
        return `${subject}.${this._asLocator(action.selector, inFrameLocator)}.hover(${optionsText});`;
      }
      case "check":
        return `${subject}.${this._asLocator(action.selector, inFrameLocator)}.check();`;
      case "uncheck":
        return `${subject}.${this._asLocator(action.selector, inFrameLocator)}.uncheck();`;
      case "fill":
        return `${subject}.${this._asLocator(action.selector, inFrameLocator)}.fill(${quote(action.text)});`;
      case "setInputFiles":
        return `${subject}.${this._asLocator(action.selector, inFrameLocator)}.setInputFiles(${formatPath(action.files.length === 1 ? action.files[0] : action.files)});`;
      case "press": {
        const modifiers = (0, import_language.toKeyboardModifiers)(action.modifiers);
        const shortcut = [...modifiers, action.key].join("+");
        return `${subject}.${this._asLocator(action.selector, inFrameLocator)}.press(${quote(shortcut)});`;
      }
      case "navigate":
        return `${subject}.navigate(${quote(action.url)});`;
      case "select":
        return `${subject}.${this._asLocator(action.selector, inFrameLocator)}.selectOption(${formatSelectOption(action.options.length === 1 ? action.options[0] : action.options)});`;
      case "assertText":
        return `assertThat(${subject}.${this._asLocator(action.selector, inFrameLocator)}).${action.substring ? "containsText" : "hasText"}(${quote(action.text)});`;
      case "assertChecked":
        return `assertThat(${subject}.${this._asLocator(action.selector, inFrameLocator)})${action.checked ? "" : ".not()"}.isChecked();`;
      case "assertVisible":
        return `assertThat(${subject}.${this._asLocator(action.selector, inFrameLocator)}).isVisible();`;
      case "assertValue": {
        const assertion = action.value ? `hasValue(${quote(action.value)})` : `isEmpty()`;
        return `assertThat(${subject}.${this._asLocator(action.selector, inFrameLocator)}).${assertion};`;
      }
      case "assertSnapshot":
        return `assertThat(${subject}.${this._asLocator(action.selector, inFrameLocator)}).matchesAriaSnapshot(${quote(action.ariaSnapshot)});`;
    }
  }
  _asLocator(selector, inFrameLocator) {
    return (0, import_utils.asLocator)("java", selector, inFrameLocator);
  }
  generateHeader(options) {
    const formatter = new import_javascript.JavaScriptFormatter();
    if (this._mode === "junit") {
      formatter.add(`
      import com.microsoft.playwright.junit.UsePlaywright;
      import com.microsoft.playwright.Page;
      import com.microsoft.playwright.options.*;

      ${options.contextOptions.recordHar ? `import java.nio.file.Paths;
` : ""}import org.junit.jupiter.api.*;
      import static com.microsoft.playwright.assertions.PlaywrightAssertions.*;

      @UsePlaywright
      public class TestExample {
        @Test
        void test(Page page) {`);
      if (options.contextOptions.recordHar) {
        const url = options.contextOptions.recordHar.urlFilter;
        const recordHarOptions = typeof url === "string" ? `, new Page.RouteFromHAROptions()
            .setUrl(${quote(url)})` : "";
        formatter.add(`          page.routeFromHAR(Paths.get(${quote(options.contextOptions.recordHar.path)})${recordHarOptions});`);
      }
      return formatter.format();
    }
    formatter.add(`
    import com.microsoft.playwright.*;
    import com.microsoft.playwright.options.*;
    import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
    ${options.contextOptions.recordHar ? `import java.nio.file.Paths;
` : ""}import java.util.*;

    public class Example {
      public static void main(String[] args) {
        try (Playwright playwright = Playwright.create()) {
          Browser browser = playwright.${options.browserName}().launch(${formatLaunchOptions(options.launchOptions)});
          BrowserContext context = browser.newContext(${formatContextOptions(options.contextOptions, options.deviceName)});`);
    if (options.contextOptions.recordHar) {
      const url = options.contextOptions.recordHar.urlFilter;
      const recordHarOptions = typeof url === "string" ? `, new BrowserContext.RouteFromHAROptions()
          .setUrl(${quote(url)})` : "";
      formatter.add(`          context.routeFromHAR(Paths.get(${quote(options.contextOptions.recordHar.path)})${recordHarOptions});`);
    }
    return formatter.format();
  }
  generateFooter(saveStorage) {
    const storageStateLine = saveStorage ? `
      context.storageState(new BrowserContext.StorageStateOptions().setPath(${quote(saveStorage)}));
` : "";
    if (this._mode === "junit") {
      return `${storageStateLine}  }
}`;
    }
    return `${storageStateLine}    }
  }
}`;
  }
}
function formatPath(files) {
  if (Array.isArray(files)) {
    if (files.length === 0)
      return "new Path[0]";
    return `new Path[] {${files.map((s) => "Paths.get(" + quote(s) + ")").join(", ")}}`;
  }
  return `Paths.get(${quote(files)})`;
}
function formatSelectOption(options) {
  if (Array.isArray(options)) {
    if (options.length === 0)
      return "new String[0]";
    return `new String[] {${options.map((s) => quote(s)).join(", ")}}`;
  }
  return quote(options);
}
function formatLaunchOptions(options) {
  const lines = [];
  if (!Object.keys(options).filter((key) => options[key] !== void 0).length)
    return "";
  lines.push("new BrowserType.LaunchOptions()");
  if (options.channel)
    lines.push(`  .setChannel(${quote(options.channel)})`);
  if (typeof options.headless === "boolean")
    lines.push(`  .setHeadless(false)`);
  return lines.join("\n");
}
function formatContextOptions(contextOptions, deviceName) {
  const lines = [];
  if (!Object.keys(contextOptions).length && !deviceName)
    return "";
  const device = deviceName ? import_deviceDescriptors.deviceDescriptors[deviceName] : {};
  const options = { ...device, ...contextOptions };
  lines.push("new Browser.NewContextOptions()");
  if (options.acceptDownloads)
    lines.push(`  .setAcceptDownloads(true)`);
  if (options.bypassCSP)
    lines.push(`  .setBypassCSP(true)`);
  if (options.colorScheme)
    lines.push(`  .setColorScheme(ColorScheme.${options.colorScheme.toUpperCase()})`);
  if (options.deviceScaleFactor)
    lines.push(`  .setDeviceScaleFactor(${options.deviceScaleFactor})`);
  if (options.geolocation)
    lines.push(`  .setGeolocation(${options.geolocation.latitude}, ${options.geolocation.longitude})`);
  if (options.hasTouch)
    lines.push(`  .setHasTouch(${options.hasTouch})`);
  if (options.isMobile)
    lines.push(`  .setIsMobile(${options.isMobile})`);
  if (options.locale)
    lines.push(`  .setLocale(${quote(options.locale)})`);
  if (options.proxy)
    lines.push(`  .setProxy(new Proxy(${quote(options.proxy.server)}))`);
  if (options.serviceWorkers)
    lines.push(`  .setServiceWorkers(ServiceWorkerPolicy.${options.serviceWorkers.toUpperCase()})`);
  if (options.storageState)
    lines.push(`  .setStorageStatePath(Paths.get(${quote(options.storageState)}))`);
  if (options.timezoneId)
    lines.push(`  .setTimezoneId(${quote(options.timezoneId)})`);
  if (options.userAgent)
    lines.push(`  .setUserAgent(${quote(options.userAgent)})`);
  if (options.viewport)
    lines.push(`  .setViewportSize(${options.viewport.width}, ${options.viewport.height})`);
  return lines.join("\n");
}
function formatClickOptions(options) {
  const lines = [];
  if (options.button)
    lines.push(`  .setButton(MouseButton.${options.button.toUpperCase()})`);
  if (options.modifiers)
    lines.push(`  .setModifiers(Arrays.asList(${options.modifiers.map((m) => `KeyboardModifier.${m.toUpperCase()}`).join(", ")}))`);
  if (options.clickCount)
    lines.push(`  .setClickCount(${options.clickCount})`);
  if (options.position)
    lines.push(`  .setPosition(${options.position.x}, ${options.position.y})`);
  if (!lines.length)
    return "";
  lines.unshift(`new Locator.ClickOptions()`);
  return lines.join("\n");
}
function quote(text) {
  return (0, import_utils.escapeWithQuotes)(text, '"');
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JavaLanguageGenerator
});
