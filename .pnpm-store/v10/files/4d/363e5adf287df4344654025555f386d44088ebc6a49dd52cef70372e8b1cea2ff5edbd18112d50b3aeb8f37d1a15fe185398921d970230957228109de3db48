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
var lintable_identifiers_exports = {};
__export(lintable_identifiers_exports, {
  IDENTIFIER_KEYS: () => IDENTIFIER_KEYS,
  isFixedCollectionSection: () => isFixedCollectionSection,
  isNodeClassDescription: () => isNodeClassDescription,
  isNodeParameter: () => isNodeParameter,
  isOption: () => isOption
});
module.exports = __toCommonJS(lintable_identifiers_exports);
var import_utils = require("@typescript-eslint/utils");
const IDENTIFIER_KEYS = {
  nodeParam: ["displayName", "name", "type", "default"],
  option: ["name", "value"],
  // in options-type or multi-options-type node param
  fixedCollectionSection: ["displayName", "name", "values"],
  nodeClassDescription: ["displayName", "name", "group"]
};
function isLintableSection(section, node, options) {
  const requiredKeys = IDENTIFIER_KEYS[section];
  const keysToCheck = options ? requiredKeys.filter((key) => !options.skipKeys.includes(key)) : requiredKeys;
  const totalFound = node.properties.reduce((acc, property) => {
    if (property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Identifier && keysToCheck.includes(property.key.name)) {
      acc++;
    }
    return acc;
  }, 0);
  return totalFound === keysToCheck.length;
}
function isNodeParameter(node, options) {
  return isLintableSection("nodeParam", node, options);
}
function isOption(node) {
  return isLintableSection("option", node);
}
function isFixedCollectionSection(node) {
  return isLintableSection("fixedCollectionSection", node);
}
function isNodeClassDescription(node) {
  return isLintableSection("nodeClassDescription", node);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  IDENTIFIER_KEYS,
  isFixedCollectionSection,
  isNodeClassDescription,
  isNodeParameter,
  isOption
});
