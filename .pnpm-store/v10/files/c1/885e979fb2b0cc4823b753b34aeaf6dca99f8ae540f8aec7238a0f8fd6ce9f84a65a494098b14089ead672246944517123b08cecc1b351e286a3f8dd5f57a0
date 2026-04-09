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
var get_meta_from_path_exports = {};
__export(get_meta_from_path_exports, {
  default: () => getMetaFromPath
});
module.exports = __toCommonJS(get_meta_from_path_exports);
var import_utils = require("./utils");
function getMetaFromPath(jsonAst, dataPath, includeIdentifierLocation) {
  const pointers = (0, import_utils.getPointers)(dataPath);
  const lastPointerIndex = pointers.length - 1;
  return pointers.reduce((obj, pointer, idx) => {
    switch (obj.type) {
      case "Object": {
        const filtered = obj.members.filter((child) => child.name.value === pointer);
        if (filtered.length !== 1) {
          throw new Error(`Couldn't find property ${pointer} of ${dataPath}`);
        }
        const { name, value } = filtered[0];
        return includeIdentifierLocation && idx === lastPointerIndex ? name : value;
      }
      case "Array":
        return obj.elements[pointer];
      default:
        console.log(obj);
    }
  }, jsonAst.body);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=get-meta-from-path.js.map
