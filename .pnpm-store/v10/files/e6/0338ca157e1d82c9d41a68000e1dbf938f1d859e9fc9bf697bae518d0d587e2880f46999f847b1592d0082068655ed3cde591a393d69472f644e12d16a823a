require("../../../_virtual/_rolldown/runtime.cjs");
const require_errorMessages = require("../errorMessages.cjs");
const require_parseDef = require("../parseDef.cjs");
let zod_v3 = require("zod/v3");
//#region src/utils/zod-to-json-schema/parsers/array.ts
function parseArrayDef(def, refs) {
	const res = { type: "array" };
	if (def.type?._def && def.type?._def?.typeName !== zod_v3.ZodFirstPartyTypeKind.ZodAny) res.items = require_parseDef.parseDef(def.type._def, {
		...refs,
		currentPath: [...refs.currentPath, "items"]
	});
	if (def.minLength) require_errorMessages.setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
	if (def.maxLength) require_errorMessages.setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
	if (def.exactLength) {
		require_errorMessages.setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
		require_errorMessages.setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
	}
	return res;
}
//#endregion
exports.parseArrayDef = parseArrayDef;

//# sourceMappingURL=array.cjs.map