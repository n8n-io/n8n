const require_any = require("./any.cjs");
const require_record = require("./record.cjs");
const require_parseDef = require("../parseDef.cjs");
//#region src/utils/zod-to-json-schema/parsers/map.ts
function parseMapDef(def, refs) {
	if (refs.mapStrategy === "record") return require_record.parseRecordDef(def, refs);
	return {
		type: "array",
		maxItems: 125,
		items: {
			type: "array",
			items: [require_parseDef.parseDef(def.keyType._def, {
				...refs,
				currentPath: [
					...refs.currentPath,
					"items",
					"items",
					"0"
				]
			}) || require_any.parseAnyDef(refs), require_parseDef.parseDef(def.valueType._def, {
				...refs,
				currentPath: [
					...refs.currentPath,
					"items",
					"items",
					"1"
				]
			}) || require_any.parseAnyDef(refs)],
			minItems: 2,
			maxItems: 2
		}
	};
}
//#endregion
exports.parseMapDef = parseMapDef;

//# sourceMappingURL=map.cjs.map