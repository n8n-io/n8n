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
var browserServerBackend_exports = {};
__export(browserServerBackend_exports, {
  BrowserServerBackend: () => BrowserServerBackend
});
module.exports = __toCommonJS(browserServerBackend_exports);
var import_context = require("./context");
var import_log = require("../log");
var import_response = require("./response");
var import_sessionLog = require("./sessionLog");
var import_tools = require("./tools");
var import_tool = require("../sdk/tool");
class BrowserServerBackend {
  constructor(config, factory) {
    this._config = config;
    this._browserContextFactory = factory;
    this._tools = (0, import_tools.filteredTools)(config);
  }
  async initialize(clientInfo) {
    this._sessionLog = this._config.saveSession ? await import_sessionLog.SessionLog.create(this._config, clientInfo) : void 0;
    this._context = new import_context.Context({
      config: this._config,
      browserContextFactory: this._browserContextFactory,
      sessionLog: this._sessionLog,
      clientInfo
    });
  }
  async listTools() {
    return this._tools.map((tool) => (0, import_tool.toMcpTool)(tool.schema));
  }
  async callTool(name, rawArguments) {
    const tool = this._tools.find((tool2) => tool2.schema.name === name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `### Error
Tool "${name}" not found` }],
        isError: true
      };
    }
    const parsedArguments = tool.schema.inputSchema.parse(rawArguments || {});
    const context = this._context;
    const response = import_response.Response.create(context, name, parsedArguments);
    context.setRunningTool(name);
    let responseObject;
    try {
      await tool.handle(context, parsedArguments, response);
      responseObject = await response.build();
      this._sessionLog?.logResponse(name, parsedArguments, responseObject);
    } catch (error) {
      return {
        content: [{ type: "text", text: `### Error
${String(error)}` }],
        isError: true
      };
    } finally {
      context.setRunningTool(void 0);
    }
    return responseObject;
  }
  serverClosed() {
    void this._context?.dispose().catch(import_log.logUnhandledError);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserServerBackend
});
