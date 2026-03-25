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
var dialog_exports = {};
__export(dialog_exports, {
  Dialog: () => Dialog,
  DialogManager: () => DialogManager
});
module.exports = __toCommonJS(dialog_exports);
var import_utils = require("../utils");
var import_instrumentation = require("./instrumentation");
class Dialog extends import_instrumentation.SdkObject {
  constructor(page, type, message, onHandle, defaultValue) {
    super(page, "dialog");
    this._handled = false;
    this._page = page;
    this._type = type;
    this._message = message;
    this._onHandle = onHandle;
    this._defaultValue = defaultValue || "";
  }
  page() {
    return this._page;
  }
  type() {
    return this._type;
  }
  message() {
    return this._message;
  }
  defaultValue() {
    return this._defaultValue;
  }
  async accept(promptText) {
    (0, import_utils.assert)(!this._handled, "Cannot accept dialog which is already handled!");
    this._handled = true;
    this._page.browserContext.dialogManager.dialogWillClose(this);
    await this._onHandle(true, promptText);
  }
  async dismiss() {
    (0, import_utils.assert)(!this._handled, "Cannot dismiss dialog which is already handled!");
    this._handled = true;
    this._page.browserContext.dialogManager.dialogWillClose(this);
    await this._onHandle(false);
  }
  async close() {
    if (this._type === "beforeunload")
      await this.accept();
    else
      await this.dismiss();
  }
}
class DialogManager {
  constructor(instrumentation) {
    this._dialogHandlers = /* @__PURE__ */ new Set();
    this._openedDialogs = /* @__PURE__ */ new Set();
    this._instrumentation = instrumentation;
  }
  dialogDidOpen(dialog) {
    for (const frame of dialog.page().frameManager.frames())
      frame._invalidateNonStallingEvaluations("JavaScript dialog interrupted evaluation");
    this._openedDialogs.add(dialog);
    this._instrumentation.onDialog(dialog);
    let hasHandlers = false;
    for (const handler of this._dialogHandlers) {
      if (handler(dialog))
        hasHandlers = true;
    }
    if (!hasHandlers)
      dialog.close().then(() => {
      });
  }
  dialogWillClose(dialog) {
    this._openedDialogs.delete(dialog);
  }
  addDialogHandler(handler) {
    this._dialogHandlers.add(handler);
  }
  removeDialogHandler(handler) {
    this._dialogHandlers.delete(handler);
    if (!this._dialogHandlers.size) {
      for (const dialog of this._openedDialogs)
        dialog.close().catch(() => {
        });
    }
  }
  hasOpenDialogsForPage(page) {
    return [...this._openedDialogs].some((dialog) => dialog.page() === page);
  }
  async closeBeforeUnloadDialogs() {
    await Promise.all([...this._openedDialogs].map(async (dialog) => {
      if (dialog.type() === "beforeunload")
        await dialog.dismiss();
    }));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Dialog,
  DialogManager
});
