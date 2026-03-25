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
var wait_exports = {};
__export(wait_exports, {
  default: () => wait_default
});
module.exports = __toCommonJS(wait_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const wait = (0, import_tool.defineTool)({
  capability: "core",
  schema: {
    name: "browser_wait_for",
    title: "Wait for",
    description: "Wait for text to appear or disappear or a specified time to pass",
    inputSchema: import_mcpBundle.z.object({
      time: import_mcpBundle.z.number().optional().describe("The time to wait in seconds"),
      text: import_mcpBundle.z.string().optional().describe("The text to wait for"),
      textGone: import_mcpBundle.z.string().optional().describe("The text to wait for to disappear")
    }),
    type: "assertion"
  },
  handle: async (context, params, response) => {
    if (!params.text && !params.textGone && !params.time)
      throw new Error("Either time, text or textGone must be provided");
    if (params.time) {
      response.addCode(`await new Promise(f => setTimeout(f, ${params.time} * 1000));`);
      await new Promise((f) => setTimeout(f, Math.min(3e4, params.time * 1e3)));
    }
    const tab = context.currentTabOrDie();
    const locator = params.text ? tab.page.getByText(params.text).first() : void 0;
    const goneLocator = params.textGone ? tab.page.getByText(params.textGone).first() : void 0;
    if (goneLocator) {
      response.addCode(`await page.getByText(${JSON.stringify(params.textGone)}).first().waitFor({ state: 'hidden' });`);
      await goneLocator.waitFor({ state: "hidden" });
    }
    if (locator) {
      response.addCode(`await page.getByText(${JSON.stringify(params.text)}).first().waitFor({ state: 'visible' });`);
      await locator.waitFor({ state: "visible" });
    }
    response.addTextResult(`Waited for ${params.text || params.textGone || params.time}`);
    response.setIncludeSnapshot();
  }
});
var wait_default = [
  wait
];
