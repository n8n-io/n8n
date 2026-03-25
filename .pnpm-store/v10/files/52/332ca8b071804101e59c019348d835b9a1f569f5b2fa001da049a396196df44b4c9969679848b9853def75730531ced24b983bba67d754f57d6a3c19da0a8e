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
var crDevTools_exports = {};
__export(crDevTools_exports, {
  CRDevTools: () => CRDevTools
});
module.exports = __toCommonJS(crDevTools_exports);
var import_fs = __toESM(require("fs"));
const kBindingName = "__pw_devtools__";
class CRDevTools {
  constructor(preferencesPath) {
    this._preferencesPath = preferencesPath;
    this._savePromise = Promise.resolve();
  }
  install(session) {
    session.on("Runtime.bindingCalled", async (event) => {
      if (event.name !== kBindingName)
        return;
      const parsed = JSON.parse(event.payload);
      let result = void 0;
      if (parsed.method === "getPreferences") {
        if (this._prefs === void 0) {
          try {
            const json = await import_fs.default.promises.readFile(this._preferencesPath, "utf8");
            this._prefs = JSON.parse(json);
          } catch (e) {
            this._prefs = {};
          }
        }
        result = this._prefs;
      } else if (parsed.method === "setPreference") {
        this._prefs[parsed.params[0]] = parsed.params[1];
        this._save();
      } else if (parsed.method === "removePreference") {
        delete this._prefs[parsed.params[0]];
        this._save();
      } else if (parsed.method === "clearPreferences") {
        this._prefs = {};
        this._save();
      }
      session.send("Runtime.evaluate", {
        expression: `window.DevToolsAPI.embedderMessageAck(${parsed.id}, ${JSON.stringify(result)})`,
        contextId: event.executionContextId
      }).catch((e) => null);
    });
    Promise.all([
      session.send("Runtime.enable"),
      session.send("Runtime.addBinding", { name: kBindingName }),
      session.send("Page.enable"),
      session.send("Page.addScriptToEvaluateOnNewDocument", { source: `
        (() => {
          const init = () => {
            // Lazy init happens when InspectorFrontendHost is initialized.
            // At this point DevToolsHost is ready to be used.
            const host = window.DevToolsHost;
            const old = host.sendMessageToEmbedder.bind(host);
            host.sendMessageToEmbedder = message => {
              if (['getPreferences', 'setPreference', 'removePreference', 'clearPreferences'].includes(JSON.parse(message).method))
                window.${kBindingName}(message);
              else
                old(message);
            };
          };
          let value;
          Object.defineProperty(window, 'InspectorFrontendHost', {
            configurable: true,
            enumerable: true,
            get() { return value; },
            set(v) { value = v; init(); },
          });
        })()
      ` }),
      session.send("Runtime.runIfWaitingForDebugger")
    ]).catch((e) => null);
  }
  _save() {
    this._savePromise = this._savePromise.then(async () => {
      await import_fs.default.promises.writeFile(this._preferencesPath, JSON.stringify(this._prefs)).catch((e) => null);
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CRDevTools
});
