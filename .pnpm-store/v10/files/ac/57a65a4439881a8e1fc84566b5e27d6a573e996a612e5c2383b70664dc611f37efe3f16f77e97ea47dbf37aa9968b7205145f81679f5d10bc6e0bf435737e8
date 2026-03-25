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
var tools_exports = {};
__export(tools_exports, {
  browserTools: () => browserTools,
  filteredTools: () => filteredTools
});
module.exports = __toCommonJS(tools_exports);
var import_common = __toESM(require("./tools/common"));
var import_console = __toESM(require("./tools/console"));
var import_dialogs = __toESM(require("./tools/dialogs"));
var import_evaluate = __toESM(require("./tools/evaluate"));
var import_files = __toESM(require("./tools/files"));
var import_form = __toESM(require("./tools/form"));
var import_install = __toESM(require("./tools/install"));
var import_keyboard = __toESM(require("./tools/keyboard"));
var import_mouse = __toESM(require("./tools/mouse"));
var import_navigate = __toESM(require("./tools/navigate"));
var import_network = __toESM(require("./tools/network"));
var import_open = __toESM(require("./tools/open"));
var import_pdf = __toESM(require("./tools/pdf"));
var import_runCode = __toESM(require("./tools/runCode"));
var import_snapshot = __toESM(require("./tools/snapshot"));
var import_screenshot = __toESM(require("./tools/screenshot"));
var import_tabs = __toESM(require("./tools/tabs"));
var import_tracing = __toESM(require("./tools/tracing"));
var import_wait = __toESM(require("./tools/wait"));
var import_verify = __toESM(require("./tools/verify"));
const browserTools = [
  ...import_common.default,
  ...import_console.default,
  ...import_dialogs.default,
  ...import_evaluate.default,
  ...import_files.default,
  ...import_form.default,
  ...import_install.default,
  ...import_keyboard.default,
  ...import_mouse.default,
  ...import_navigate.default,
  ...import_network.default,
  ...import_open.default,
  ...import_pdf.default,
  ...import_runCode.default,
  ...import_screenshot.default,
  ...import_snapshot.default,
  ...import_tabs.default,
  ...import_tracing.default,
  ...import_wait.default,
  ...import_verify.default
];
function filteredTools(config) {
  return browserTools.filter((tool) => tool.capability.startsWith("core") || config.capabilities?.includes(tool.capability));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  browserTools,
  filteredTools
});
