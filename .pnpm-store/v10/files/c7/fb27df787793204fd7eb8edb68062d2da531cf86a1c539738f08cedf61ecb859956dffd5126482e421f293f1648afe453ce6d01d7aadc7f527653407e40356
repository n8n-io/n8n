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
var keyboard_exports = {};
__export(keyboard_exports, {
  default: () => keyboard_default
});
module.exports = __toCommonJS(keyboard_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
var import_snapshot = require("./snapshot");
const pressKey = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_press_key",
    title: "Press a key",
    description: "Press a key on the keyboard",
    inputSchema: import_mcpBundle.z.object({
      key: import_mcpBundle.z.string().describe("Name of the key to press or a character to generate, such as `ArrowLeft` or `a`")
    }),
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.addCode(`// Press ${params.key}`);
    response.addCode(`await page.keyboard.press('${params.key}');`);
    await tab.page.keyboard.press(params.key);
  }
});
const pressSequentially = (0, import_tool.defineTabTool)({
  capability: "internal",
  schema: {
    name: "browser_press_sequentially",
    title: "Press sequentially",
    description: "Press text sequentially on the keyboard",
    inputSchema: import_mcpBundle.z.object({
      text: import_mcpBundle.z.string().describe("Text to press sequentially"),
      submit: import_mcpBundle.z.boolean().optional().describe("Whether to submit entered text (press Enter after)")
    }),
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.addCode(`// Press ${params.text}`);
    response.addCode(`await page.keyboard.type('${params.text}');`);
    await tab.page.keyboard.type(params.text);
    if (params.submit) {
      response.addCode(`await page.keyboard.press('Enter');`);
      response.setIncludeSnapshot();
      await tab.waitForCompletion(async () => {
        await tab.page.keyboard.press("Enter");
      });
    }
  }
});
const typeSchema = import_snapshot.elementSchema.extend({
  text: import_mcpBundle.z.string().describe("Text to type into the element"),
  submit: import_mcpBundle.z.boolean().optional().describe("Whether to submit entered text (press Enter after)"),
  slowly: import_mcpBundle.z.boolean().optional().describe("Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.")
});
const type = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_type",
    title: "Type text",
    description: "Type text into editable element",
    inputSchema: typeSchema,
    type: "input"
  },
  handle: async (tab, params, response) => {
    const { locator, resolved } = await tab.refLocator(params);
    const secret = tab.context.lookupSecret(params.text);
    await tab.waitForCompletion(async () => {
      if (params.slowly) {
        response.setIncludeSnapshot();
        response.addCode(`await page.${resolved}.pressSequentially(${secret.code});`);
        await locator.pressSequentially(secret.value);
      } else {
        response.addCode(`await page.${resolved}.fill(${secret.code});`);
        await locator.fill(secret.value);
      }
      if (params.submit) {
        response.setIncludeSnapshot();
        response.addCode(`await page.${resolved}.press('Enter');`);
        await locator.press("Enter");
      }
    });
  }
});
var keyboard_default = [
  pressKey,
  type,
  pressSequentially
];
