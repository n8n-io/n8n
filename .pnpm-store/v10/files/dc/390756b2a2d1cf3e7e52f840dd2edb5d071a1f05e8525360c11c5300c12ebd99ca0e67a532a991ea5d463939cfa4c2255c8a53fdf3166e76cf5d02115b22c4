const require_any = require("./any.cjs");
const require_parseDef = require("../parseDef.cjs");
//#region src/utils/zod-to-json-schema/parsers/effects.ts
function parseEffectsDef(_def, refs) {
	return refs.effectStrategy === "input" ? require_parseDef.parseDef(_def.schema._def, refs) : require_any.parseAnyDef(refs);
}
//#endregion
exports.parseEffectsDef = parseEffectsDef;

//# sourceMappingURL=effects.cjs.map