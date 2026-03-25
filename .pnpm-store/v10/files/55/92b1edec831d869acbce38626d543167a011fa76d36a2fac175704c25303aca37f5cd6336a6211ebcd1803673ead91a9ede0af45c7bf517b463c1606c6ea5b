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
var dialogs_exports = {};
__export(dialogs_exports, {
  default: () => dialogs_default,
  handleDialog: () => handleDialog
});
module.exports = __toCommonJS(dialogs_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const handleDialog = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_handle_dialog",
    title: "Handle a dialog",
    description: "Handle a dialog",
    inputSchema: import_mcpBundle.z.object({
      accept: import_mcpBundle.z.boolean().describe("Whether to accept the dialog."),
      promptText: import_mcpBundle.z.string().optional().describe("The text of the prompt in case of a prompt dialog.")
    }),
    type: "action"
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const dialogState = tab.modalStates().find((state) => state.type === "dialog");
    if (!dialogState)
      throw new Error("No dialog visible");
    tab.clearModalState(dialogState);
    await tab.waitForCompletion(async () => {
      if (params.accept)
        await dialogState.dialog.accept(params.promptText);
      else
        await dialogState.dialog.dismiss();
    });
  },
  clearsModalState: "dialog"
});
var dialogs_default = [
  handleDialog
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleDialog
});
