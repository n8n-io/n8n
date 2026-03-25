import { parseAnyDef } from "./any.js";
//#region src/utils/zod-to-json-schema/parsers/never.ts
function parseNeverDef(refs) {
	return refs.target === "openAi" ? void 0 : { not: parseAnyDef({
		...refs,
		currentPath: [...refs.currentPath, "not"]
	}) };
}
//#endregion
export { parseNeverDef };

//# sourceMappingURL=never.js.map