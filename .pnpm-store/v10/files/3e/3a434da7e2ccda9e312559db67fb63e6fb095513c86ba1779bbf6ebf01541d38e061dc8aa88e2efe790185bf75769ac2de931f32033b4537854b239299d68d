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
  default: () => network_default,
  isFetch: () => isFetch,
  renderRequest: () => renderRequest
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
      if (!params.includeStatic && !isFetch(request) && isSuccessfulResponse(request))
        continue;
      text.push(await renderRequest(request));
    }
    await response.addResult("Network", text.join("\n"), { prefix: "network", ext: "log", suggestedFilename: params.filename });
  }
});
const networkClear = (0, import_tool.defineTabTool)({
  capability: "core",
  skillOnly: true,
  schema: {
    name: "browser_network_clear",
    title: "Clear network requests",
    description: "Clear all network requests",
    inputSchema: import_mcpBundle.z.object({}),
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    await tab.clearRequests();
  }
});
function isSuccessfulResponse(request) {
  if (request.failure())
    return false;
  const response = request.existingResponse();
  return !!response && response.status() < 400;
}
function isFetch(request) {
  return ["fetch", "xhr"].includes(request.resourceType());
}
async function renderRequest(request) {
  const response = request.existingResponse();
  const result = [];
  result.push(`[${request.method().toUpperCase()}] ${request.url()}`);
  if (response)
    result.push(`=> [${response.status()}] ${response.statusText()}`);
  else if (request.failure())
    result.push(`=> [FAILED] ${request.failure()?.errorText ?? "Unknown error"}`);
  return result.join(" ");
}
var network_default = [
  requests,
  networkClear
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isFetch,
  renderRequest
});
