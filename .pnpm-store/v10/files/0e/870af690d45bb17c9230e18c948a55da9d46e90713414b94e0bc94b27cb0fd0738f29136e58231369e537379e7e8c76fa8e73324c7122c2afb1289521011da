"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var testBackend_exports = {};
__export(testBackend_exports, {
  TestServerBackend: () => TestServerBackend
});
module.exports = __toCommonJS(testBackend_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var mcp = __toESM(require("../sdk/exports"));
var import_testContext = require("./testContext");
var testTools = __toESM(require("./testTools.js"));
var generatorTools = __toESM(require("./generatorTools.js"));
var plannerTools = __toESM(require("./plannerTools.js"));
var import_tools = require("../browser/tools");
class TestServerBackend {
  constructor(configPath, options) {
    this.name = "Playwright";
    this.version = "0.0.1";
    this._tools = [
      plannerTools.saveTestPlan,
      plannerTools.setupPage,
      plannerTools.submitTestPlan,
      generatorTools.setupPage,
      generatorTools.generatorReadLog,
      generatorTools.generatorWriteTest,
      testTools.listTests,
      testTools.runTests,
      testTools.debugTest,
      ...import_tools.browserTools.map((tool) => wrapBrowserTool(tool))
    ];
    this._options = options || {};
    this._configPath = configPath;
  }
  async initialize(clientInfo) {
    this._context = new import_testContext.TestContext(clientInfo, this._configPath, this._options);
  }
  async listTools() {
    return this._tools.map((tool) => mcp.toMcpTool(tool.schema));
  }
  async callTool(name, args) {
    const tool = this._tools.find((tool2) => tool2.schema.name === name);
    if (!tool)
      throw new Error(`Tool not found: ${name}. Available tools: ${this._tools.map((tool2) => tool2.schema.name).join(", ")}`);
    try {
      return await tool.handle(this._context, tool.schema.inputSchema.parse(args || {}));
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
  serverClosed() {
    void this._context?.close();
  }
}
const typesWithIntent = ["action", "assertion", "input"];
function wrapBrowserTool(tool) {
  const inputSchema = typesWithIntent.includes(tool.schema.type) ? tool.schema.inputSchema.extend({
    intent: import_mcpBundle.z.string().describe("The intent of the call, for example the test step description plan idea")
  }) : tool.schema.inputSchema;
  return {
    schema: {
      ...tool.schema,
      inputSchema
    },
    handle: async (context, params) => {
      const response = await context.sendMessageToPausedTest({ callTool: { name: tool.schema.name, arguments: params } });
      return response.callTool;
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TestServerBackend
});
