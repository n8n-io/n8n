import { getRelativePath } from "../getRelativePath.js";
//#region src/utils/zod-to-json-schema/parsers/any.ts
function parseAnyDef(refs) {
	if (refs.target !== "openAi") return {};
	const anyDefinitionPath = [
		...refs.basePath,
		refs.definitionPath,
		refs.openAiAnyTypeName
	];
	refs.flags.hasReferencedOpenAiAnyType = true;
	return { $ref: refs.$refStrategy === "relative" ? getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/") };
}
//#endregion
export { parseAnyDef };

//# sourceMappingURL=any.js.map