import { setResponseValueAndErrors } from "../errorMessages.js";
import { parseDef } from "../parseDef.js";
//#region src/utils/zod-to-json-schema/parsers/set.ts
function parseSetDef(def, refs) {
	const schema = {
		type: "array",
		uniqueItems: true,
		items: parseDef(def.valueType._def, {
			...refs,
			currentPath: [...refs.currentPath, "items"]
		})
	};
	if (def.minSize) setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
	if (def.maxSize) setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
	return schema;
}
//#endregion
export { parseSetDef };

//# sourceMappingURL=set.js.map