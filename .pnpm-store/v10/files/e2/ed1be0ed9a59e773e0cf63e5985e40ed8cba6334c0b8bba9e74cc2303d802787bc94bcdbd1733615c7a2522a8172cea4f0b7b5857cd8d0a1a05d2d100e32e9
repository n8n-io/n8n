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
var common_exports = {};
__export(common_exports, {
  dataPrecedenceAttr: () => dataPrecedenceAttr,
  deDupeKeyMap: () => deDupeKeyMap,
  domRenderers: () => domRenderers,
  isStylesheetLinkWithPrecedence: () => isStylesheetLinkWithPrecedence,
  shouldDeDupeByKey: () => shouldDeDupeByKey
});
module.exports = __toCommonJS(common_exports);
const deDupeKeyMap = {
  title: [],
  script: ["src"],
  style: ["data-href"],
  link: ["href"],
  meta: ["name", "httpEquiv", "charset", "itemProp"]
};
const domRenderers = {};
const dataPrecedenceAttr = "data-precedence";
const isStylesheetLinkWithPrecedence = (props) => props.rel === "stylesheet" && "precedence" in props;
const shouldDeDupeByKey = (tagName, supportSort) => {
  if (tagName === "link") {
    return supportSort;
  }
  return deDupeKeyMap[tagName].length > 0;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dataPrecedenceAttr,
  deDupeKeyMap,
  domRenderers,
  isStylesheetLinkWithPrecedence,
  shouldDeDupeByKey
});
