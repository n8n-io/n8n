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
var route_exports = {};
__export(route_exports, {
  default: () => route_default
});
module.exports = __toCommonJS(route_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const route = (0, import_tool.defineTool)({
  capability: "network",
  schema: {
    name: "browser_route",
    title: "Mock network requests",
    description: "Set up a route to mock network requests matching a URL pattern",
    inputSchema: import_mcpBundle.z.object({
      pattern: import_mcpBundle.z.string().describe('URL pattern to match (e.g., "**/api/users", "**/*.{png,jpg}")'),
      status: import_mcpBundle.z.number().optional().describe("HTTP status code to return (default: 200)"),
      body: import_mcpBundle.z.string().optional().describe("Response body (text or JSON string)"),
      contentType: import_mcpBundle.z.string().optional().describe('Content-Type header (e.g., "application/json", "text/html")'),
      headers: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe('Headers to add in "Name: Value" format'),
      removeHeaders: import_mcpBundle.z.string().optional().describe("Comma-separated list of header names to remove from request")
    }),
    type: "action"
  },
  handle: async (context, params, response) => {
    const addHeaders = params.headers ? Object.fromEntries(params.headers.map((h) => {
      const colonIndex = h.indexOf(":");
      return [h.substring(0, colonIndex).trim(), h.substring(colonIndex + 1).trim()];
    })) : void 0;
    const removeHeaders = params.removeHeaders ? params.removeHeaders.split(",").map((h) => h.trim()) : void 0;
    const handler = async (route2) => {
      if (params.body !== void 0 || params.status !== void 0) {
        await route2.fulfill({
          status: params.status ?? 200,
          contentType: params.contentType,
          body: params.body
        });
        return;
      }
      const headers = { ...route2.request().headers() };
      if (addHeaders) {
        for (const [key, value] of Object.entries(addHeaders))
          headers[key] = value;
      }
      if (removeHeaders) {
        for (const header of removeHeaders)
          delete headers[header.toLowerCase()];
      }
      await route2.continue({ headers });
    };
    const entry = {
      pattern: params.pattern,
      status: params.status,
      body: params.body,
      contentType: params.contentType,
      addHeaders,
      removeHeaders,
      handler
    };
    await context.addRoute(entry);
    response.addTextResult(`Route added for pattern: ${params.pattern}`);
    response.addCode(`await page.context().route('${params.pattern}', async route => { /* route handler */ });`);
  }
});
const routeList = (0, import_tool.defineTool)({
  capability: "network",
  schema: {
    name: "browser_route_list",
    title: "List network routes",
    description: "List all active network routes",
    inputSchema: import_mcpBundle.z.object({}),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    const routes = context.routes();
    if (routes.length === 0) {
      response.addTextResult("No active routes");
      return;
    }
    const lines = [];
    for (let i = 0; i < routes.length; i++) {
      const route2 = routes[i];
      const details = [];
      if (route2.status !== void 0)
        details.push(`status=${route2.status}`);
      if (route2.body !== void 0)
        details.push(`body=${route2.body.length > 50 ? route2.body.substring(0, 50) + "..." : route2.body}`);
      if (route2.contentType)
        details.push(`contentType=${route2.contentType}`);
      if (route2.addHeaders)
        details.push(`addHeaders=${JSON.stringify(route2.addHeaders)}`);
      if (route2.removeHeaders)
        details.push(`removeHeaders=${route2.removeHeaders.join(",")}`);
      const detailsStr = details.length ? ` (${details.join(", ")})` : "";
      lines.push(`${i + 1}. ${route2.pattern}${detailsStr}`);
    }
    response.addTextResult(lines.join("\n"));
  }
});
const unroute = (0, import_tool.defineTool)({
  capability: "network",
  schema: {
    name: "browser_unroute",
    title: "Remove network routes",
    description: "Remove network routes matching a pattern (or all routes if no pattern specified)",
    inputSchema: import_mcpBundle.z.object({
      pattern: import_mcpBundle.z.string().optional().describe("URL pattern to unroute (omit to remove all routes)")
    }),
    type: "action"
  },
  handle: async (context, params, response) => {
    const removed = await context.removeRoute(params.pattern);
    if (params.pattern)
      response.addTextResult(`Removed ${removed} route(s) for pattern: ${params.pattern}`);
    else
      response.addTextResult(`Removed all ${removed} route(s)`);
  }
});
var route_default = [
  route,
  routeList,
  unroute
];
