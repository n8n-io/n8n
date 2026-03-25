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
var files_exports = {};
__export(files_exports, {
  default: () => files_default,
  uploadFile: () => uploadFile
});
module.exports = __toCommonJS(files_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const uploadFile = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_file_upload",
    title: "Upload files",
    description: "Upload one or multiple files",
    inputSchema: import_mcpBundle.z.object({
      paths: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe("The absolute paths to the files to upload. Can be single file or multiple files. If omitted, file chooser is cancelled.")
    }),
    type: "action"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const modalState = tab.modalStates().find((state) => state.type === "fileChooser");
    if (!modalState)
      throw new Error("No file chooser visible");
    response.addCode(`await fileChooser.setFiles(${JSON.stringify(params.paths)})`);
    tab.clearModalState(modalState);
    await tab.waitForCompletion(async () => {
      if (params.paths)
        await modalState.fileChooser.setFiles(params.paths);
    });
  },
  clearsModalState: "fileChooser"
});
var files_default = [
  uploadFile
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  uploadFile
});
