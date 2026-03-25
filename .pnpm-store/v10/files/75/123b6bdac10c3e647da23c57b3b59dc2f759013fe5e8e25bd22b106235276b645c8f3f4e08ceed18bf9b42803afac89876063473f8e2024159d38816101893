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
var form_exports = {};
__export(form_exports, {
  default: () => form_default
});
module.exports = __toCommonJS(form_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_utils = require("playwright-core/lib/utils");
var import_tool = require("./tool");
const fillForm = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_fill_form",
    title: "Fill form",
    description: "Fill multiple form fields",
    inputSchema: import_mcpBundle.z.object({
      fields: import_mcpBundle.z.array(import_mcpBundle.z.object({
        name: import_mcpBundle.z.string().describe("Human-readable field name"),
        type: import_mcpBundle.z.enum(["textbox", "checkbox", "radio", "combobox", "slider"]).describe("Type of the field"),
        ref: import_mcpBundle.z.string().describe("Exact target field reference from the page snapshot"),
        value: import_mcpBundle.z.string().describe("Value to fill in the field. If the field is a checkbox, the value should be `true` or `false`. If the field is a combobox, the value should be the text of the option.")
      })).describe("Fields to fill in")
    }),
    type: "input"
  },
  handle: async (tab, params, response) => {
    for (const field of params.fields) {
      const { locator, resolved } = await tab.refLocator({ element: field.name, ref: field.ref });
      const locatorSource = `await page.${resolved}`;
      if (field.type === "textbox" || field.type === "slider") {
        const secret = tab.context.lookupSecret(field.value);
        await locator.fill(secret.value);
        response.addCode(`${locatorSource}.fill(${secret.code});`);
      } else if (field.type === "checkbox" || field.type === "radio") {
        await locator.setChecked(field.value === "true");
        response.addCode(`${locatorSource}.setChecked(${field.value});`);
      } else if (field.type === "combobox") {
        await locator.selectOption({ label: field.value });
        response.addCode(`${locatorSource}.selectOption(${(0, import_utils.escapeWithQuotes)(field.value)});`);
      }
    }
  }
});
var form_default = [
  fillForm
];
