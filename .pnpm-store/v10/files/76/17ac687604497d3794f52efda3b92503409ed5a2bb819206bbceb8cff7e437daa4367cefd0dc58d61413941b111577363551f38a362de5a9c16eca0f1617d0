require("../../../_virtual/_rolldown/runtime.cjs");
const require_any = require("./any.cjs");
const require_branded = require("./branded.cjs");
const require_string = require("./string.cjs");
const require_parseDef = require("../parseDef.cjs");
let zod_v3 = require("zod/v3");
//#region src/utils/zod-to-json-schema/parsers/record.ts
function parseRecordDef(def, refs) {
	if (refs.target === "openAi") console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
	if (refs.target === "openApi3" && def.keyType?._def.typeName === zod_v3.ZodFirstPartyTypeKind.ZodEnum) return {
		type: "object",
		required: def.keyType._def.values,
		properties: def.keyType._def.values.reduce((acc, key) => ({
			...acc,
			[key]: require_parseDef.parseDef(def.valueType._def, {
				...refs,
				currentPath: [
					...refs.currentPath,
					"properties",
					key
				]
			}) ?? require_any.parseAnyDef(refs)
		}), {}),
		additionalProperties: refs.rejectedAdditionalProperties
	};
	const schema = {
		type: "object",
		additionalProperties: require_parseDef.parseDef(def.valueType._def, {
			...refs,
			currentPath: [...refs.currentPath, "additionalProperties"]
		}) ?? refs.allowedAdditionalProperties
	};
	if (refs.target === "openApi3") return schema;
	if (def.keyType?._def.typeName === zod_v3.ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
		const { type, ...keyType } = require_string.parseStringDef(def.keyType._def, refs);
		return {
			...schema,
			propertyNames: keyType
		};
	} else if (def.keyType?._def.typeName === zod_v3.ZodFirstPartyTypeKind.ZodEnum) return {
		...schema,
		propertyNames: { enum: def.keyType._def.values }
	};
	else if (def.keyType?._def.typeName === zod_v3.ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === zod_v3.ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
		const { type, ...keyType } = require_branded.parseBrandedDef(def.keyType._def, refs);
		return {
			...schema,
			propertyNames: keyType
		};
	}
	return schema;
}
//#endregion
exports.parseRecordDef = parseRecordDef;

//# sourceMappingURL=record.cjs.map