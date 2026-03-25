const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
let decamelize = require("decamelize");
decamelize = require_runtime.__toESM(decamelize);
let camelcase = require("camelcase");
camelcase = require_runtime.__toESM(camelcase);
//#region src/load/map_keys.ts
function keyToJson(key, map) {
	return map?.[key] || (0, decamelize.default)(key);
}
function keyFromJson(key, map) {
	return map?.[key] || (0, camelcase.default)(key);
}
function mapKeys(fields, mapper, map) {
	const mapped = {};
	for (const key in fields) if (Object.hasOwn(fields, key)) mapped[mapper(key, map)] = fields[key];
	return mapped;
}
//#endregion
exports.keyFromJson = keyFromJson;
exports.keyToJson = keyToJson;
exports.mapKeys = mapKeys;

//# sourceMappingURL=map_keys.cjs.map