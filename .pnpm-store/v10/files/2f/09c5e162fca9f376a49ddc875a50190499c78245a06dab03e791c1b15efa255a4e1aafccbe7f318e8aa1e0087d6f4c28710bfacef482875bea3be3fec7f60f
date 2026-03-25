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
var profiler_exports = {};
__export(profiler_exports, {
  startProfiling: () => startProfiling,
  stopProfiling: () => stopProfiling
});
module.exports = __toCommonJS(profiler_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
const profileDir = process.env.PWTEST_PROFILE_DIR || "";
let session;
async function startProfiling() {
  if (!profileDir)
    return;
  session = new (require("inspector")).Session();
  session.connect();
  await new Promise((f) => {
    session.post("Profiler.enable", () => {
      session.post("Profiler.start", f);
    });
  });
}
async function stopProfiling(profileName) {
  if (!profileDir)
    return;
  await new Promise((f) => session.post("Profiler.stop", (err, { profile }) => {
    if (!err) {
      import_fs.default.mkdirSync(profileDir, { recursive: true });
      import_fs.default.writeFileSync(import_path.default.join(profileDir, profileName + ".json"), JSON.stringify(profile));
    }
    f();
  }));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  startProfiling,
  stopProfiling
});
