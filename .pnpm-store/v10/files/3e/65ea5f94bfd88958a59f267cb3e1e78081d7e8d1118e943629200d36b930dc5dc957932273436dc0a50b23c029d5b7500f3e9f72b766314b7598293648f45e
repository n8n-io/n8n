const require_parseDef = require("../parseDef.cjs");
//#region src/utils/zod-to-json-schema/parsers/intersection.ts
const isJsonSchema7AllOfType = (type) => {
	if ("type" in type && type.type === "string") return false;
	return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
	const allOf = [require_parseDef.parseDef(def.left._def, {
		...refs,
		currentPath: [
			...refs.currentPath,
			"allOf",
			"0"
		]
	}), require_parseDef.parseDef(def.right._def, {
		...refs,
		currentPath: [
			...refs.currentPath,
			"allOf",
			"1"
		]
	})].filter((x) => !!x);
	let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
	const mergedAllOf = [];
	allOf.forEach((schema) => {
		if (isJsonSchema7AllOfType(schema)) {
			mergedAllOf.push(...schema.allOf);
			if (schema.unevaluatedProperties === void 0) unevaluatedProperties = void 0;
		} else {
			let nestedSchema = schema;
			if ("additionalProperties" in schema && schema.additionalProperties === false) {
				const { additionalProperties, ...rest } = schema;
				nestedSchema = rest;
			} else unevaluatedProperties = void 0;
			mergedAllOf.push(nestedSchema);
		}
	});
	return mergedAllOf.length ? {
		allOf: mergedAllOf,
		...unevaluatedProperties
	} : void 0;
}
//#endregion
exports.parseIntersectionDef = parseIntersectionDef;

//# sourceMappingURL=intersection.cjs.map