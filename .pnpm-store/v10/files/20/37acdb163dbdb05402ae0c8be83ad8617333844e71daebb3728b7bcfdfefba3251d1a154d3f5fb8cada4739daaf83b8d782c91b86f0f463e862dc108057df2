"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var install_exports = {};
__export(install_exports, {
  default: () => install_default
});
module.exports = __toCommonJS(install_exports);
var import_child_process = require("child_process");
var import_path = __toESM(require("path"));
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
var import_response = require("../response");
const install = (0, import_tool.defineTool)({
  capability: "core-install",
  schema: {
    name: "browser_install",
    title: "Install the browser specified in the config",
    description: "Install the browser specified in the config. Call this if you get an error about the browser not being installed.",
    inputSchema: import_mcpBundle.z.object({}),
    type: "action"
  },
  handle: async (context, params, response) => {
    const channel = context.config.browser?.launchOptions?.channel ?? context.config.browser?.browserName ?? "chrome";
    const cliPath = import_path.default.join(require.resolve("playwright/package.json"), "../cli.js");
    const child = (0, import_child_process.fork)(cliPath, ["install", channel], {
      stdio: "pipe"
    });
    const output = [];
    child.stdout?.on("data", (data) => output.push(data.toString()));
    child.stderr?.on("data", (data) => output.push(data.toString()));
    await new Promise((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0)
          resolve();
        else
          reject(new Error(`Failed to install browser: ${output.join("")}`));
      });
    });
    const tabHeaders = await Promise.all(context.tabs().map((tab) => tab.headerSnapshot()));
    const result = (0, import_response.renderTabsMarkdown)(tabHeaders);
    response.addTextResult(result.join("\n"));
  }
});
var install_default = [
  install
];
