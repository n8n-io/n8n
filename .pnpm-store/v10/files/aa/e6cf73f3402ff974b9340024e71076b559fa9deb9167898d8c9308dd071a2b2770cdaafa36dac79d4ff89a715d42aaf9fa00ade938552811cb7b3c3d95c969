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
var mouse_exports = {};
__export(mouse_exports, {
  default: () => mouse_default
});
module.exports = __toCommonJS(mouse_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const elementSchema = import_mcpBundle.z.object({
  element: import_mcpBundle.z.string().describe("Human-readable element description used to obtain permission to interact with the element")
});
const mouseMove = (0, import_tool.defineTabTool)({
  capability: "vision",
  schema: {
    name: "browser_mouse_move_xy",
    title: "Move mouse",
    description: "Move mouse to a given position",
    inputSchema: elementSchema.extend({
      x: import_mcpBundle.z.number().describe("X coordinate"),
      y: import_mcpBundle.z.number().describe("Y coordinate")
    }),
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.addCode(`// Move mouse to (${params.x}, ${params.y})`);
    response.addCode(`await page.mouse.move(${params.x}, ${params.y});`);
    await tab.waitForCompletion(async () => {
      await tab.page.mouse.move(params.x, params.y);
    });
  }
});
const mouseClick = (0, import_tool.defineTabTool)({
  capability: "vision",
  schema: {
    name: "browser_mouse_click_xy",
    title: "Click",
    description: "Click left mouse button at a given position",
    inputSchema: elementSchema.extend({
      x: import_mcpBundle.z.number().describe("X coordinate"),
      y: import_mcpBundle.z.number().describe("Y coordinate")
    }),
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    response.addCode(`// Click mouse at coordinates (${params.x}, ${params.y})`);
    response.addCode(`await page.mouse.move(${params.x}, ${params.y});`);
    response.addCode(`await page.mouse.down();`);
    response.addCode(`await page.mouse.up();`);
    await tab.waitForCompletion(async () => {
      await tab.page.mouse.move(params.x, params.y);
      await tab.page.mouse.down();
      await tab.page.mouse.up();
    });
  }
});
const mouseDrag = (0, import_tool.defineTabTool)({
  capability: "vision",
  schema: {
    name: "browser_mouse_drag_xy",
    title: "Drag mouse",
    description: "Drag left mouse button to a given position",
    inputSchema: elementSchema.extend({
      startX: import_mcpBundle.z.number().describe("Start X coordinate"),
      startY: import_mcpBundle.z.number().describe("Start Y coordinate"),
      endX: import_mcpBundle.z.number().describe("End X coordinate"),
      endY: import_mcpBundle.z.number().describe("End Y coordinate")
    }),
    type: "input"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    response.addCode(`// Drag mouse from (${params.startX}, ${params.startY}) to (${params.endX}, ${params.endY})`);
    response.addCode(`await page.mouse.move(${params.startX}, ${params.startY});`);
    response.addCode(`await page.mouse.down();`);
    response.addCode(`await page.mouse.move(${params.endX}, ${params.endY});`);
    response.addCode(`await page.mouse.up();`);
    await tab.waitForCompletion(async () => {
      await tab.page.mouse.move(params.startX, params.startY);
      await tab.page.mouse.down();
      await tab.page.mouse.move(params.endX, params.endY);
      await tab.page.mouse.up();
    });
  }
});
var mouse_default = [
  mouseMove,
  mouseClick,
  mouseDrag
];
