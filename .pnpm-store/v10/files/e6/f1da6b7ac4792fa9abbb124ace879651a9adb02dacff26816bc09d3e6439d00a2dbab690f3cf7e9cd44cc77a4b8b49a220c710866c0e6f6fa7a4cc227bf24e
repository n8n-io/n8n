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
var range_exports = {};
__export(range_exports, {
  getRangeOfAssertion: () => getRangeOfAssertion,
  getRangeToRemove: () => getRangeToRemove,
  getRangeWithTrailingComma: () => getRangeWithTrailingComma,
  isMultiline: () => isMultiline
});
module.exports = __toCommonJS(range_exports);
var import_utils = require("@typescript-eslint/utils");
var import_format = require("./format");
function getRangeWithTrailingComma(referenceNode) {
  const { range } = referenceNode.ast;
  return [range[0], range[1] + 1];
}
function isMultiline(node) {
  return node.ast.loc.start.line !== node.ast.loc.end.line;
}
function getRangeOfAssertion(typeIdentifier) {
  return [typeIdentifier.range[0] - 4, typeIdentifier.range[1]];
}
function getRangeToRemove(referenceNode) {
  const { range } = referenceNode.ast;
  const indentation = (0, import_format.getIndentationString)(referenceNode);
  if (referenceNode.ast.type === import_utils.AST_NODE_TYPES.TSArrayType) {
    return [range[0] - indentation.length, range[1] - 1];
  }
  return [range[0] - indentation.length, range[1] + 2];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getRangeOfAssertion,
  getRangeToRemove,
  getRangeWithTrailingComma,
  isMultiline
});
