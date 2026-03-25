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
var playwright_exports = {};
__export(playwright_exports, {
  Playwright: () => Playwright,
  createPlaywright: () => createPlaywright
});
module.exports = __toCommonJS(playwright_exports);
var import_android = require("./android/android");
var import_backendAdb = require("./android/backendAdb");
var import_bidiChromium = require("./bidi/bidiChromium");
var import_bidiFirefox = require("./bidi/bidiFirefox");
var import_chromium = require("./chromium/chromium");
var import_debugController = require("./debugController");
var import_electron = require("./electron/electron");
var import_firefox = require("./firefox/firefox");
var import_instrumentation = require("./instrumentation");
var import_webkit = require("./webkit/webkit");
class Playwright extends import_instrumentation.SdkObject {
  constructor(options) {
    super((0, import_instrumentation.createRootSdkObject)(), void 0, "Playwright");
    this._allPages = /* @__PURE__ */ new Set();
    this._allBrowsers = /* @__PURE__ */ new Set();
    this.options = options;
    this.attribution.playwright = this;
    this.instrumentation.addListener({
      onBrowserOpen: (browser) => this._allBrowsers.add(browser),
      onBrowserClose: (browser) => this._allBrowsers.delete(browser),
      onPageOpen: (page) => this._allPages.add(page),
      onPageClose: (page) => this._allPages.delete(page)
    }, null);
    this.chromium = new import_chromium.Chromium(this, new import_bidiChromium.BidiChromium(this));
    this.firefox = new import_firefox.Firefox(this, new import_bidiFirefox.BidiFirefox(this));
    this.webkit = new import_webkit.WebKit(this);
    this.electron = new import_electron.Electron(this);
    this.android = new import_android.Android(this, new import_backendAdb.AdbBackend());
    this.debugController = new import_debugController.DebugController(this);
  }
  allBrowsers() {
    return [...this._allBrowsers];
  }
  allPages() {
    return [...this._allPages];
  }
}
function createPlaywright(options) {
  return new Playwright(options);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Playwright,
  createPlaywright
});
