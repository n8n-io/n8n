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
var base_exports = {};
__export(base_exports, {
  default: () => BaseValidationError
});
module.exports = __toCommonJS(base_exports);
var import_code_frame = require("@babel/code-frame");
var import_json = require("../json/index");
class BaseValidationError {
  constructor(options = { isIdentifierLocation: false }, { data, schema, jsonAst, jsonRaw }) {
    this.options = options;
    this.data = data;
    this.schema = schema;
    this.jsonAst = jsonAst;
    this.jsonRaw = jsonRaw;
  }
  getLocation(dataPath = this.instancePath) {
    const { isIdentifierLocation, isSkipEndLocation } = this.options;
    const { loc } = (0, import_json.getMetaFromPath)(this.jsonAst, dataPath, isIdentifierLocation);
    return {
      start: loc.start,
      end: isSkipEndLocation ? void 0 : loc.end
    };
  }
  getDecoratedPath(dataPath = this.instancePath) {
    const decoratedPath = (0, import_json.getDecoratedDataPath)(this.jsonAst, dataPath);
    return decoratedPath;
  }
  getCodeFrame(message, dataPath = this.instancePath) {
    return (0, import_code_frame.codeFrameColumns)(this.jsonRaw, this.getLocation(dataPath), {
      highlightCode: true,
      message
    });
  }
  get instancePath() {
    return typeof this.options.instancePath !== "undefined" ? this.options.instancePath : this.options.dataPath;
  }
  print() {
    throw new Error(`Implement the 'print' method inside ${this.constructor.name}!`);
  }
  getError() {
    throw new Error(`Implement the 'getError' method inside ${this.constructor.name}!`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=base.js.map
