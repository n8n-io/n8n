const require_types = require('./types.cjs');

//#region src/state/adapter.ts
/**
* Get the JSON schema from a SerializableSchema.
*/
function getJsonSchemaFromSchema(schema) {
	if (require_types.isStandardJSONSchema(schema)) try {
		return schema["~standard"].jsonSchema.input({ target: "draft-07" });
	} catch {
		return;
	}
}
/**
* Detect if a schema has a default value by validating `undefined`.
*
* Uses the Standard Schema `~standard.validate` API to detect defaults.
* If the schema accepts `undefined` and returns a value, that value is the default.
*
* This approach is library-agnostic and works with any Standard Schema compliant
* library (Zod, Valibot, ArkType, etc.) without needing to introspect internals.
*
* @param schema - The schema to check for a default value.
* @returns A factory function returning the default, or undefined if no default exists.
*
* @example
* ```ts
* const getter = getSchemaDefaultGetter(z.string().default("hello"));
* getter?.(); // "hello"
*
* const noDefault = getSchemaDefaultGetter(z.string());
* noDefault; // undefined
* ```
*/
function getSchemaDefaultGetter(schema) {
	if (schema == null) return;
	if (!require_types.isStandardSchema(schema)) return;
	try {
		const result = schema["~standard"].validate(void 0);
		if (result && typeof result === "object" && !("then" in result && typeof result.then === "function")) {
			const syncResult = result;
			if (!syncResult.issues) {
				const defaultValue = syncResult.value;
				return () => defaultValue;
			}
		}
	} catch {}
}

//#endregion
exports.getJsonSchemaFromSchema = getJsonSchemaFromSchema;
exports.getSchemaDefaultGetter = getSchemaDefaultGetter;
//# sourceMappingURL=adapter.cjs.map