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
var children_exports = {};
__export(children_exports, {
  Children: () => Children,
  toArray: () => toArray
});
module.exports = __toCommonJS(children_exports);
const toArray = (children) => Array.isArray(children) ? children : [children];
const Children = {
  map: (children, fn) => toArray(children).map(fn),
  forEach: (children, fn) => {
    toArray(children).forEach(fn);
  },
  count: (children) => toArray(children).length,
  only: (_children) => {
    const children = toArray(_children);
    if (children.length !== 1) {
      throw new Error("Children.only() expects only one child");
    }
    return children[0];
  },
  toArray
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Children,
  toArray
});
