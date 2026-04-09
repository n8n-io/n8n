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
var get_decorated_data_path_exports = {};
__export(get_decorated_data_path_exports, {
  default: () => getDecoratedDataPath
});
module.exports = __toCommonJS(get_decorated_data_path_exports);
var import_utils = require("./utils");
function getDecoratedDataPath(jsonAst, dataPath) {
  let decoratedPath = "";
  (0, import_utils.getPointers)(dataPath).reduce((obj, pointer) => {
    switch (obj.type) {
      case "Object": {
        decoratedPath += `/${pointer}`;
        const filtered = obj.members.filter((child) => child.name.value === pointer);
        if (filtered.length !== 1) {
          throw new Error(`Couldn't find property ${pointer} of ${dataPath}`);
        }
        return filtered[0].value;
      }
      case "Array": {
        decoratedPath += `/${pointer}${getTypeName(obj.elements[pointer])}`;
        return obj.elements[pointer];
      }
      default:
        console.log(obj);
    }
  }, jsonAst.body);
  return decoratedPath;
}
function getTypeName(obj) {
  if (!obj || !obj.elements) {
    return "";
  }
  const type = obj.elements.filter((child) => child && child.name && child.name.value === "type");
  if (!type.length) {
    return "";
  }
  return type[0].value && `:${type[0].value.value}` || "";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=get-decorated-data-path.js.map
