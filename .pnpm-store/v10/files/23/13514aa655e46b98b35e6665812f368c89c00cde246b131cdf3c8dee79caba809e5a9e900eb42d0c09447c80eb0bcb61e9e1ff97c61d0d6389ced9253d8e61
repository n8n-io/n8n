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
var conninfo_exports = {};
__export(conninfo_exports, {
  getConnInfo: () => getConnInfo
});
module.exports = __toCommonJS(conninfo_exports);
const getConnInfo = (c) => ({
  remote: {
    address: c.env.event.Records[0].cf.request.clientIp
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getConnInfo
});
