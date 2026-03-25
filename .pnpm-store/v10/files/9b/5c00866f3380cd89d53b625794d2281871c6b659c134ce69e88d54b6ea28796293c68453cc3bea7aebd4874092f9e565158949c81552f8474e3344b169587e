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
var format_exports = {};
__export(format_exports, {
  clean_OLD: () => clean_OLD,
  formatItems: () => formatItems,
  getBaseIndentationForOption: () => getBaseIndentationForOption,
  getIndentationString: () => getIndentationString,
  isAllowedLowercase: () => isAllowedLowercase,
  isKebabCase: () => isKebabCase,
  toDisplayOrder: () => toDisplayOrder,
  toDisplayOrderForCollection: () => toDisplayOrderForCollection
});
module.exports = __toCommonJS(format_exports);
var import_constants = require("../../constants");
var import_functional = require("./functional");
function formatItems(obj, baseIndentation) {
  const str = JSON.stringify(obj, null, 2);
  const punctuated = (0, import_functional.pipe)(addTrailingCommas, singleQuoteAll, unquoteKeys)(str);
  return indent(punctuated, baseIndentation);
}
function addTrailingCommas(str) {
  return str.replace(/(\})(\s)/g, "$1,$2").replace(/(\])(\s)/g, "$1,$2").replace(/(\s+)(\},)/g, ",$1$2");
}
function singleQuoteAll(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, "'");
}
function unquoteKeys(str) {
  return str.replace(/'(.*)':/g, "$1:");
}
function indent(str, baseIndentation) {
  return str.split("\n").map((line) => {
    const match = line.match(/^(?<leadingWhitespace>\s*)(?<rest>.*)/);
    if (!match || !match.groups)
      return line;
    const { leadingWhitespace, rest } = match.groups;
    if (!rest)
      return line;
    if (!leadingWhitespace) {
      return baseIndentation + "	" + rest;
    }
    if (rest.startsWith("{") || rest.startsWith("}")) {
      return baseIndentation + "	".repeat(leadingWhitespace.length) + rest;
    }
    return baseIndentation + "	".repeat(leadingWhitespace.length - 1) + rest;
  }).join("\n").trim();
}
function clean_OLD(obj, indentation) {
  const clean = JSON.stringify(obj, null, 2).replace(/\'/g, "\\'").replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, (m) => m.replace(/"/g, "")).replace(/"/g, "'").replace(/\}\s/g, "},\n").replace("]", "	]").replace(/ /g, "	").replace(/\tname:\t/g, "name: ").replace(/\tvalue:\t/g, "value: ").replace(/\tdisplayName:\t/g, "displayName: ").replace(/\tdescription:\t/g, "description: ").replace(/\tplaceholder:\t/g, "placeholder: ").replace(/\toptions:\t/g, "options: ").replace(/\ttype:\t/g, "type: ").replace(/\tdefault:\t/g, "default: ").replace(/(\.)\t\b/g, ". ").replace(/\t\(/g, " (").replace(/\t</g, " <").replace(/\)\t/g, ") ").replace(/,\t\b/g, ", ").replace(/\t\\/g, " \\").replace(/'\t/g, "' ").replace(/\b\t\b/g, " ").replace(/'\s\t/g, "',\n	").replace(/false\n/g, "false,\n").replace(/true\n/g, "true,\n").replace(/href=\\'/g, 'href="').replace(/\\'>/g, '">').replace(/\n/g, `
${indentation}`).replace(/\t{8}/gm, `${"	".repeat(6)}`).replace(/^\t{2}\]/gm, `${"	".repeat(3)}]`).replace(/^\t{7}\]/gm, `${"	".repeat(5)}]`);
  return clean;
}
function toDisplayOrder(options) {
  return options.reduce((acc, cur) => {
    return acc.push(cur.name), acc;
  }, []).join(" | ");
}
function toDisplayOrderForCollection(options) {
  return options.reduce((acc, cur) => {
    return acc.push(cur.displayName), acc;
  }, []).join(" | ");
}
const getIndentationString = (referenceNode) => {
  return "	".repeat(referenceNode.ast.loc.start.column);
};
const getBaseIndentationForOption = (referenceNode) => {
  return "	".repeat(referenceNode.ast.loc.start.column - 1);
};
function isKebabCase(str) {
  if (str !== str.toLowerCase())
    return false;
  if (/\s/.test(str))
    return false;
  if (!/-/.test(str))
    return false;
  return str === str.toLowerCase().replace(/\s/g, "-");
}
function isAllowedLowercase(value) {
  if (isUrl(value))
    return true;
  if (isKebabCase(value))
    return true;
  if (import_constants.VERSION_REGEX.test(value))
    return true;
  return ["bmp", "tiff", "gif", "jpg", "jpeg", "png", "webp"].includes(value);
}
function isUrl(str) {
  try {
    if (["com", "org", "net", "io", "edu"].includes(str.slice(-3)))
      return true;
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clean_OLD,
  formatItems,
  getBaseIndentationForOption,
  getIndentationString,
  isAllowedLowercase,
  isKebabCase,
  toDisplayOrder,
  toDisplayOrderForCollection
});
