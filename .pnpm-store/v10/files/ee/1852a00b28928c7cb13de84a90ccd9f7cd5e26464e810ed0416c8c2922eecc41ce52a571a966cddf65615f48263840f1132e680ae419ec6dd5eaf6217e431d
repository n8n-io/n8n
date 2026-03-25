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
var evaluate_exports = {};
__export(evaluate_exports, {
  default: () => evaluate_default
});
module.exports = __toCommonJS(evaluate_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_utils = require("playwright-core/lib/utils");
var import_tool = require("./tool");
const evaluateSchema = import_mcpBundle.z.object({
  function: import_mcpBundle.z.string().describe("() => { /* code */ } or (element) => { /* code */ } when element is provided"),
  element: import_mcpBundle.z.string().optional().describe("Human-readable element description used to obtain permission to interact with the element"),
  ref: import_mcpBundle.z.string().optional().describe("Exact target element reference from the page snapshot"),
  filename: import_mcpBundle.z.string().optional().describe("Filename to save the result to. If not provided, result is returned as JSON string.")
});
const evaluate = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_evaluate",
    title: "Evaluate JavaScript",
    description: "Evaluate JavaScript expression on page or element",
    inputSchema: evaluateSchema,
    type: "action"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    let locator;
    if (params.ref && params.element) {
      locator = await tab.refLocator({ ref: params.ref, element: params.element });
      response.addCode(`await page.${locator.resolved}.evaluate(${(0, import_utils.escapeWithQuotes)(params.function)});`);
    } else {
      response.addCode(`await page.evaluate(${(0, import_utils.escapeWithQuotes)(params.function)});`);
    }
    await tab.waitForCompletion(async () => {
      const receiver = locator?.locator ?? tab.page;
      const result = await receiver._evaluateFunction(params.function);
      const text = JSON.stringify(result, null, 2) || "undefined";
      await response.addResult({ text, suggestedFilename: params.filename });
    });
  }
});
var evaluate_default = [
  evaluate
];
