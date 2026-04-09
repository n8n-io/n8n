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
var test_helpers_exports = {};
__export(test_helpers_exports, {
  getSchemaAndData: () => getSchemaAndData
});
module.exports = __toCommonJS(test_helpers_exports);
var import_fs = require("fs");
var import_jest_fixtures = require("jest-fixtures");
async function getSchemaAndData(name, dirPath) {
  const schemaPath = await (0, import_jest_fixtures.getFixturePath)(dirPath, name, "schema.json");
  const schema = JSON.parse((0, import_fs.readFileSync)(schemaPath, "utf8"));
  const dataPath = await (0, import_jest_fixtures.getFixturePath)(dirPath, name, "data.json");
  const json = (0, import_fs.readFileSync)(dataPath, "utf8");
  const data = JSON.parse(json);
  return [schema, data, json];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getSchemaAndData
});
//# sourceMappingURL=test-helpers.js.map
