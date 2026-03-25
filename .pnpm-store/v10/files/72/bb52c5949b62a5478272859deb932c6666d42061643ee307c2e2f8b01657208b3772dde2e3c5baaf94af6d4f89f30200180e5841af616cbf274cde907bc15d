import { getRefs } from "./Refs.js";
import { parseAnyDef } from "./parsers/any.js";
import { parseDef } from "./parseDef.js";
//#region src/utils/zod-to-json-schema/zodToJsonSchema.ts
const zodToJsonSchema = (schema, options) => {
	const refs = getRefs(options);
	let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name, schema]) => ({
		...acc,
		[name]: parseDef(schema._def, {
			...refs,
			currentPath: [
				...refs.basePath,
				refs.definitionPath,
				name
			]
		}, true) ?? parseAnyDef(refs)
	}), {}) : void 0;
	const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
	const main = parseDef(schema._def, name === void 0 ? refs : {
		...refs,
		currentPath: [
			...refs.basePath,
			refs.definitionPath,
			name
		]
	}, false) ?? parseAnyDef(refs);
	const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
	if (title !== void 0) main.title = title;
	if (refs.flags.hasReferencedOpenAiAnyType) {
		if (!definitions) definitions = {};
		if (!definitions[refs.openAiAnyTypeName]) definitions[refs.openAiAnyTypeName] = {
			type: [
				"string",
				"number",
				"integer",
				"boolean",
				"array",
				"null"
			],
			items: { $ref: refs.$refStrategy === "relative" ? "1" : [
				...refs.basePath,
				refs.definitionPath,
				refs.openAiAnyTypeName
			].join("/") }
		};
	}
	const combined = name === void 0 ? definitions ? {
		...main,
		[refs.definitionPath]: definitions
	} : main : {
		$ref: [
			...refs.$refStrategy === "relative" ? [] : refs.basePath,
			refs.definitionPath,
			name
		].join("/"),
		[refs.definitionPath]: {
			...definitions,
			[name]: main
		}
	};
	if (refs.target === "jsonSchema7") combined.$schema = "http://json-schema.org/draft-07/schema#";
	else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
	if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
	return combined;
};
//#endregion
export { zodToJsonSchema };

//# sourceMappingURL=zodToJsonSchema.js.map