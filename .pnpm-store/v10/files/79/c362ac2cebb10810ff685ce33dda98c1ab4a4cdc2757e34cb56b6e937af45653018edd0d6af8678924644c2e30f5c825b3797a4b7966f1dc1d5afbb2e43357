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
var storage_exports = {};
__export(storage_exports, {
  default: () => storage_default
});
module.exports = __toCommonJS(storage_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const storageState = (0, import_tool.defineTool)({
  capability: "storage",
  schema: {
    name: "browser_storage_state",
    title: "Save storage state",
    description: "Save storage state (cookies, local storage) to a file for later reuse",
    inputSchema: import_mcpBundle.z.object({
      filename: import_mcpBundle.z.string().optional().describe("File name to save the storage state to. Defaults to `storage-state-{timestamp}.json` if not specified.")
    }),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    const state = await browserContext.storageState();
    const serializedState = JSON.stringify(state, null, 2);
    const resolvedFile = await response.resolveClientFile({ prefix: "storage-state", ext: "json", suggestedFilename: params.filename }, "Storage state");
    response.addCode(`await page.context().storageState({ path: '${resolvedFile.relativeName}' });`);
    await response.addFileResult(resolvedFile, serializedState);
  }
});
const setStorageState = (0, import_tool.defineTool)({
  capability: "storage",
  schema: {
    name: "browser_set_storage_state",
    title: "Restore storage state",
    description: "Restore storage state (cookies, local storage) from a file. This clears existing cookies and local storage before restoring.",
    inputSchema: import_mcpBundle.z.object({
      filename: import_mcpBundle.z.string().describe("Path to the storage state file to restore from")
    }),
    type: "action"
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    await browserContext.setStorageState(params.filename);
    response.addTextResult(`Storage state restored from ${params.filename}`);
    response.addCode(`await page.context().setStorageState('${params.filename}');`);
  }
});
var storage_default = [
  storageState,
  setStorageState
];
