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
var mock_utils_exports = {};
__export(mock_utils_exports, {
  isSubset: () => isSubset,
  sortedUrl: () => sortedUrl,
  toSortedQueryString: () => toSortedQueryString
});
module.exports = __toCommonJS(mock_utils_exports);
var import_utils = require("../utils/index");
function toSortedQueryString(entry) {
  if (!(0, import_utils.isPlainObject)(entry)) {
    return entry;
  }
  return (0, import_utils.validKeys)(entry).sort().map((key) => {
    const value = entry[key];
    if ((0, import_utils.isPlainObject)(value)) {
      return toSortedQueryString(value);
    }
    return (0, import_utils.buildRecursive)(key, value);
  }).join("&").replace(/%20/g, "+");
}
function filterByPredicate(object, predicate) {
  return Object.entries(object).filter(([key]) => predicate(key)).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}
function isSubset(A, B) {
  const keysFromA = (0, import_utils.validKeys)(A);
  const filteredB = filterByPredicate(B, (keyFromB) => keysFromA.includes(keyFromB));
  return toSortedQueryString(A) === toSortedQueryString(filteredB);
}
function sortedUrl(url) {
  const urlParts = url.split("?");
  if (urlParts.length > 1) {
    const query = urlParts[1];
    const sortedQuery = query.split("&").sort().join("&");
    return `${urlParts[0]}?${sortedQuery}`;
  } else {
    return urlParts[0];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isSubset,
  sortedUrl,
  toSortedQueryString
});
//# sourceMappingURL=mock-utils.js.map