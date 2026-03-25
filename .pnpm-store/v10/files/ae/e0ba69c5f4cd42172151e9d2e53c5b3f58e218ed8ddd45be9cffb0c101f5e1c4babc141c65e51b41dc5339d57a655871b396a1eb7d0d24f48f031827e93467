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
var cookies_exports = {};
__export(cookies_exports, {
  default: () => cookies_default
});
module.exports = __toCommonJS(cookies_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const cookieList = (0, import_tool.defineTool)({
  capability: "storage",
  schema: {
    name: "browser_cookie_list",
    title: "List cookies",
    description: "List all cookies (optionally filtered by domain/path)",
    inputSchema: import_mcpBundle.z.object({
      domain: import_mcpBundle.z.string().optional().describe("Filter cookies by domain"),
      path: import_mcpBundle.z.string().optional().describe("Filter cookies by path")
    }),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    let cookies = await browserContext.cookies();
    if (params.domain)
      cookies = cookies.filter((c) => c.domain.includes(params.domain));
    if (params.path)
      cookies = cookies.filter((c) => c.path.startsWith(params.path));
    if (cookies.length === 0)
      response.addTextResult("No cookies found");
    else
      response.addTextResult(cookies.map((c) => `${c.name}=${c.value} (domain: ${c.domain}, path: ${c.path})`).join("\n"));
    response.addCode(`await page.context().cookies();`);
  }
});
const cookieGet = (0, import_tool.defineTool)({
  capability: "storage",
  schema: {
    name: "browser_cookie_get",
    title: "Get cookie",
    description: "Get a specific cookie by name",
    inputSchema: import_mcpBundle.z.object({
      name: import_mcpBundle.z.string().describe("Cookie name to get")
    }),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    const cookies = await browserContext.cookies();
    const cookie = cookies.find((c) => c.name === params.name);
    if (!cookie)
      response.addTextResult(`Cookie '${params.name}' not found`);
    else
      response.addTextResult(`${cookie.name}=${cookie.value} (domain: ${cookie.domain}, path: ${cookie.path}, httpOnly: ${cookie.httpOnly}, secure: ${cookie.secure}, sameSite: ${cookie.sameSite})`);
    response.addCode(`await page.context().cookies();`);
  }
});
const cookieSet = (0, import_tool.defineTool)({
  capability: "storage",
  schema: {
    name: "browser_cookie_set",
    title: "Set cookie",
    description: "Set a cookie with optional flags (domain, path, expires, httpOnly, secure, sameSite)",
    inputSchema: import_mcpBundle.z.object({
      name: import_mcpBundle.z.string().describe("Cookie name"),
      value: import_mcpBundle.z.string().describe("Cookie value"),
      domain: import_mcpBundle.z.string().optional().describe("Cookie domain"),
      path: import_mcpBundle.z.string().optional().describe("Cookie path"),
      expires: import_mcpBundle.z.number().optional().describe("Cookie expiration as Unix timestamp"),
      httpOnly: import_mcpBundle.z.boolean().optional().describe("Whether the cookie is HTTP only"),
      secure: import_mcpBundle.z.boolean().optional().describe("Whether the cookie is secure"),
      sameSite: import_mcpBundle.z.enum(["Strict", "Lax", "None"]).optional().describe("Cookie SameSite attribute")
    }),
    type: "action"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    const tab = await context.ensureTab();
    const url = new URL(tab.page.url());
    const cookie = {
      name: params.name,
      value: params.value,
      domain: params.domain || url.hostname,
      path: params.path || "/"
    };
    if (params.expires !== void 0)
      cookie.expires = params.expires;
    if (params.httpOnly !== void 0)
      cookie.httpOnly = params.httpOnly;
    if (params.secure !== void 0)
      cookie.secure = params.secure;
    if (params.sameSite !== void 0)
      cookie.sameSite = params.sameSite;
    await browserContext.addCookies([cookie]);
    response.addCode(`await page.context().addCookies([${JSON.stringify(cookie)}]);`);
  }
});
const cookieDelete = (0, import_tool.defineTool)({
  capability: "storage",
  schema: {
    name: "browser_cookie_delete",
    title: "Delete cookie",
    description: "Delete a specific cookie",
    inputSchema: import_mcpBundle.z.object({
      name: import_mcpBundle.z.string().describe("Cookie name to delete")
    }),
    type: "action"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    await browserContext.clearCookies({ name: params.name });
    response.addCode(`await page.context().clearCookies({ name: '${params.name}' });`);
  }
});
const cookieClear = (0, import_tool.defineTool)({
  capability: "storage",
  schema: {
    name: "browser_cookie_clear",
    title: "Clear cookies",
    description: "Clear all cookies",
    inputSchema: import_mcpBundle.z.object({}),
    type: "action"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    await browserContext.clearCookies();
    response.addCode(`await page.context().clearCookies();`);
  }
});
var cookies_default = [
  cookieList,
  cookieGet,
  cookieSet,
  cookieDelete,
  cookieClear
];
