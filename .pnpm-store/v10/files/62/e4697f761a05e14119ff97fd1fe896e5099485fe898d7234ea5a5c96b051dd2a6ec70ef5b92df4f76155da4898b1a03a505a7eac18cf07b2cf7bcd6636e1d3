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
var powered_by_exports = {};
__export(powered_by_exports, {
  poweredBy: () => poweredBy
});
module.exports = __toCommonJS(powered_by_exports);
const poweredBy = (options) => {
  return async function poweredBy2(c, next) {
    await next();
    c.res.headers.set("X-Powered-By", options?.serverName ?? "Hono");
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  poweredBy
});
