import snakeCase from "decamelize";
import camelCase from "camelcase";
//#region src/load/map_keys.ts
function keyToJson(key, map) {
	return map?.[key] || snakeCase(key);
}
function keyFromJson(key, map) {
	return map?.[key] || camelCase(key);
}
function mapKeys(fields, mapper, map) {
	const mapped = {};
	for (const key in fields) if (Object.hasOwn(fields, key)) mapped[mapper(key, map)] = fields[key];
	return mapped;
}
//#endregion
export { keyFromJson, keyToJson, mapKeys };

//# sourceMappingURL=map_keys.js.map