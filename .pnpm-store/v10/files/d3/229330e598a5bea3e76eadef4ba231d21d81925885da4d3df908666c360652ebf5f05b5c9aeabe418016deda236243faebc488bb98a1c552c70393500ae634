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
var pirates_exports = {};
__export(pirates_exports, {
  addHook: () => addHook
});
module.exports = __toCommonJS(pirates_exports);
var import_module = __toESM(require("module"));
var import_path = __toESM(require("path"));
function addHook(transformHook, shouldTransform, extensions) {
  const extensionsToOverwrite = extensions.filter((e) => e !== ".cjs");
  const allSupportedExtensions = new Set(extensions);
  const loaders = import_module.default._extensions;
  const jsLoader = loaders[".js"];
  for (const extension of extensionsToOverwrite) {
    let newLoader2 = function(mod, filename, ...loaderArgs) {
      if (allSupportedExtensions.has(import_path.default.extname(filename)) && shouldTransform(filename)) {
        let newCompile2 = function(code, file, ...ignoredArgs) {
          mod._compile = oldCompile;
          return oldCompile.call(this, transformHook(code, filename), file);
        };
        var newCompile = newCompile2;
        const oldCompile = mod._compile;
        mod._compile = newCompile2;
      }
      originalLoader.call(this, mod, filename, ...loaderArgs);
    };
    var newLoader = newLoader2;
    const originalLoader = loaders[extension] || jsLoader;
    loaders[extension] = newLoader2;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addHook
});
