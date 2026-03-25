Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_zod = require("./types/zod.cjs");
const require_zodToJsonSchema = require("./zod-to-json-schema/zodToJsonSchema.cjs");
require("./zod-to-json-schema/index.cjs");
const require_utils_standard_schema = require("./standard_schema.cjs");
let zod_v4_core = require("zod/v4/core");
let _cfworker_json_schema = require("@cfworker/json-schema");
//#region src/utils/json_schema.ts
var json_schema_exports = /* @__PURE__ */ require_runtime.__exportAll({
	Validator: () => _cfworker_json_schema.Validator,
	deepCompareStrict: () => _cfworker_json_schema.deepCompareStrict,
	toJsonSchema: () => toJsonSchema,
	validatesOnlyStrings: () => validatesOnlyStrings
});
/**
* Converts a Standard JSON schema, Zod schema or JSON schema to a JSON schema.
* @param schema - The schema to convert.
* @param params - The parameters to pass to the toJSONSchema function.
* @returns The converted schema.
*/
function toJsonSchema(schema, params) {
	if (require_utils_standard_schema.isStandardJsonSchema(schema) && !require_zod.isZodSchemaV4(schema)) return schema["~standard"].jsonSchema.input({ target: "draft-07" });
	if (require_zod.isZodSchemaV4(schema)) {
		const inputSchema = require_zod.interopZodTransformInputSchema(schema, true);
		if (require_zod.isZodObjectV4(inputSchema)) return (0, zod_v4_core.toJSONSchema)(require_zod.interopZodObjectStrict(inputSchema, true), params);
		else return (0, zod_v4_core.toJSONSchema)(schema, params);
	}
	if (require_zod.isZodSchemaV3(schema)) return require_zodToJsonSchema.zodToJsonSchema(schema);
	return schema;
}
/**
* Validates if a JSON schema validates only strings. May return false negatives in some edge cases
* (like recursive or unresolvable refs).
*
* @param schema - The schema to validate.
* @returns `true` if the schema validates only strings, `false` otherwise.
*/
function validatesOnlyStrings(schema) {
	if (!schema || typeof schema !== "object" || Object.keys(schema).length === 0 || Array.isArray(schema)) return false;
	if ("type" in schema) {
		if (typeof schema.type === "string") return schema.type === "string";
		if (Array.isArray(schema.type)) return schema.type.every((t) => t === "string");
		return false;
	}
	if ("enum" in schema) return Array.isArray(schema.enum) && schema.enum.length > 0 && schema.enum.every((val) => typeof val === "string");
	if ("const" in schema) return typeof schema.const === "string";
	if ("allOf" in schema && Array.isArray(schema.allOf)) return schema.allOf.some((subschema) => validatesOnlyStrings(subschema));
	if ("anyOf" in schema && Array.isArray(schema.anyOf) || "oneOf" in schema && Array.isArray(schema.oneOf)) {
		const subschemas = "anyOf" in schema ? schema.anyOf : schema.oneOf;
		return subschemas.length > 0 && subschemas.every((subschema) => validatesOnlyStrings(subschema));
	}
	if ("not" in schema) return false;
	if ("$ref" in schema && typeof schema.$ref === "string") {
		const ref = schema.$ref;
		const resolved = (0, _cfworker_json_schema.dereference)(schema);
		if (resolved[ref]) return validatesOnlyStrings(resolved[ref]);
		return false;
	}
	return false;
}
//#endregion
Object.defineProperty(exports, "Validator", {
	enumerable: true,
	get: function() {
		return _cfworker_json_schema.Validator;
	}
});
Object.defineProperty(exports, "deepCompareStrict", {
	enumerable: true,
	get: function() {
		return _cfworker_json_schema.deepCompareStrict;
	}
});
Object.defineProperty(exports, "json_schema_exports", {
	enumerable: true,
	get: function() {
		return json_schema_exports;
	}
});
exports.toJsonSchema = toJsonSchema;
exports.validatesOnlyStrings = validatesOnlyStrings;

//# sourceMappingURL=json_schema.cjs.map