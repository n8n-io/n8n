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
var snapshot_exports = {};
__export(snapshot_exports, {
  default: () => snapshot_default,
  elementSchema: () => elementSchema
});
module.exports = __toCommonJS(snapshot_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_utils = require("playwright-core/lib/utils");
var import_tool = require("./tool");
const snapshot = (0, import_tool.defineTool)({
  capability: "core",
  schema: {
    name: "browser_snapshot",
    title: "Page snapshot",
    description: "Capture accessibility snapshot of the current page, this is better than screenshot",
    inputSchema: import_mcpBundle.z.object({
      filename: import_mcpBundle.z.string().optional().describe("Save snapshot to markdown file instead of returning it in the response.")
    }),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    await context.ensureTab();
    response.setIncludeFullSnapshot(params.filename);
  }
});
const elementSchema = import_mcpBundle.z.object({
  element: import_mcpBundle.z.string().optional().describe("Human-readable element description used to obtain permission to interact with the element"),
  ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
});
const clickSchema = elementSchema.extend({
  doubleClick: import_mcpBundle.z.boolean().optional().describe("Whether to perform a double click instead of a single click"),
  button: import_mcpBundle.z.enum(["left", "right", "middle"]).optional().describe("Button to click, defaults to left"),
  modifiers: import_mcpBundle.z.array(import_mcpBundle.z.enum(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"])).optional().describe("Modifier keys to press")
});
const click = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_click",
    title: "Click",
    description: "Perform click on a web page",
    inputSchema: clickSchema,
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const { locator, resolved } = await tab.refLocator(params);
    const options = {
      button: params.button,
      modifiers: params.modifiers
    };
    const formatted = (0, import_utils.formatObject)(options, " ", "oneline");
    const optionsAttr = formatted !== "{}" ? formatted : "";
    if (params.doubleClick)
      response.addCode(`await page.${resolved}.dblclick(${optionsAttr});`);
    else
      response.addCode(`await page.${resolved}.click(${optionsAttr});`);
    await tab.waitForCompletion(async () => {
      if (params.doubleClick)
        await locator.dblclick(options);
      else
        await locator.click(options);
    });
  }
});
const drag = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_drag",
    title: "Drag mouse",
    description: "Perform drag and drop between two elements",
    inputSchema: import_mcpBundle.z.object({
      startElement: import_mcpBundle.z.string().describe("Human-readable source element description used to obtain the permission to interact with the element"),
      startRef: import_mcpBundle.z.string().describe("Exact source element reference from the page snapshot"),
      endElement: import_mcpBundle.z.string().describe("Human-readable target element description used to obtain the permission to interact with the element"),
      endRef: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
    }),
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const [start, end] = await tab.refLocators([
      { ref: params.startRef, element: params.startElement },
      { ref: params.endRef, element: params.endElement }
    ]);
    await tab.waitForCompletion(async () => {
      await start.locator.dragTo(end.locator);
    });
    response.addCode(`await page.${start.resolved}.dragTo(page.${end.resolved});`);
  }
});
const hover = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_hover",
    title: "Hover mouse",
    description: "Hover over element on page",
    inputSchema: elementSchema,
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const { locator, resolved } = await tab.refLocator(params);
    response.addCode(`await page.${resolved}.hover();`);
    await tab.waitForCompletion(async () => {
      await locator.hover();
    });
  }
});
const selectOptionSchema = elementSchema.extend({
  values: import_mcpBundle.z.array(import_mcpBundle.z.string()).describe("Array of values to select in the dropdown. This can be a single value or multiple values.")
});
const selectOption = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_select_option",
    title: "Select option",
    description: "Select an option in a dropdown",
    inputSchema: selectOptionSchema,
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const { locator, resolved } = await tab.refLocator(params);
    response.addCode(`await page.${resolved}.selectOption(${(0, import_utils.formatObject)(params.values)});`);
    await tab.waitForCompletion(async () => {
      await locator.selectOption(params.values);
    });
  }
});
const pickLocator = (0, import_tool.defineTabTool)({
  capability: "testing",
  schema: {
    name: "browser_generate_locator",
    title: "Create locator for element",
    description: "Generate locator for the given element to use in tests",
    inputSchema: elementSchema,
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    const { resolved } = await tab.refLocator(params);
    response.addTextResult(resolved);
  }
});
var snapshot_default = [
  snapshot,
  click,
  drag,
  hover,
  selectOption,
  pickLocator
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  elementSchema
});
