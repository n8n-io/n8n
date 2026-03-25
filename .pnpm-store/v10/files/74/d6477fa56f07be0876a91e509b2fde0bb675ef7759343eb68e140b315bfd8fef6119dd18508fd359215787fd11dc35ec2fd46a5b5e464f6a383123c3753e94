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
var communityPackageJson_getters_exports = {};
__export(communityPackageJson_getters_exports, {
  getAuthor: () => getAuthor,
  getDescription: () => getDescription,
  getKeywords: () => getKeywords,
  getLicense: () => getLicense,
  getN8n: () => getN8n,
  getName: () => getName,
  getRepository: () => getRepository,
  getVersion: () => getVersion
});
module.exports = __toCommonJS(communityPackageJson_getters_exports);
var import_utils = require("@typescript-eslint/utils");
const getPackageJsonProperty = (keyName) => (node) => {
  const found = node.properties.find((property) => {
    return property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Literal && property.key.value === keyName;
  });
  if (!found)
    return null;
  return {
    ast: found,
    // @ts-ignore
    value: found.value.value ?? "TODO restored object"
    // TODO: Restoring nested object unneeded for now
    // 'Literal' (found.value.value) or 'ObjectExpression' (nested object)
  };
};
const getName = getPackageJsonProperty("name");
const getKeywords = getPackageJsonProperty("keywords");
const getDescription = getPackageJsonProperty("description");
const getVersion = getPackageJsonProperty("version");
const getN8n = getPackageJsonProperty("n8n");
const getAuthor = getPackageJsonProperty("author");
const getLicense = getPackageJsonProperty("license");
const getRepository = getPackageJsonProperty("repository");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAuthor,
  getDescription,
  getKeywords,
  getLicense,
  getN8n,
  getName,
  getRepository,
  getVersion
});
