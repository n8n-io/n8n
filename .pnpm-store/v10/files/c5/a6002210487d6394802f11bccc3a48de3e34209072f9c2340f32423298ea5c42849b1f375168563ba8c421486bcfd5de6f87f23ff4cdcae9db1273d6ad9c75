
//#region src/state/types.ts
function isStandardSchema(schema) {
	return typeof schema === "object" && schema !== null && "~standard" in schema && typeof schema["~standard"] === "object" && schema["~standard"] !== null && "validate" in schema["~standard"];
}
function isStandardJSONSchema(schema) {
	return typeof schema === "object" && schema !== null && "~standard" in schema && typeof schema["~standard"] === "object" && schema["~standard"] !== null && "jsonSchema" in schema["~standard"];
}
function isSerializableSchema(schema) {
	return isStandardSchema(schema) && isStandardJSONSchema(schema);
}

//#endregion
exports.isSerializableSchema = isSerializableSchema;
exports.isStandardJSONSchema = isStandardJSONSchema;
exports.isStandardSchema = isStandardSchema;
//# sourceMappingURL=types.cjs.map