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
var uuidUtils_common_exports = {};
__export(uuidUtils_common_exports, {
  generateUUID: () => generateUUID,
  randomUUID: () => randomUUID
});
module.exports = __toCommonJS(uuidUtils_common_exports);
function generateUUID() {
  let uuid = "";
  for (let i = 0; i < 32; i++) {
    const randomNumber = Math.floor(Math.random() * 16);
    if (i === 12) {
      uuid += "4";
    } else if (i === 16) {
      uuid += randomNumber & 3 | 8;
    } else {
      uuid += randomNumber.toString(16);
    }
    if (i === 7 || i === 11 || i === 15 || i === 19) {
      uuid += "-";
    }
  }
  return uuid;
}
function randomUUID() {
  return generateUUID();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateUUID,
  randomUUID
});
