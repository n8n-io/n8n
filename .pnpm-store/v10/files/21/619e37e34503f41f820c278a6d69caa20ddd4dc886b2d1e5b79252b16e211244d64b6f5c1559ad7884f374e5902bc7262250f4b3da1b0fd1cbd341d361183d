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
var network_exports = {};
__export(network_exports, {
  default: () => network_default
});
module.exports = __toCommonJS(network_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const requests = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_network_requests",
    title: "List network requests",
    description: "Returns all network requests since loading the page",
    inputSchema: import_mcpBundle.z.object({
      includeStatic: import_mcpBundle.z.boolean().default(false).describe("Whether to include successful static resources like images, fonts, scripts, etc. Defaults to false."),
      filename: import_mcpBundle.z.string().optional().describe("Filename to save the network requests to. If not provided, requests are returned as text.")
    }),
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    const requests2 = await tab.requests();
    const text = [];
    for (const request of requests2) {
      const rendered = await renderRequest(request, params.includeStatic);
      if (rendered)
        text.push(rendered);
    }
    await response.addResult({ text: text.join("\n"), suggestedFilename: params.filename });
  }
});
async function renderRequest(request, includeStatic) {
  const response = request._hasResponse ? await request.response() : void 0;
  const isStaticRequest = ["document", "stylesheet", "image", "media", "font", "script", "manifest"].includes(request.resourceType());
  const isSuccessfulRequest = !response || response.status() < 400;
  if (isStaticRequest && isSuccessfulRequest && !includeStatic)
    return void 0;
  const result = [];
  result.push(`[${request.method().toUpperCase()}] ${request.url()}`);
  if (response)
    result.push(`=> [${response.status()}] ${response.statusText()}`);
  return result.join(" ");
}
var network_default = [
  requests
];
