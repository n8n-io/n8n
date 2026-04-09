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
var log_common_exports = {};
__export(log_common_exports, {
  log: () => log
});
module.exports = __toCommonJS(log_common_exports);
function log(...args) {
  if (args.length > 0) {
    const firstArg = String(args[0]);
    if (firstArg.includes(":error")) {
      console.error(...args);
    } else if (firstArg.includes(":warning")) {
      console.warn(...args);
    } else if (firstArg.includes(":info")) {
      console.info(...args);
    } else if (firstArg.includes(":verbose")) {
      console.debug(...args);
    } else {
      console.debug(...args);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  log
});
