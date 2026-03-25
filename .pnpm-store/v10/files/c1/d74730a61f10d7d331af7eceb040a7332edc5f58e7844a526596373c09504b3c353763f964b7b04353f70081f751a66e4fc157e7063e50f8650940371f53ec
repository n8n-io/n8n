let _langchain_core_utils_types = require("@langchain/core/utils/types");
let _langchain_core_utils_json_schema = require("@langchain/core/utils/json_schema");
let _langchain_core_utils_standard_schema = require("@langchain/core/utils/standard_schema");

//#region src/utils/zod_to_genai_parameters.ts
function removeAdditionalProperties(obj) {
	if (typeof obj === "object" && obj !== null) {
		const newObj = { ...obj };
		if ("additionalProperties" in newObj) delete newObj.additionalProperties;
		if ("$schema" in newObj) delete newObj.$schema;
		if ("strict" in newObj) delete newObj.strict;
		for (const key in newObj) if (key in newObj) {
			if (Array.isArray(newObj[key])) newObj[key] = newObj[key].map(removeAdditionalProperties);
			else if (typeof newObj[key] === "object" && newObj[key] !== null) newObj[key] = removeAdditionalProperties(newObj[key]);
		}
		return newObj;
	}
	return obj;
}
function schemaToGenerativeAIParameters(schema) {
	const { $schema, ...rest } = removeAdditionalProperties((0, _langchain_core_utils_types.isInteropZodSchema)(schema) || (0, _langchain_core_utils_standard_schema.isSerializableSchema)(schema) ? (0, _langchain_core_utils_json_schema.toJsonSchema)(schema) : schema);
	return rest;
}
function jsonSchemaToGeminiParameters(schema) {
	const { $schema, ...rest } = removeAdditionalProperties(schema);
	return rest;
}

//#endregion
exports.jsonSchemaToGeminiParameters = jsonSchemaToGeminiParameters;
exports.removeAdditionalProperties = removeAdditionalProperties;
exports.schemaToGenerativeAIParameters = schemaToGenerativeAIParameters;
//# sourceMappingURL=zod_to_genai_parameters.cjs.map