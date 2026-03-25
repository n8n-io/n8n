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
  Playwright: () => Playwright
});
module.exports = __toCommonJS(playwright_exports);
var import_android = require("./android");
var import_browser = require("./browser");
var import_browserType = require("./browserType");
var import_channelOwner = require("./channelOwner");
var import_electron = require("./electron");
var import_errors = require("./errors");
var import_fetch = require("./fetch");
var import_selectors = require("./selectors");
class Playwright extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this.request = new import_fetch.APIRequest(this);
    this.chromium = import_browserType.BrowserType.from(initializer.chromium);
    this.chromium._playwright = this;
    this.firefox = import_browserType.BrowserType.from(initializer.firefox);
    this.firefox._playwright = this;
    this.webkit = import_browserType.BrowserType.from(initializer.webkit);
    this.webkit._playwright = this;
    this._android = import_android.Android.from(initializer.android);
    this._android._playwright = this;
    this._electron = import_electron.Electron.from(initializer.electron);
    this._electron._playwright = this;
    this.devices = this._connection.localUtils()?.devices ?? {};
    this.selectors = new import_selectors.Selectors(this._connection._platform);
    this.errors = { TimeoutError: import_errors.TimeoutError };
  }
  static from(channel) {
    return channel._object;
  }
  _browserTypes() {
    return [this.chromium, this.firefox, this.webkit];
  }
  _preLaunchedBrowser() {
    const browser = import_browser.Browser.from(this._initializer.preLaunchedBrowser);
    browser._connectToBrowserType(this[browser._name], {}, void 0);
    return browser;
  }
  _allContexts() {
    return this._browserTypes().flatMap((type) => [...type._contexts]);
  }
  _allPages() {
    return this._allContexts().flatMap((context) => context.pages());
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Playwright
});
