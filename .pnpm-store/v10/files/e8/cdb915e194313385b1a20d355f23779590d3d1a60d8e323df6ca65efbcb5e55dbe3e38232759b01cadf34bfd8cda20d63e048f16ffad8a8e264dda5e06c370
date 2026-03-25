const require_errorMessages = require("../errorMessages.cjs");
const require_parseDef = require("../parseDef.cjs");
//#region src/utils/zod-to-json-schema/parsers/set.ts
function parseSetDef(def, refs) {
	const schema = {
		type: "array",
		uniqueItems: true,
		items: require_parseDef.parseDef(def.valueType._def, {
			...refs,
			currentPath: [...refs.currentPath, "items"]
		})
	};
	if (def.minSize) require_errorMessages.setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
	if (def.maxSize) require_errorMessages.setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
	return schema;
}
//#endregion
exports.parseSetDef = parseSetDef;

//# sourceMappingURL=set.cjs.map