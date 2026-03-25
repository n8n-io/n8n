Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region src/utils/standard_schema.ts
var standard_schema_exports = /* @__PURE__ */ require("../_virtual/_rolldown/runtime.cjs").__exportAll({
	isSerializableSchema: () => isSerializableSchema,
	isStandardJsonSchema: () => isStandardJsonSchema,
	isStandardSchema: () => isStandardSchema
});
/**
* Type guard for Standard Schema V1. Returns true if the value has a `~standard.validate`
* interface, indicating it can validate unknown values at runtime (e.g. for parsing LLM output).
*/
function isStandardSchema(schema) {
	return (typeof schema === "object" || typeof schema === "function") && schema !== null && "~standard" in schema && typeof schema["~standard"] === "object" && schema["~standard"] !== null && "validate" in schema["~standard"];
}
/**
* Type guard for Standard JSON Schema V1. Returns true if the value has a `~standard.jsonSchema`
* interface, indicating it can be converted to a JSON Schema object (e.g. for sending as a tool
* definition to an LLM).
*/
function isStandardJsonSchema(schema) {
	return (typeof schema === "object" || typeof schema === "function") && schema !== null && "~standard" in schema && typeof schema["~standard"] === "object" && schema["~standard"] !== null && "jsonSchema" in schema["~standard"];
}
/**
* Type guard for Standard Schema V1. Returns true if the value has a `~standard.validate` interface,
* indicating it can validate unknown values at runtime (e.g. for parsing LLM output).
*/
function isSerializableSchema(schema) {
	return isStandardSchema(schema) && isStandardJsonSchema(schema);
}
//#endregion
exports.isSerializableSchema = isSerializableSchema;
exports.isStandardJsonSchema = isStandardJsonSchema;
exports.isStandardSchema = isStandardSchema;
Object.defineProperty(exports, "standard_schema_exports", {
	enumerable: true,
	get: function() {
		return standard_schema_exports;
	}
});

//# sourceMappingURL=standard_schema.cjs.map