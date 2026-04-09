// src/test-helpers.js
import { readFileSync } from "fs";
import { getFixturePath } from "jest-fixtures";
async function getSchemaAndData(name, dirPath) {
  const schemaPath = await getFixturePath(dirPath, name, "schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const dataPath = await getFixturePath(dirPath, name, "data.json");
  const json = readFileSync(dataPath, "utf8");
  const data = JSON.parse(json);
  return [schema, data, json];
}
export {
  getSchemaAndData
};
//# sourceMappingURL=test-helpers.mjs.map
