const require_any = require("./any.cjs");
//#region src/utils/zod-to-json-schema/parsers/never.ts
function parseNeverDef(refs) {
	return refs.target === "openAi" ? void 0 : { not: require_any.parseAnyDef({
		...refs,
		currentPath: [...refs.currentPath, "not"]
	}) };
}
//#endregion
exports.parseNeverDef = parseNeverDef;

//# sourceMappingURL=never.cjs.map