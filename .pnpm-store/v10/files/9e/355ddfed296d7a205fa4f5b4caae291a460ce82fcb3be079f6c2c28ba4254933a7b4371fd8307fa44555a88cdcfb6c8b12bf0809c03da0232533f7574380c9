const require_parseDef = require("../parseDef.cjs");
//#region src/utils/zod-to-json-schema/parsers/default.ts
function parseDefaultDef(_def, refs) {
	return {
		...require_parseDef.parseDef(_def.innerType._def, refs),
		default: _def.defaultValue()
	};
}
//#endregion
exports.parseDefaultDef = parseDefaultDef;

//# sourceMappingURL=default.cjs.map