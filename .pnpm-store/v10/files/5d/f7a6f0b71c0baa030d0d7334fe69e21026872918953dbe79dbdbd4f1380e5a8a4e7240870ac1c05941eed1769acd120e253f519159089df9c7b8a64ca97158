const require_parseDef = require("../parseDef.cjs");
//#region src/utils/zod-to-json-schema/parsers/pipeline.ts
const parsePipelineDef = (def, refs) => {
	if (refs.pipeStrategy === "input") return require_parseDef.parseDef(def.in._def, refs);
	else if (refs.pipeStrategy === "output") return require_parseDef.parseDef(def.out._def, refs);
	const a = require_parseDef.parseDef(def.in._def, {
		...refs,
		currentPath: [
			...refs.currentPath,
			"allOf",
			"0"
		]
	});
	return { allOf: [a, require_parseDef.parseDef(def.out._def, {
		...refs,
		currentPath: [
			...refs.currentPath,
			"allOf",
			a ? "1" : "0"
		]
	})].filter((x) => x !== void 0) };
};
//#endregion
exports.parsePipelineDef = parsePipelineDef;

//# sourceMappingURL=pipeline.cjs.map