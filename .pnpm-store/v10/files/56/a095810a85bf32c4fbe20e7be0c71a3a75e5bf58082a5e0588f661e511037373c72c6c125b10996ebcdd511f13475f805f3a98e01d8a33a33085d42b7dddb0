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
var rule_exports = {};
__export(rule_exports, {
  createRule: () => createRule,
  getRuleName: () => getRuleName
});
module.exports = __toCommonJS(rule_exports);
var import_utils = require("@typescript-eslint/utils");
const createRule = import_utils.ESLintUtils.RuleCreator((ruleName) => {
  return `https://github.com/ivov/eslint-plugin-n8n-nodes-base/blob/master/docs/rules/${ruleName}.md`;
});
const getRuleName = ({ filename }) => filename.split("/").pop()?.replace(/(\.test)?\.(j|t)s/, "") ?? "Unknown";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createRule,
  getRuleName
});
