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
var tool_exports = {};
__export(tool_exports, {
  defineTabTool: () => defineTabTool,
  defineTool: () => defineTool
});
module.exports = __toCommonJS(tool_exports);
function defineTool(tool) {
  return tool;
}
function defineTabTool(tool) {
  return {
    ...tool,
    handle: async (context, params, response) => {
      const tab = await context.ensureTab();
      const modalStates = tab.modalStates().map((state) => state.type);
      if (tool.clearsModalState && !modalStates.includes(tool.clearsModalState))
        response.addError(`Error: The tool "${tool.schema.name}" can only be used when there is related modal state present.`);
      else if (!tool.clearsModalState && modalStates.length)
        response.addError(`Error: Tool "${tool.schema.name}" does not handle the modal state.`);
      else
        return tool.handle(tab, params, response);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineTabTool,
  defineTool
});
