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
var tracing_exports = {};
__export(tracing_exports, {
  default: () => tracing_default
});
module.exports = __toCommonJS(tracing_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const tracingStart = (0, import_tool.defineTool)({
  capability: "devtools",
  schema: {
    name: "browser_start_tracing",
    title: "Start tracing",
    description: "Start trace recording",
    inputSchema: import_mcpBundle.z.object({}),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    const tracesDir = await context.outputFile({ prefix: "", suggestedFilename: `traces`, ext: "" }, { origin: "code" });
    const name = "trace-" + Date.now();
    await browserContext.tracing.start({
      name,
      screenshots: true,
      snapshots: true,
      _live: true
    });
    response.addTextResult(`Trace recording started`);
    response.addFileLink("Action log", `${tracesDir}/${name}.trace`);
    response.addFileLink("Network log", `${tracesDir}/${name}.network`);
    response.addFileLink("Resources", `${tracesDir}/resources`);
    browserContext.tracing[traceLegendSymbol] = { tracesDir, name };
  }
});
const tracingStop = (0, import_tool.defineTool)({
  capability: "devtools",
  schema: {
    name: "browser_stop_tracing",
    title: "Stop tracing",
    description: "Stop trace recording",
    inputSchema: import_mcpBundle.z.object({}),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    await browserContext.tracing.stop();
    const traceLegend = browserContext.tracing[traceLegendSymbol];
    response.addTextResult(`Trace recording stopped.`);
    response.addFileLink("Trace", `${traceLegend.tracesDir}/${traceLegend.name}.trace`);
    response.addFileLink("Network log", `${traceLegend.tracesDir}/${traceLegend.name}.network`);
    response.addFileLink("Resources", `${traceLegend.tracesDir}/resources`);
  }
});
var tracing_default = [
  tracingStart,
  tracingStop
];
const traceLegendSymbol = Symbol("tracesDir");
