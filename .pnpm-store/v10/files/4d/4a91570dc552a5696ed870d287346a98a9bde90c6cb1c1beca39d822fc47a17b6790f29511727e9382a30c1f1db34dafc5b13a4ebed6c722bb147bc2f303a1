const require_getRelativePath = require("../getRelativePath.cjs");
//#region src/utils/zod-to-json-schema/parsers/any.ts
function parseAnyDef(refs) {
	if (refs.target !== "openAi") return {};
	const anyDefinitionPath = [
		...refs.basePath,
		refs.definitionPath,
		refs.openAiAnyTypeName
	];
	refs.flags.hasReferencedOpenAiAnyType = true;
	return { $ref: refs.$refStrategy === "relative" ? require_getRelativePath.getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/") };
}
//#endregion
exports.parseAnyDef = parseAnyDef;

//# sourceMappingURL=any.cjs.map