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
var open_exports = {};
__export(open_exports, {
  default: () => open_default
});
module.exports = __toCommonJS(open_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const open = (0, import_tool.defineTool)({
  capability: "internal",
  schema: {
    name: "browser_open",
    title: "Open URL",
    description: "Open a URL in the browser",
    inputSchema: import_mcpBundle.z.object({
      url: import_mcpBundle.z.string().describe("The URL to open"),
      headed: import_mcpBundle.z.boolean().optional().describe("Run browser in headed mode")
    }),
    type: "action"
  },
  handle: async (context, params, response) => {
    const forceHeadless = params.headed ? "headed" : "headless";
    const tab = await context.ensureTab({ forceHeadless });
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
var open_default = [
  open
];
