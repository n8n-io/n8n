const require_errorMessages = require("../errorMessages.cjs");
//#region src/utils/zod-to-json-schema/parsers/number.ts
function parseNumberDef(def, refs) {
	const res = { type: "number" };
	if (!def.checks) return res;
	for (const check of def.checks) switch (check.kind) {
		case "int":
			res.type = "integer";
			require_errorMessages.addErrorMessage(res, "type", check.message, refs);
			break;
		case "min":
			if (refs.target === "jsonSchema7") if (check.inclusive) require_errorMessages.setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
			else require_errorMessages.setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
			else {
				if (!check.inclusive) res.exclusiveMinimum = true;
				require_errorMessages.setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
			}
			break;
		case "max":
			if (refs.target === "jsonSchema7") if (check.inclusive) require_errorMessages.setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
			else require_errorMessages.setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
			else {
				if (!check.inclusive) res.exclusiveMaximum = true;
				require_errorMessages.setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
			}
			break;
		case "multipleOf":
			require_errorMessages.setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
			break;
	}
	return res;
}
//#endregion
exports.parseNumberDef = parseNumberDef;

//# sourceMappingURL=number.cjs.map