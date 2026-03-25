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
var pageAgent_exports = {};
__export(pageAgent_exports, {
  PageAgent: () => PageAgent
});
module.exports = __toCommonJS(pageAgent_exports);
var import_channelOwner = require("./channelOwner");
var import_events = require("./events");
var import_page = require("./page");
class PageAgent extends import_channelOwner.ChannelOwner {
  static from(channel) {
    return channel._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._page = import_page.Page.from(initializer.page);
    this._channel.on("turn", (params) => this.emit(import_events.Events.PageAgent.Turn, params));
  }
  async expect(expectation, options = {}) {
    const timeout = options.timeout ?? this._expectTimeout ?? 5e3;
    await this._channel.expect({ expectation, ...options, timeout });
  }
  async perform(task, options = {}) {
    const timeout = this._page._timeoutSettings.timeout(options);
    const { usage } = await this._channel.perform({ task, ...options, timeout });
    return { usage };
  }
  async extract(query, schema, options = {}) {
    const timeout = this._page._timeoutSettings.timeout(options);
    const { result, usage } = await this._channel.extract({ query, schema: this._page._platform.zodToJsonSchema(schema), ...options, timeout });
    return { result, usage };
  }
  async usage() {
    const { usage } = await this._channel.usage({});
    return usage;
  }
  async dispose() {
    await this._channel.dispose();
  }
  async [Symbol.asyncDispose]() {
    await this.dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PageAgent
});
