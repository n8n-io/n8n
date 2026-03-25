const require_errorMessages = require("../errorMessages.cjs");
//#region src/utils/zod-to-json-schema/parsers/date.ts
function parseDateDef(def, refs, overrideDateStrategy) {
	const strategy = overrideDateStrategy ?? refs.dateStrategy;
	if (Array.isArray(strategy)) return { anyOf: strategy.map((item) => parseDateDef(def, refs, item)) };
	switch (strategy) {
		case "string":
		case "format:date-time": return {
			type: "string",
			format: "date-time"
		};
		case "format:date": return {
			type: "string",
			format: "date"
		};
		case "integer": return integerDateParser(def, refs);
	}
}
const integerDateParser = (def, refs) => {
	const res = {
		type: "integer",
		format: "unix-time"
	};
	if (refs.target === "openApi3") return res;
	for (const check of def.checks) switch (check.kind) {
		case "min":
			require_errorMessages.setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
			break;
		case "max":
			require_errorMessages.setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
			break;
	}
	return res;
};
//#endregion
exports.parseDateDef = parseDateDef;

//# sourceMappingURL=date.cjs.map