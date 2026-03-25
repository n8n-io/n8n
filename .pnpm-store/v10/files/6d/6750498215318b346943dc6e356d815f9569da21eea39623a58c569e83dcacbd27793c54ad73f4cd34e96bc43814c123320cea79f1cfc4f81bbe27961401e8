import { parseAnyDef } from "./any.js";
import { parseDef } from "../parseDef.js";
//#region src/utils/zod-to-json-schema/parsers/effects.ts
function parseEffectsDef(_def, refs) {
	return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef(refs);
}
//#endregion
export { parseEffectsDef };

//# sourceMappingURL=effects.js.map