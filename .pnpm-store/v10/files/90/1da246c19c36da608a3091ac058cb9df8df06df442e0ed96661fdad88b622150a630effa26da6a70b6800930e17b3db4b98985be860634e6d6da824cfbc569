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
var browserBackend_exports = {};
__export(browserBackend_exports, {
  createCustomMessageHandler: () => createCustomMessageHandler
});
module.exports = __toCommonJS(browserBackend_exports);
var import_config = require("../browser/config");
var import_browserServerBackend = require("../browser/browserServerBackend");
var import_tab = require("../browser/tab");
var import_util = require("../../util");
var import_browserContextFactory = require("../browser/browserContextFactory");
function createCustomMessageHandler(testInfo, context) {
  let backend;
  return async (data) => {
    if (data.initialize) {
      if (backend)
        throw new Error("MCP backend is already initialized");
      backend = new import_browserServerBackend.BrowserServerBackend({ ...import_config.defaultConfig, capabilities: ["testing"] }, (0, import_browserContextFactory.identityBrowserContextFactory)(context));
      await backend.initialize(data.initialize.clientInfo);
      const pausedMessage = await generatePausedMessage(testInfo, context);
      return { initialize: { pausedMessage } };
    }
    if (data.listTools) {
      if (!backend)
        throw new Error("MCP backend is not initialized");
      return { listTools: await backend.listTools() };
    }
    if (data.callTool) {
      if (!backend)
        throw new Error("MCP backend is not initialized");
      return { callTool: await backend.callTool(data.callTool.name, data.callTool.arguments) };
    }
    if (data.close) {
      backend?.serverClosed();
      backend = void 0;
      return { close: {} };
    }
    throw new Error("Unknown MCP request");
  };
}
async function generatePausedMessage(testInfo, context) {
  const lines = [];
  if (testInfo.errors.length) {
    lines.push(`### Paused on error:`);
    for (const error of testInfo.errors)
      lines.push((0, import_util.stripAnsiEscapes)(error.message || ""));
  } else {
    lines.push(`### Paused at end of test. ready for interaction`);
  }
  for (let i = 0; i < context.pages().length; i++) {
    const page = context.pages()[i];
    const stateSuffix = context.pages().length > 1 ? i + 1 + " of " + context.pages().length : "state";
    lines.push(
      "",
      `### Page ${stateSuffix}`,
      `- Page URL: ${page.url()}`,
      `- Page Title: ${await page.title()}`.trim()
    );
    let console = testInfo.errors.length ? await import_tab.Tab.collectConsoleMessages(page) : [];
    console = console.filter((msg) => msg.type === "error");
    if (console.length) {
      lines.push("- Console Messages:");
      for (const message of console)
        lines.push(`  - ${message.toString()}`);
    }
    lines.push(
      `- Page Snapshot:`,
      "```yaml",
      (await page._snapshotForAI()).full,
      "```"
    );
  }
  lines.push("");
  if (testInfo.errors.length)
    lines.push(`### Task`, `Try recovering from the error prior to continuing`);
  return lines.join("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCustomMessageHandler
});
