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
var harRouter_exports = {};
__export(harRouter_exports, {
  HarRouter: () => HarRouter
});
module.exports = __toCommonJS(harRouter_exports);
class HarRouter {
  static async create(localUtils, file, notFoundAction, options) {
    const { harId, error } = await localUtils.harOpen({ file });
    if (error)
      throw new Error(error);
    return new HarRouter(localUtils, harId, notFoundAction, options);
  }
  constructor(localUtils, harId, notFoundAction, options) {
    this._localUtils = localUtils;
    this._harId = harId;
    this._options = options;
    this._notFoundAction = notFoundAction;
  }
  async _handle(route) {
    const request = route.request();
    const response = await this._localUtils.harLookup({
      harId: this._harId,
      url: request.url(),
      method: request.method(),
      headers: await request.headersArray(),
      postData: request.postDataBuffer() || void 0,
      isNavigationRequest: request.isNavigationRequest()
    });
    if (response.action === "redirect") {
      route._platform.log("api", `HAR: ${route.request().url()} redirected to ${response.redirectURL}`);
      await route._redirectNavigationRequest(response.redirectURL);
      return;
    }
    if (response.action === "fulfill") {
      if (response.status === -1)
        return;
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers.map((h) => [h.name, h.value])),
        body: response.body
      });
      return;
    }
    if (response.action === "error")
      route._platform.log("api", "HAR: " + response.message);
    if (this._notFoundAction === "abort") {
      await route.abort();
      return;
    }
    await route.fallback();
  }
  async addContextRoute(context) {
    await context.route(this._options.urlMatch || "**/*", (route) => this._handle(route));
  }
  async addPageRoute(page) {
    await page.route(this._options.urlMatch || "**/*", (route) => this._handle(route));
  }
  async [Symbol.asyncDispose]() {
    await this.dispose();
  }
  dispose() {
    this._localUtils.harClose({ harId: this._harId }).catch(() => {
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HarRouter
});
