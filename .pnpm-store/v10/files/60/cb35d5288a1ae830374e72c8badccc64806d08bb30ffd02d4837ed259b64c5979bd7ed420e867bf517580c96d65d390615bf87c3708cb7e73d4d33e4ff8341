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
var sort_exports = {};
__export(sort_exports, {
  areIdenticallySortedOptions: () => areIdenticallySortedOptions,
  areIdenticallySortedOptionsForCollection: () => areIdenticallySortedOptionsForCollection,
  areIdenticallySortedParams: () => areIdenticallySortedParams,
  optionComparator: () => optionComparator,
  optionComparatorForCollection: () => optionComparatorForCollection
});
module.exports = __toCommonJS(sort_exports);
var import_constants = require("../../constants");
function areIdenticallySortedOptions(first, second) {
  for (let i = 0; i < first.length; i++) {
    if (first[i].name !== second[i].name)
      return false;
  }
  return true;
}
function areIdenticallySortedOptionsForCollection(first, second) {
  for (let i = 0; i < first.length; i++) {
    if (first[i].displayName !== second[i].displayName)
      return false;
  }
  return true;
}
function optionComparator(a, b) {
  if (import_constants.VERSION_REGEX.test(a.name)) {
    if (a.name === b.name)
      return 0;
    return parseFloat(a.name.slice(1)) > parseFloat(b.name.slice(1)) ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}
function optionComparatorForCollection(a, b) {
  if (import_constants.VERSION_REGEX.test(a.displayName)) {
    if (a.displayName === b.displayName)
      return 0;
    return parseFloat(a.displayName.slice(1)) > parseFloat(b.displayName.slice(1)) ? -1 : 1;
  }
  return a.displayName.localeCompare(b.displayName);
}
function areIdenticallySortedParams(first, second) {
  for (let i = 0; i < first.length; i++) {
    if (first[i].displayName !== second[i].displayName)
      return false;
  }
  return true;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  areIdenticallySortedOptions,
  areIdenticallySortedOptionsForCollection,
  areIdenticallySortedParams,
  optionComparator,
  optionComparatorForCollection
});
