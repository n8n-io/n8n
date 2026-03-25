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
var console_exports = {};
__export(console_exports, {
  default: () => console_default
});
module.exports = __toCommonJS(console_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const console = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_console_messages",
    title: "Get console messages",
    description: "Returns all console messages",
    inputSchema: import_mcpBundle.z.object({
      level: import_mcpBundle.z.enum(["error", "warning", "info", "debug"]).default("info").describe('Level of the console messages to return. Each level includes the messages of more severe levels. Defaults to "info".'),
      filename: import_mcpBundle.z.string().optional().describe("Filename to save the console messages to. If not provided, messages are returned as text.")
    }),
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    const messages = await tab.consoleMessages(params.level);
    const text = messages.map((message) => message.toString()).join("\n");
    await response.addResult({ text, suggestedFilename: params.filename });
  }
});
var console_default = [
  console
];
