import { parseDef } from "../parseDef.js";
//#region src/utils/zod-to-json-schema/parsers/default.ts
function parseDefaultDef(_def, refs) {
	return {
		...parseDef(_def.innerType._def, refs),
		default: _def.defaultValue()
	};
}
//#endregion
export { parseDefaultDef };

//# sourceMappingURL=default.js.map