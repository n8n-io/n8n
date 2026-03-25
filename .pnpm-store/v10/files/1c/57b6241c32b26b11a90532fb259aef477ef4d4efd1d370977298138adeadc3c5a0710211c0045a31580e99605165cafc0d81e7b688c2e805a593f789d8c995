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
var nodeClassDescription_identifiers_exports = {};
__export(nodeClassDescription_identifiers_exports, {
  isCredentials: () => isCredentials,
  isDefaultVersion: () => isDefaultVersion,
  isDefaults: () => isDefaults,
  isIcon: () => isIcon,
  isInputs: () => isInputs,
  isName: () => isName,
  isOutputs: () => isOutputs,
  isProperties: () => isProperties,
  isSubtitle: () => isSubtitle,
  isVersion: () => isVersion
});
module.exports = __toCommonJS(nodeClassDescription_identifiers_exports);
var import_common = require("./common.identifiers");
function isName(property) {
  return (0, import_common.isStringPropertyNamed)("name", property);
}
function isIcon(property) {
  return (0, import_common.isStringPropertyNamed)("icon", property);
}
function isVersion(property) {
  return (0, import_common.isNumericPropertyNamed)("version", property);
}
function isSubtitle(property) {
  return (0, import_common.isStringPropertyNamed)("subtitle", property);
}
function isDefaultVersion(property) {
  return (0, import_common.isNumericPropertyNamed)("defaultVersion", property);
}
function isInputs(property) {
  return (0, import_common.isArrayPropertyNamed)("inputs", property);
}
function isOutputs(property) {
  return (0, import_common.isArrayPropertyNamed)("outputs", property);
}
function isCredentials(property) {
  return (0, import_common.isArrayPropertyNamed)("credentials", property);
}
function isProperties(property) {
  return (0, import_common.isArrayPropertyNamed)("properties", property);
}
function isDefaults(property) {
  return (0, import_common.isObjectPropertyNamed)("defaults", property);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isCredentials,
  isDefaultVersion,
  isDefaults,
  isIcon,
  isInputs,
  isName,
  isOutputs,
  isProperties,
  isSubtitle,
  isVersion
});
