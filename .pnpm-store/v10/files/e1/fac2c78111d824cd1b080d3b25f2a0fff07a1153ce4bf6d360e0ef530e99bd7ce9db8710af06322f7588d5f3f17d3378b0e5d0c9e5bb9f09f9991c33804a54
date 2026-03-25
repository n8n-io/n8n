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
var navigate_exports = {};
__export(navigate_exports, {
  default: () => navigate_default
});
module.exports = __toCommonJS(navigate_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const navigate = (0, import_tool.defineTool)({
  capability: "core",
  schema: {
    name: "browser_navigate",
    title: "Navigate to a URL",
    description: "Navigate to a URL",
    inputSchema: import_mcpBundle.z.object({
      url: import_mcpBundle.z.string().describe("The URL to navigate to")
    }),
    type: "action"
  },
  handle: async (context, params, response) => {
    const tab = await context.ensureTab();
    let url = params.url;
    try {
      new URL(url);
    } catch (e) {
      if (url.startsWith("localhost"))
        url = "http://" + url;
      else
        url = "https://" + url;
    }
    await tab.navigate(url);
    response.setIncludeSnapshot();
    response.addCode(`await page.goto('${params.url}');`);
  }
});
const goBack = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_navigate_back",
    title: "Go back",
    description: "Go back to the previous page",
    inputSchema: import_mcpBundle.z.object({}),
    type: "action"
  },
  handle: async (tab, params, response) => {
    await tab.page.goBack();
    response.setIncludeSnapshot();
    response.addCode(`await page.goBack();`);
  }
});
var navigate_default = [
  navigate,
  goBack
];
