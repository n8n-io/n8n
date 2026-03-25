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
var dialogDispatcher_exports = {};
__export(dialogDispatcher_exports, {
  DialogDispatcher: () => DialogDispatcher
});
module.exports = __toCommonJS(dialogDispatcher_exports);
var import_dispatcher = require("./dispatcher");
var import_pageDispatcher = require("./pageDispatcher");
class DialogDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, dialog) {
    const page = import_pageDispatcher.PageDispatcher.fromNullable(scope, dialog.page().initializedOrUndefined());
    super(page || scope, dialog, "Dialog", {
      page,
      type: dialog.type(),
      message: dialog.message(),
      defaultValue: dialog.defaultValue()
    });
    this._type_Dialog = true;
  }
  async accept(params, progress) {
    await progress.race(this._object.accept(params.promptText));
  }
  async dismiss(params, progress) {
    await progress.race(this._object.dismiss());
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DialogDispatcher
});
