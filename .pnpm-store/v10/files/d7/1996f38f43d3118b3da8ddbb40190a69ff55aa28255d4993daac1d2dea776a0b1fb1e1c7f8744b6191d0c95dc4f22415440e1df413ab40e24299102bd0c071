const require_any = require("./any.cjs");
const require_parseDef = require("../parseDef.cjs");
//#region src/utils/zod-to-json-schema/parsers/optional.ts
const parseOptionalDef = (def, refs) => {
	if (refs.currentPath.toString() === refs.propertyPath?.toString()) return require_parseDef.parseDef(def.innerType._def, refs);
	const innerSchema = require_parseDef.parseDef(def.innerType._def, {
		...refs,
		currentPath: [
			...refs.currentPath,
			"anyOf",
			"1"
		]
	});
	return innerSchema ? { anyOf: [{ not: require_any.parseAnyDef(refs) }, innerSchema] } : require_any.parseAnyDef(refs);
};
//#endregion
exports.parseOptionalDef = parseOptionalDef;

//# sourceMappingURL=optional.cjs.map