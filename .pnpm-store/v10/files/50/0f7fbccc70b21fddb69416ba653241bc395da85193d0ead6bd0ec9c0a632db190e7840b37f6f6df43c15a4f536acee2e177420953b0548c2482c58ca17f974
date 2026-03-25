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
var webstorage_exports = {};
__export(webstorage_exports, {
  default: () => webstorage_default
});
module.exports = __toCommonJS(webstorage_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const localStorageList = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_localstorage_list",
    title: "List localStorage",
    description: "List all localStorage key-value pairs",
    inputSchema: import_mcpBundle.z.object({}),
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    const items = await tab.page.evaluate(() => {
      const result = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null)
          result.push({ key, value: localStorage.getItem(key) || "" });
      }
      return result;
    });
    if (items.length === 0)
      response.addTextResult("No localStorage items found");
    else
      response.addTextResult(items.map((item) => `${item.key}=${item.value}`).join("\n"));
    response.addCode(`await page.evaluate(() => ({ ...localStorage }));`);
  }
});
const localStorageGet = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_localstorage_get",
    title: "Get localStorage item",
    description: "Get a localStorage item by key",
    inputSchema: import_mcpBundle.z.object({
      key: import_mcpBundle.z.string().describe("Key to get")
    }),
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    const value = await tab.page.evaluate((key) => localStorage.getItem(key), params.key);
    if (value === null)
      response.addTextResult(`localStorage key '${params.key}' not found`);
    else
      response.addTextResult(`${params.key}=${value}`);
    response.addCode(`await page.evaluate(() => localStorage.getItem('${params.key}'));`);
  }
});
const localStorageSet = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_localstorage_set",
    title: "Set localStorage item",
    description: "Set a localStorage item",
    inputSchema: import_mcpBundle.z.object({
      key: import_mcpBundle.z.string().describe("Key to set"),
      value: import_mcpBundle.z.string().describe("Value to set")
    }),
    type: "action"
  },
  handle: async (tab, params, response) => {
    await tab.page.evaluate(({ key, value }) => localStorage.setItem(key, value), params);
    response.addCode(`await page.evaluate(() => localStorage.setItem('${params.key}', '${params.value}'));`);
  }
});
const localStorageDelete = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_localstorage_delete",
    title: "Delete localStorage item",
    description: "Delete a localStorage item",
    inputSchema: import_mcpBundle.z.object({
      key: import_mcpBundle.z.string().describe("Key to delete")
    }),
    type: "action"
  },
  handle: async (tab, params, response) => {
    await tab.page.evaluate((key) => localStorage.removeItem(key), params.key);
    response.addCode(`await page.evaluate(() => localStorage.removeItem('${params.key}'));`);
  }
});
const localStorageClear = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_localstorage_clear",
    title: "Clear localStorage",
    description: "Clear all localStorage",
    inputSchema: import_mcpBundle.z.object({}),
    type: "action"
  },
  handle: async (tab, params, response) => {
    await tab.page.evaluate(() => localStorage.clear());
    response.addCode(`await page.evaluate(() => localStorage.clear());`);
  }
});
const sessionStorageList = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_sessionstorage_list",
    title: "List sessionStorage",
    description: "List all sessionStorage key-value pairs",
    inputSchema: import_mcpBundle.z.object({}),
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    const items = await tab.page.evaluate(() => {
      const result = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key !== null)
          result.push({ key, value: sessionStorage.getItem(key) || "" });
      }
      return result;
    });
    if (items.length === 0)
      response.addTextResult("No sessionStorage items found");
    else
      response.addTextResult(items.map((item) => `${item.key}=${item.value}`).join("\n"));
    response.addCode(`await page.evaluate(() => ({ ...sessionStorage }));`);
  }
});
const sessionStorageGet = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_sessionstorage_get",
    title: "Get sessionStorage item",
    description: "Get a sessionStorage item by key",
    inputSchema: import_mcpBundle.z.object({
      key: import_mcpBundle.z.string().describe("Key to get")
    }),
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    const value = await tab.page.evaluate((key) => sessionStorage.getItem(key), params.key);
    if (value === null)
      response.addTextResult(`sessionStorage key '${params.key}' not found`);
    else
      response.addTextResult(`${params.key}=${value}`);
    response.addCode(`await page.evaluate(() => sessionStorage.getItem('${params.key}'));`);
  }
});
const sessionStorageSet = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_sessionstorage_set",
    title: "Set sessionStorage item",
    description: "Set a sessionStorage item",
    inputSchema: import_mcpBundle.z.object({
      key: import_mcpBundle.z.string().describe("Key to set"),
      value: import_mcpBundle.z.string().describe("Value to set")
    }),
    type: "action"
  },
  handle: async (tab, params, response) => {
    await tab.page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), params);
    response.addCode(`await page.evaluate(() => sessionStorage.setItem('${params.key}', '${params.value}'));`);
  }
});
const sessionStorageDelete = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_sessionstorage_delete",
    title: "Delete sessionStorage item",
    description: "Delete a sessionStorage item",
    inputSchema: import_mcpBundle.z.object({
      key: import_mcpBundle.z.string().describe("Key to delete")
    }),
    type: "action"
  },
  handle: async (tab, params, response) => {
    await tab.page.evaluate((key) => sessionStorage.removeItem(key), params.key);
    response.addCode(`await page.evaluate(() => sessionStorage.removeItem('${params.key}'));`);
  }
});
const sessionStorageClear = (0, import_tool.defineTabTool)({
  capability: "storage",
  schema: {
    name: "browser_sessionstorage_clear",
    title: "Clear sessionStorage",
    description: "Clear all sessionStorage",
    inputSchema: import_mcpBundle.z.object({}),
    type: "action"
  },
  handle: async (tab, params, response) => {
    await tab.page.evaluate(() => sessionStorage.clear());
    response.addCode(`await page.evaluate(() => sessionStorage.clear());`);
  }
});
var webstorage_default = [
  localStorageList,
  localStorageGet,
  localStorageSet,
  localStorageDelete,
  localStorageClear,
  sessionStorageList,
  sessionStorageGet,
  sessionStorageSet,
  sessionStorageDelete,
  sessionStorageClear
];
