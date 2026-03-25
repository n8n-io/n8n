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
var common_exports = {};
__export(common_exports, {
  default: () => common_default
});
module.exports = __toCommonJS(common_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
var import_response = require("../response");
const close = (0, import_tool.defineTool)({
  capability: "core",
  schema: {
    name: "browser_close",
    title: "Close browser",
    description: "Close the page",
    inputSchema: import_mcpBundle.z.object({}),
    type: "action"
  },
  handle: async (context, params, response) => {
    await context.closeBrowserContext();
    const result = (0, import_response.renderTabsMarkdown)([]);
    response.addTextResult(result.join("\n"));
    response.addCode(`await page.close()`);
  }
});
const resize = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_resize",
    title: "Resize browser window",
    description: "Resize the browser window",
    inputSchema: import_mcpBundle.z.object({
      width: import_mcpBundle.z.number().describe("Width of the browser window"),
      height: import_mcpBundle.z.number().describe("Height of the browser window")
    }),
    type: "action"
  },
  handle: async (tab, params, response) => {
    response.addCode(`await page.setViewportSize({ width: ${params.width}, height: ${params.height} });`);
    await tab.waitForCompletion(async () => {
      await tab.page.setViewportSize({ width: params.width, height: params.height });
    });
  }
});
var common_default = [
  close,
  resize
];
