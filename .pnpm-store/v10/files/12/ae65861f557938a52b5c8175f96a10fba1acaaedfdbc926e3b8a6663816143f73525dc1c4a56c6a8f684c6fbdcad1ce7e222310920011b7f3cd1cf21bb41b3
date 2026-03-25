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
var tabs_exports = {};
__export(tabs_exports, {
  default: () => tabs_default
});
module.exports = __toCommonJS(tabs_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
var import_response = require("../response");
const browserTabs = (0, import_tool.defineTool)({
  capability: "core-tabs",
  schema: {
    name: "browser_tabs",
    title: "Manage tabs",
    description: "List, create, close, or select a browser tab.",
    inputSchema: import_mcpBundle.z.object({
      action: import_mcpBundle.z.enum(["list", "new", "close", "select"]).describe("Operation to perform"),
      index: import_mcpBundle.z.number().optional().describe("Tab index, used for close/select. If omitted for close, current tab is closed.")
    }),
    type: "action"
  },
  handle: async (context, params, response) => {
    switch (params.action) {
      case "list": {
        await context.ensureTab();
        break;
      }
      case "new": {
        await context.newTab();
        break;
      }
      case "close": {
        await context.closeTab(params.index);
        break;
      }
      case "select": {
        if (params.index === void 0)
          throw new Error("Tab index is required");
        await context.selectTab(params.index);
        break;
      }
    }
    const tabHeaders = await Promise.all(context.tabs().map((tab) => tab.headerSnapshot()));
    const result = (0, import_response.renderTabsMarkdown)(tabHeaders);
    response.addTextResult(result.join("\n"));
  }
});
var tabs_default = [
  browserTabs
];
