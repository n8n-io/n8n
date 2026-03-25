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
var verify_exports = {};
__export(verify_exports, {
  default: () => verify_default
});
module.exports = __toCommonJS(verify_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_utils = require("playwright-core/lib/utils");
var import_tool = require("./tool");
const verifyElement = (0, import_tool.defineTabTool)({
  capability: "testing",
  schema: {
    name: "browser_verify_element_visible",
    title: "Verify element visible",
    description: "Verify element is visible on the page",
    inputSchema: import_mcpBundle.z.object({
      role: import_mcpBundle.z.string().describe('ROLE of the element. Can be found in the snapshot like this: `- {ROLE} "Accessible Name":`'),
      accessibleName: import_mcpBundle.z.string().describe('ACCESSIBLE_NAME of the element. Can be found in the snapshot like this: `- role "{ACCESSIBLE_NAME}"`')
    }),
    type: "assertion"
  },
  handle: async (tab, params, response) => {
    const locator = tab.page.getByRole(params.role, { name: params.accessibleName });
    if (await locator.count() === 0) {
      response.addError(`Element with role "${params.role}" and accessible name "${params.accessibleName}" not found`);
      return;
    }
    response.addCode(`await expect(page.getByRole(${(0, import_utils.escapeWithQuotes)(params.role)}, { name: ${(0, import_utils.escapeWithQuotes)(params.accessibleName)} })).toBeVisible();`);
    response.addTextResult("Done");
  }
});
const verifyText = (0, import_tool.defineTabTool)({
  capability: "testing",
  schema: {
    name: "browser_verify_text_visible",
    title: "Verify text visible",
    description: `Verify text is visible on the page. Prefer ${verifyElement.schema.name} if possible.`,
    inputSchema: import_mcpBundle.z.object({
      text: import_mcpBundle.z.string().describe('TEXT to verify. Can be found in the snapshot like this: `- role "Accessible Name": {TEXT}` or like this: `- text: {TEXT}`')
    }),
    type: "assertion"
  },
  handle: async (tab, params, response) => {
    const locator = tab.page.getByText(params.text).filter({ visible: true });
    if (await locator.count() === 0) {
      response.addError("Text not found");
      return;
    }
    response.addCode(`await expect(page.getByText(${(0, import_utils.escapeWithQuotes)(params.text)})).toBeVisible();`);
    response.addTextResult("Done");
  }
});
const verifyList = (0, import_tool.defineTabTool)({
  capability: "testing",
  schema: {
    name: "browser_verify_list_visible",
    title: "Verify list visible",
    description: "Verify list is visible on the page",
    inputSchema: import_mcpBundle.z.object({
      element: import_mcpBundle.z.string().describe("Human-readable list description"),
      ref: import_mcpBundle.z.string().describe("Exact target element reference that points to the list"),
      items: import_mcpBundle.z.array(import_mcpBundle.z.string()).describe("Items to verify")
    }),
    type: "assertion"
  },
  handle: async (tab, params, response) => {
    const { locator } = await tab.refLocator({ ref: params.ref, element: params.element });
    const itemTexts = [];
    for (const item of params.items) {
      const itemLocator = locator.getByText(item);
      if (await itemLocator.count() === 0) {
        response.addError(`Item "${item}" not found`);
        return;
      }
      itemTexts.push(await itemLocator.textContent());
    }
    const ariaSnapshot = `\`
- list:
${itemTexts.map((t) => `  - listitem: ${(0, import_utils.escapeWithQuotes)(t, '"')}`).join("\n")}
\``;
    response.addCode(`await expect(page.locator('body')).toMatchAriaSnapshot(${ariaSnapshot});`);
    response.addTextResult("Done");
  }
});
const verifyValue = (0, import_tool.defineTabTool)({
  capability: "testing",
  schema: {
    name: "browser_verify_value",
    title: "Verify value",
    description: "Verify element value",
    inputSchema: import_mcpBundle.z.object({
      type: import_mcpBundle.z.enum(["textbox", "checkbox", "radio", "combobox", "slider"]).describe("Type of the element"),
      element: import_mcpBundle.z.string().describe("Human-readable element description"),
      ref: import_mcpBundle.z.string().describe("Exact target element reference that points to the element"),
      value: import_mcpBundle.z.string().describe('Value to verify. For checkbox, use "true" or "false".')
    }),
    type: "assertion"
  },
  handle: async (tab, params, response) => {
    const { locator, resolved } = await tab.refLocator({ ref: params.ref, element: params.element });
    const locatorSource = `page.${resolved}`;
    if (params.type === "textbox" || params.type === "slider" || params.type === "combobox") {
      const value = await locator.inputValue();
      if (value !== params.value) {
        response.addError(`Expected value "${params.value}", but got "${value}"`);
        return;
      }
      response.addCode(`await expect(${locatorSource}).toHaveValue(${(0, import_utils.escapeWithQuotes)(params.value)});`);
    } else if (params.type === "checkbox" || params.type === "radio") {
      const value = await locator.isChecked();
      if (value !== (params.value === "true")) {
        response.addError(`Expected value "${params.value}", but got "${value}"`);
        return;
      }
      const matcher = value ? "toBeChecked" : "not.toBeChecked";
      response.addCode(`await expect(${locatorSource}).${matcher}();`);
    }
    response.addTextResult("Done");
  }
});
var verify_default = [
  verifyElement,
  verifyText,
  verifyList,
  verifyValue
];
