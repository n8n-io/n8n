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
var expectTools_exports = {};
__export(expectTools_exports, {
  default: () => expectTools_default
});
module.exports = __toCommonJS(expectTools_exports);
var import_mcpBundle = require("../../mcpBundle");
var import_locatorUtils = require("../../utils/isomorphic/locatorUtils");
var import_yaml = require("../../utils/isomorphic/yaml");
var import_tool = require("./tool");
const expectVisible = (0, import_tool.defineTool)({
  schema: {
    name: "browser_expect_visible",
    title: "Expect element visible",
    description: "Expect element is visible on the page",
    inputSchema: import_mcpBundle.z.object({
      role: import_mcpBundle.z.string().describe('ROLE of the element. Can be found in the snapshot like this: `- {ROLE} "Accessible Name":`'),
      accessibleName: import_mcpBundle.z.string().describe('ACCESSIBLE_NAME of the element. Can be found in the snapshot like this: `- role "{ACCESSIBLE_NAME}"`'),
      isNot: import_mcpBundle.z.boolean().optional().describe("Expect the opposite")
    })
  },
  handle: async (progress, context, params) => {
    return await context.runActionAndWait(progress, {
      method: "expectVisible",
      selector: (0, import_locatorUtils.getByRoleSelector)(params.role, { name: params.accessibleName }),
      isNot: params.isNot
    });
  }
});
const expectVisibleText = (0, import_tool.defineTool)({
  schema: {
    name: "browser_expect_visible_text",
    title: "Expect text visible",
    description: `Expect text is visible on the page. Prefer ${expectVisible.schema.name} if possible.`,
    inputSchema: import_mcpBundle.z.object({
      text: import_mcpBundle.z.string().describe('TEXT to expect. Can be found in the snapshot like this: `- role "Accessible Name": {TEXT}` or like this: `- text: {TEXT}`'),
      isNot: import_mcpBundle.z.boolean().optional().describe("Expect the opposite")
    })
  },
  handle: async (progress, context, params) => {
    return await context.runActionAndWait(progress, {
      method: "expectVisible",
      selector: (0, import_locatorUtils.getByTextSelector)(params.text),
      isNot: params.isNot
    });
  }
});
const expectValue = (0, import_tool.defineTool)({
  schema: {
    name: "browser_expect_value",
    title: "Expect value",
    description: "Expect element value",
    inputSchema: import_mcpBundle.z.object({
      type: import_mcpBundle.z.enum(["textbox", "checkbox", "radio", "combobox", "slider"]).describe("Type of the element"),
      element: import_mcpBundle.z.string().describe("Human-readable element description"),
      ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot"),
      value: import_mcpBundle.z.string().describe('Value to expect. For checkbox, use "true" or "false".'),
      isNot: import_mcpBundle.z.boolean().optional().describe("Expect the opposite")
    })
  },
  handle: async (progress, context, params) => {
    const [selector] = await context.refSelectors(progress, [{ ref: params.ref, element: params.element }]);
    return await context.runActionAndWait(progress, {
      method: "expectValue",
      selector,
      type: params.type,
      value: params.value,
      isNot: params.isNot
    });
  }
});
const expectList = (0, import_tool.defineTool)({
  schema: {
    name: "browser_expect_list_visible",
    title: "Expect list visible",
    description: "Expect list is visible on the page, ensures items are present in the element in the exact order",
    inputSchema: import_mcpBundle.z.object({
      listRole: import_mcpBundle.z.string().describe("Aria role of the list element as in the snapshot"),
      listAccessibleName: import_mcpBundle.z.string().optional().describe("Accessible name of the list element as in the snapshot"),
      itemRole: import_mcpBundle.z.string().describe("Aria role of the list items as in the snapshot, should all be the same"),
      items: import_mcpBundle.z.array(import_mcpBundle.z.string().describe("Text to look for in the list item, can be either from accessible name of self / nested text content")),
      isNot: import_mcpBundle.z.boolean().optional().describe("Expect the opposite")
    })
  },
  handle: async (progress, context, params) => {
    const template = `- ${params.listRole}:
${params.items.map((item) => `  - ${params.itemRole}: ${(0, import_yaml.yamlEscapeValueIfNeeded)(item)}`).join("\n")}`;
    return await context.runActionAndWait(progress, {
      method: "expectAria",
      template
    });
  }
});
const expectURL = (0, import_tool.defineTool)({
  schema: {
    name: "browser_expect_url",
    title: "Expect URL",
    description: "Expect the page URL to match the expected value. Either provide a url string or a regex pattern.",
    inputSchema: import_mcpBundle.z.object({
      url: import_mcpBundle.z.string().optional().describe("Expected URL string. Relative URLs are resolved against the baseURL."),
      regex: import_mcpBundle.z.string().optional().describe("Regular expression pattern to match the URL against, e.g. /foo.*/i."),
      isNot: import_mcpBundle.z.boolean().optional().describe("Expect the opposite")
    })
  },
  handle: async (progress, context, params) => {
    return await context.runActionAndWait(progress, {
      method: "expectURL",
      value: params.url,
      regex: params.regex,
      isNot: params.isNot
    });
  }
});
const expectTitle = (0, import_tool.defineTool)({
  schema: {
    name: "browser_expect_title",
    title: "Expect title",
    description: "Expect the page title to match the expected value.",
    inputSchema: import_mcpBundle.z.object({
      title: import_mcpBundle.z.string().describe("Expected page title."),
      isNot: import_mcpBundle.z.boolean().optional().describe("Expect the opposite")
    })
  },
  handle: async (progress, context, params) => {
    return await context.runActionAndWait(progress, {
      method: "expectTitle",
      value: params.title,
      isNot: params.isNot
    });
  }
});
var expectTools_default = [
  expectVisible,
  expectVisibleText,
  expectValue,
  expectList,
  expectURL,
  expectTitle
];
