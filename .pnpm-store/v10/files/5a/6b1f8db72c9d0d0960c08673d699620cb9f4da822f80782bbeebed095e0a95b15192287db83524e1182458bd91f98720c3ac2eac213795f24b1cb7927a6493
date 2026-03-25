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
var communityPackageJson_identifiers_exports = {};
__export(communityPackageJson_identifiers_exports, {
  hasEmailLiteral: () => hasEmailLiteral,
  hasNameLiteral: () => hasNameLiteral,
  hasNodesApiVersion: () => hasNodesApiVersion,
  hasNodesLiteral: () => hasNodesLiteral,
  hasUrlLiteral: () => hasUrlLiteral,
  isCommunityPackageJson: () => isCommunityPackageJson,
  prod: () => prod,
  test: () => test
});
module.exports = __toCommonJS(communityPackageJson_identifiers_exports);
var import_utils = require("@typescript-eslint/utils");
var import_identifiers = require("../identifiers");
const isTestRun = process.env.NODE_ENV === "test";
const isProdRun = !isTestRun;
function isCommunityPackageJson(filename, node) {
  if (isProdRun && !filename.includes("package.json"))
    return false;
  if (isProdRun && !import_identifiers.id.prod.isTopLevelObjectExpression(node))
    return false;
  if (isTestRun && !import_identifiers.id.test.isTopLevelObjectExpression(node))
    return false;
  return true;
}
const prod = {
  isTopLevelObjectExpression(node) {
    return node.parent?.parent?.type === import_utils.AST_NODE_TYPES.Program;
  }
};
const test = {
  isTopLevelObjectExpression(node) {
    return node.parent?.parent?.type === import_utils.AST_NODE_TYPES.VariableDeclaration;
  }
};
const hasLiteral = (keyName) => (property) => {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Literal && property.key.value === keyName;
};
const hasNameLiteral = hasLiteral("name");
const hasEmailLiteral = hasLiteral("email");
const hasNodesLiteral = hasLiteral("nodes");
const hasNodesApiVersion = hasLiteral("n8nNodesApiVersion");
const hasUrlLiteral = hasLiteral("url");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  hasEmailLiteral,
  hasNameLiteral,
  hasNodesApiVersion,
  hasNodesLiteral,
  hasUrlLiteral,
  isCommunityPackageJson,
  prod,
  test
});
