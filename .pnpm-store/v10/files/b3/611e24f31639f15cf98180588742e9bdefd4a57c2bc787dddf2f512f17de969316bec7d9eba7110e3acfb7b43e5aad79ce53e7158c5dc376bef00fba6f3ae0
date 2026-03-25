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
var insertion_exports = {};
__export(insertion_exports, {
  addApiSuffix: () => addApiSuffix,
  addEndSegment: () => addEndSegment,
  getInsertionArgs: () => getInsertionArgs,
  keyValue: () => keyValue
});
module.exports = __toCommonJS(insertion_exports);
var import_utils = require("@typescript-eslint/utils");
var import_format = require("./format");
var import_range = require("./range");
const getInsertionArgs = (referenceNode) => {
  if (referenceNode.ast.type === import_utils.AST_NODE_TYPES.PropertyDefinition || // @ts-ignore
  referenceNode.ast.type === import_utils.AST_NODE_TYPES.ClassProperty) {
    return {
      range: referenceNode.ast.range,
      indentation: (0, import_format.getIndentationString)(referenceNode)
    };
  }
  return {
    range: (0, import_range.getRangeWithTrailingComma)(referenceNode),
    indentation: (0, import_format.getIndentationString)(referenceNode)
  };
};
function keyValue(key, value, { backtickedValue } = { backtickedValue: false }) {
  const unescapedQuote = new RegExp(/(?<!\\)'/, "g");
  const escapedValue = value.replace(unescapedQuote, "\\'");
  if (backtickedValue) {
    return `${key}: \`${escapedValue}\``;
  }
  return `${key}: '${escapedValue}'`;
}
function addEndSegment(value) {
  if (/\w+\sName(s?)\s*\/\s*ID(s?)/.test(value))
    return value.replace(/Name(s?)\s*\/\s*ID(s?)/, "Name or ID");
  if (/\w+\sID(s?)\s*\/\s*Name(s?)/.test(value))
    return value.replace(/ID(s?)\s*\/\s*Name(s?)/, "Name or ID");
  if (/\w+\sName(s?)$/.test(value))
    return value.replace(/Name(s?)$/, "Name or ID");
  if (/\w+\sID(s?)$/.test(value))
    return value.replace(/ID(s?)$/, "Name or ID");
  if (value === "ID" || value === "Name")
    return "Name or ID";
  if (/Name or/.test(value))
    return value.replace("Name or", "Name or ID");
  return value.concat(" Name or ID");
}
function addApiSuffix(name, { uppercased } = { uppercased: false }) {
  if (name.endsWith("Ap"))
    return uppercased ? `${name}I` : `${name}i`;
  if (name.endsWith("A"))
    return uppercased ? `${name}PI` : `${name}pi`;
  return uppercased ? `${name} API` : `${name}Api`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addApiSuffix,
  addEndSegment,
  getInsertionArgs,
  keyValue
});
