import { parseAnyDef } from "./any.js";
import { parseRecordDef } from "./record.js";
import { parseDef } from "../parseDef.js";
//#region src/utils/zod-to-json-schema/parsers/map.ts
function parseMapDef(def, refs) {
	if (refs.mapStrategy === "record") return parseRecordDef(def, refs);
	return {
		type: "array",
		maxItems: 125,
		items: {
			type: "array",
			items: [parseDef(def.keyType._def, {
				...refs,
				currentPath: [
					...refs.currentPath,
					"items",
					"items",
					"0"
				]
			}) || parseAnyDef(refs), parseDef(def.valueType._def, {
				...refs,
				currentPath: [
					...refs.currentPath,
					"items",
					"items",
					"1"
				]
			}) || parseAnyDef(refs)],
			minItems: 2,
			maxItems: 2
		}
	};
}
//#endregion
export { parseMapDef };

//# sourceMappingURL=map.js.map