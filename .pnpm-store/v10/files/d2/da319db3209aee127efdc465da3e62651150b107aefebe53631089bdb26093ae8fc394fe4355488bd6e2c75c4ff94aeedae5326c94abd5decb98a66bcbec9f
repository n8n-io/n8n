require("../../_virtual/_rolldown/runtime.cjs");
let zod_v4_core = require("zod/v4/core");
//#region src/utils/types/zod.ts
function isZodSchemaV4(schema) {
	if (typeof schema !== "object" || schema === null) return false;
	const obj = schema;
	if (!("_zod" in obj)) return false;
	const zod = obj._zod;
	return typeof zod === "object" && zod !== null && "def" in zod;
}
function isZodSchemaV3(schema) {
	if (typeof schema !== "object" || schema === null) return false;
	const obj = schema;
	if (!("_def" in obj) || "_zod" in obj) return false;
	const def = obj._def;
	return typeof def === "object" && def != null && "typeName" in def;
}
/** Backward compatible isZodSchema for Zod 3 */
function isZodSchema(schema) {
	if (isZodSchemaV4(schema)) console.warn("[WARNING] Attempting to use Zod 4 schema in a context where Zod 3 schema is expected. This may cause unexpected behavior.");
	return isZodSchemaV3(schema);
}
/**
* Given either a Zod schema, or plain object, determine if the input is a Zod schema.
*
* @param {unknown} input
* @returns {boolean} Whether or not the provided input is a Zod schema.
*/
function isInteropZodSchema(input) {
	if (!input) return false;
	if (typeof input !== "object") return false;
	if (Array.isArray(input)) return false;
	if (isZodSchemaV4(input) || isZodSchemaV3(input)) return true;
	return false;
}
function isZodLiteralV3(obj) {
	if (typeof obj === "object" && obj !== null && "_def" in obj && typeof obj._def === "object" && obj._def !== null && "typeName" in obj._def && obj._def.typeName === "ZodLiteral") return true;
	return false;
}
function isZodLiteralV4(obj) {
	if (!isZodSchemaV4(obj)) return false;
	if (typeof obj === "object" && obj !== null && "_zod" in obj && typeof obj._zod === "object" && obj._zod !== null && "def" in obj._zod && typeof obj._zod.def === "object" && obj._zod.def !== null && "type" in obj._zod.def && obj._zod.def.type === "literal") return true;
	return false;
}
/**
* Determines if the provided value is an InteropZodLiteral (Zod v3 or v4 literal schema).
*
* @param obj The value to check.
* @returns {boolean} True if the value is a Zod v3 or v4 literal schema, false otherwise.
*/
function isInteropZodLiteral(obj) {
	if (isZodLiteralV3(obj)) return true;
	if (isZodLiteralV4(obj)) return true;
	return false;
}
/**
* Asynchronously parses the input using the provided Zod schema (v3 or v4) and returns a safe parse result.
* This function handles both Zod v3 and v4 schemas, returning a result object indicating success or failure.
*
* @template T - The expected output type of the schema.
* @param {InteropZodType<T>} schema - The Zod schema (v3 or v4) to use for parsing.
* @param {unknown} input - The input value to parse.
* @returns {Promise<InteropZodSafeParseResult<T>>} A promise that resolves to a safe parse result object.
* @throws {Error} If the schema is not a recognized Zod v3 or v4 schema.
*/
async function interopSafeParseAsync(schema, input) {
	if (isZodSchemaV4(schema)) try {
		return {
			success: true,
			data: await (0, zod_v4_core.parseAsync)(schema, input)
		};
	} catch (error) {
		return {
			success: false,
			error
		};
	}
	if (isZodSchemaV3(schema)) return await schema.safeParseAsync(input);
	throw new Error("Schema must be an instance of z3.ZodType or z4.$ZodType");
}
/**
* Asynchronously parses the input using the provided Zod schema (v3 or v4) and returns the parsed value.
* Throws an error if parsing fails or if the schema is not a recognized Zod v3 or v4 schema.
*
* @template T - The expected output type of the schema.
* @param {InteropZodType<T>} schema - The Zod schema (v3 or v4) to use for parsing.
* @param {unknown} input - The input value to parse.
* @returns {Promise<T>} A promise that resolves to the parsed value.
* @throws {Error} If parsing fails or the schema is not a recognized Zod v3 or v4 schema.
*/
async function interopParseAsync(schema, input) {
	if (isZodSchemaV4(schema)) return await (0, zod_v4_core.parseAsync)(schema, input);
	if (isZodSchemaV3(schema)) return await schema.parseAsync(input);
	throw new Error("Schema must be an instance of z3.ZodType or z4.$ZodType");
}
/**
* Safely parses the input using the provided Zod schema (v3 or v4) and returns a result object
* indicating success or failure. This function is compatible with both Zod v3 and v4 schemas.
*
* @template T - The expected output type of the schema.
* @param {InteropZodType<T>} schema - The Zod schema (v3 or v4) to use for parsing.
* @param {unknown} input - The input value to parse.
* @returns {InteropZodSafeParseResult<T>} An object with either the parsed data (on success)
*   or the error (on failure).
* @throws {Error} If the schema is not a recognized Zod v3 or v4 schema.
*/
function interopSafeParse(schema, input) {
	if (isZodSchemaV4(schema)) try {
		return {
			success: true,
			data: (0, zod_v4_core.parse)(schema, input)
		};
	} catch (error) {
		return {
			success: false,
			error
		};
	}
	if (isZodSchemaV3(schema)) return schema.safeParse(input);
	throw new Error("Schema must be an instance of z3.ZodType or z4.$ZodType");
}
/**
* Parses the input using the provided Zod schema (v3 or v4) and returns the parsed value.
* Throws an error if parsing fails or if the schema is not a recognized Zod v3 or v4 schema.
*
* @template T - The expected output type of the schema.
* @param {InteropZodType<T>} schema - The Zod schema (v3 or v4) to use for parsing.
* @param {unknown} input - The input value to parse.
* @returns {T} The parsed value.
* @throws {Error} If parsing fails or the schema is not a recognized Zod v3 or v4 schema.
*/
function interopParse(schema, input) {
	if (isZodSchemaV4(schema)) return (0, zod_v4_core.parse)(schema, input);
	if (isZodSchemaV3(schema)) return schema.parse(input);
	throw new Error("Schema must be an instance of z3.ZodType or z4.$ZodType");
}
/**
* Retrieves the description from a schema definition (v3, v4, standard schema, or plain object), if available.
*
* @param {unknown} schema - The schema to extract the description from.
* @returns {string | undefined} The description of the schema, or undefined if not present.
*/
function getSchemaDescription(schema) {
	if (isZodSchemaV4(schema)) return zod_v4_core.globalRegistry.get(schema)?.description;
	if (isZodSchemaV3(schema)) return schema.description;
	if ("description" in schema && typeof schema.description === "string") return schema.description;
}
/**
* Determines if the provided Zod schema is "shapeless".
* A shapeless schema is one that does not define any object shape,
* such as ZodString, ZodNumber, ZodBoolean, ZodAny, etc.
* For ZodObject, it must have no shape keys to be considered shapeless.
* ZodRecord schemas are considered shapeless since they define dynamic
* key-value mappings without fixed keys.
*
* @param schema The Zod schema to check.
* @returns {boolean} True if the schema is shapeless, false otherwise.
*/
function isShapelessZodSchema(schema) {
	if (!isInteropZodSchema(schema)) return false;
	if (isZodSchemaV3(schema)) {
		const def = schema._def;
		if (def.typeName === "ZodObject") {
			const obj = schema;
			return !obj.shape || Object.keys(obj.shape).length === 0;
		}
		if (def.typeName === "ZodRecord") return true;
	}
	if (isZodSchemaV4(schema)) {
		const def = schema._zod.def;
		if (def.type === "object") {
			const obj = schema;
			return !obj.shape || Object.keys(obj.shape).length === 0;
		}
		if (def.type === "record") return true;
	}
	if (typeof schema === "object" && schema !== null && !("shape" in schema)) return true;
	return false;
}
/**
* Determines if the provided Zod schema should be treated as a simple string schema
* that maps to DynamicTool. This aligns with the type-level constraint of
* InteropZodType<string | undefined> which only matches basic string schemas.
* If the provided schema is just z.string(), we can make the determination that
* the tool is just a generic string tool that doesn't require any input validation.
*
* This function only returns true for basic ZodString schemas, including:
* - Basic string schemas (z.string())
* - String schemas with validations (z.string().min(1), z.string().email(), etc.)
*
* This function returns false for everything else, including:
* - String schemas with defaults (z.string().default("value"))
* - Branded string schemas (z.string().brand<"UserId">())
* - String schemas with catch operations (z.string().catch("default"))
* - Optional/nullable string schemas (z.string().optional())
* - Transformed schemas (z.string().transform() or z.object().transform())
* - Object or record schemas, even if they're empty
* - Any other schema type
*
* @param schema The Zod schema to check.
* @returns {boolean} True if the schema is a basic ZodString, false otherwise.
*/
function isSimpleStringZodSchema(schema) {
	if (!isInteropZodSchema(schema)) return false;
	if (isZodSchemaV3(schema)) return schema._def.typeName === "ZodString";
	if (isZodSchemaV4(schema)) return schema._zod.def.type === "string";
	return false;
}
function isZodObjectV3(obj) {
	if (typeof obj === "object" && obj !== null && "_def" in obj && typeof obj._def === "object" && obj._def !== null && "typeName" in obj._def && obj._def.typeName === "ZodObject") return true;
	return false;
}
function isZodObjectV4(obj) {
	if (!isZodSchemaV4(obj)) return false;
	if (typeof obj === "object" && obj !== null && "_zod" in obj && typeof obj._zod === "object" && obj._zod !== null && "def" in obj._zod && typeof obj._zod.def === "object" && obj._zod.def !== null && "type" in obj._zod.def && obj._zod.def.type === "object") return true;
	return false;
}
function isZodArrayV4(obj) {
	if (!isZodSchemaV4(obj)) return false;
	if (typeof obj === "object" && obj !== null && "_zod" in obj && typeof obj._zod === "object" && obj._zod !== null && "def" in obj._zod && typeof obj._zod.def === "object" && obj._zod.def !== null && "type" in obj._zod.def && obj._zod.def.type === "array") return true;
	return false;
}
function isZodOptionalV4(obj) {
	if (!isZodSchemaV4(obj)) return false;
	if (typeof obj === "object" && obj !== null && "_zod" in obj && typeof obj._zod === "object" && obj._zod !== null && "def" in obj._zod && typeof obj._zod.def === "object" && obj._zod.def !== null && "type" in obj._zod.def && obj._zod.def.type === "optional") return true;
	return false;
}
function isZodNullableV4(obj) {
	if (!isZodSchemaV4(obj)) return false;
	if (typeof obj === "object" && obj !== null && "_zod" in obj && typeof obj._zod === "object" && obj._zod !== null && "def" in obj._zod && typeof obj._zod.def === "object" && obj._zod.def !== null && "type" in obj._zod.def && obj._zod.def.type === "nullable") return true;
	return false;
}
/**
* Determines if the provided value is an InteropZodObject (Zod v3 or v4 object schema).
*
* @param obj The value to check.
* @returns {boolean} True if the value is a Zod v3 or v4 object schema, false otherwise.
*/
function isInteropZodObject(obj) {
	if (isZodObjectV3(obj)) return true;
	if (isZodObjectV4(obj)) return true;
	return false;
}
/**
* Retrieves the shape (fields) of a Zod object schema, supporting both Zod v3 and v4.
*
* @template T - The type of the Zod object schema.
* @param {T} schema - The Zod object schema instance (either v3 or v4).
* @returns {InteropZodObjectShape<T>} The shape of the object schema.
* @throws {Error} If the schema is not a Zod v3 or v4 object.
*/
function getInteropZodObjectShape(schema) {
	if (isZodSchemaV3(schema)) return schema.shape;
	if (isZodSchemaV4(schema)) return schema._zod.def.shape;
	throw new Error("Schema must be an instance of z3.ZodObject or z4.$ZodObject");
}
/**
* Extends a Zod object schema with additional fields, supporting both Zod v3 and v4.
*
* @template T - The type of the Zod object schema.
* @param {T} schema - The Zod object schema instance (either v3 or v4).
* @param {InteropZodObjectShape} extension - The fields to add to the schema.
* @returns {InteropZodObject} The extended Zod object schema.
* @throws {Error} If the schema is not a Zod v3 or v4 object.
*/
function extendInteropZodObject(schema, extension) {
	if (isZodSchemaV3(schema)) return schema.extend(extension);
	if (isZodSchemaV4(schema)) return zod_v4_core.util.extend(schema, extension);
	throw new Error("Schema must be an instance of z3.ZodObject or z4.$ZodObject");
}
/**
* Returns a partial version of a Zod object schema, making all fields optional.
* Supports both Zod v3 and v4.
*
* @template T - The type of the Zod object schema.
* @param {T} schema - The Zod object schema instance (either v3 or v4).
* @returns {InteropZodObject} The partial Zod object schema.
* @throws {Error} If the schema is not a Zod v3 or v4 object.
*/
function interopZodObjectPartial(schema) {
	if (isZodSchemaV3(schema)) return schema.partial();
	if (isZodSchemaV4(schema)) return zod_v4_core.util.partial(zod_v4_core.$ZodOptional, schema, void 0);
	throw new Error("Schema must be an instance of z3.ZodObject or z4.$ZodObject");
}
/**
* Returns a strict version of a Zod object schema, disallowing unknown keys.
* Supports both Zod v3 and v4 object schemas. If `recursive` is true, applies strictness
* recursively to all nested object schemas and arrays of object schemas.
*
* @template T - The type of the Zod object schema.
* @param {T} schema - The Zod object schema instance (either v3 or v4).
* @param {boolean} [recursive=false] - Whether to apply strictness recursively to nested objects/arrays.
* @returns {InteropZodObject} The strict Zod object schema.
* @throws {Error} If the schema is not a Zod v3 or v4 object.
*/
function interopZodObjectStrict(schema, recursive = false) {
	if (isZodSchemaV3(schema)) return schema.strict();
	if (isZodObjectV4(schema)) {
		const outputShape = schema._zod.def.shape;
		if (recursive) for (const [key, keySchema] of Object.entries(schema._zod.def.shape)) {
			if (isZodObjectV4(keySchema)) outputShape[key] = interopZodObjectStrict(keySchema, recursive);
			else if (isZodArrayV4(keySchema)) {
				let elementSchema = keySchema._zod.def.element;
				if (isZodObjectV4(elementSchema)) elementSchema = interopZodObjectStrict(elementSchema, recursive);
				outputShape[key] = (0, zod_v4_core.clone)(keySchema, {
					...keySchema._zod.def,
					element: elementSchema
				});
			} else outputShape[key] = keySchema;
			const meta = zod_v4_core.globalRegistry.get(keySchema);
			if (meta) zod_v4_core.globalRegistry.add(outputShape[key], meta);
		}
		const modifiedSchema = (0, zod_v4_core.clone)(schema, {
			...schema._zod.def,
			shape: outputShape,
			catchall: (0, zod_v4_core._never)(zod_v4_core.$ZodNever)
		});
		const meta = zod_v4_core.globalRegistry.get(schema);
		if (meta) zod_v4_core.globalRegistry.add(modifiedSchema, meta);
		return modifiedSchema;
	}
	throw new Error("Schema must be an instance of z3.ZodObject or z4.$ZodObject");
}
/**
* Returns a passthrough version of a Zod object schema, allowing unknown keys.
* Supports both Zod v3 and v4 object schemas. If `recursive` is true, applies passthrough
* recursively to all nested object schemas and arrays of object schemas.
*
* @template T - The type of the Zod object schema.
* @param {T} schema - The Zod object schema instance (either v3 or v4).
* @param {boolean} [recursive=false] - Whether to apply passthrough recursively to nested objects/arrays.
* @returns {InteropZodObject} The passthrough Zod object schema.
* @throws {Error} If the schema is not a Zod v3 or v4 object.
*/
function interopZodObjectPassthrough(schema, recursive = false) {
	if (isZodObjectV3(schema)) return schema.passthrough();
	if (isZodObjectV4(schema)) {
		const outputShape = schema._zod.def.shape;
		if (recursive) for (const [key, keySchema] of Object.entries(schema._zod.def.shape)) {
			if (isZodObjectV4(keySchema)) outputShape[key] = interopZodObjectPassthrough(keySchema, recursive);
			else if (isZodArrayV4(keySchema)) {
				let elementSchema = keySchema._zod.def.element;
				if (isZodObjectV4(elementSchema)) elementSchema = interopZodObjectPassthrough(elementSchema, recursive);
				outputShape[key] = (0, zod_v4_core.clone)(keySchema, {
					...keySchema._zod.def,
					element: elementSchema
				});
			} else outputShape[key] = keySchema;
			const meta = zod_v4_core.globalRegistry.get(keySchema);
			if (meta) zod_v4_core.globalRegistry.add(outputShape[key], meta);
		}
		const modifiedSchema = (0, zod_v4_core.clone)(schema, {
			...schema._zod.def,
			shape: outputShape,
			catchall: (0, zod_v4_core._unknown)(zod_v4_core.$ZodUnknown)
		});
		const meta = zod_v4_core.globalRegistry.get(schema);
		if (meta) zod_v4_core.globalRegistry.add(modifiedSchema, meta);
		return modifiedSchema;
	}
	throw new Error("Schema must be an instance of z3.ZodObject or z4.$ZodObject");
}
/**
* Returns a getter function for the default value of a Zod schema, if one is defined.
* Supports both Zod v3 and v4 schemas. If the schema has a default value,
* the returned function will return that value when called. If no default is defined,
* returns undefined.
*
* @template T - The type of the Zod schema.
* @param {T} schema - The Zod schema instance (either v3 or v4).
* @returns {(() => InferInteropZodOutput<T>) | undefined} A function that returns the default value, or undefined if no default is set.
*/
function getInteropZodDefaultGetter(schema) {
	if (isZodSchemaV3(schema)) try {
		const defaultValue = schema.parse(void 0);
		return () => defaultValue;
	} catch {
		return;
	}
	if (isZodSchemaV4(schema)) try {
		const defaultValue = (0, zod_v4_core.parse)(schema, void 0);
		return () => defaultValue;
	} catch {
		return;
	}
}
function isZodTransformV3(schema) {
	return isZodSchemaV3(schema) && "typeName" in schema._def && schema._def.typeName === "ZodEffects";
}
function isZodTransformV4(schema) {
	return isZodSchemaV4(schema) && schema._zod.def.type === "pipe";
}
function interopZodTransformInputSchemaImpl(schema, recursive, cache) {
	const cached = cache.get(schema);
	if (cached !== void 0) return cached;
	if (isZodSchemaV3(schema)) {
		if (isZodTransformV3(schema)) return interopZodTransformInputSchemaImpl(schema._def.schema, recursive, cache);
		return schema;
	}
	if (isZodSchemaV4(schema)) {
		let outputSchema = schema;
		if (isZodTransformV4(schema)) outputSchema = interopZodTransformInputSchemaImpl(schema._zod.def.in, recursive, cache);
		if (recursive) {
			if (isZodObjectV4(outputSchema)) {
				const outputShape = {};
				for (const [key, keySchema] of Object.entries(outputSchema._zod.def.shape)) outputShape[key] = interopZodTransformInputSchemaImpl(keySchema, recursive, cache);
				outputSchema = (0, zod_v4_core.clone)(outputSchema, {
					...outputSchema._zod.def,
					shape: outputShape
				});
			} else if (isZodArrayV4(outputSchema)) {
				const elementSchema = interopZodTransformInputSchemaImpl(outputSchema._zod.def.element, recursive, cache);
				outputSchema = (0, zod_v4_core.clone)(outputSchema, {
					...outputSchema._zod.def,
					element: elementSchema
				});
			} else if (isZodOptionalV4(outputSchema)) {
				const innerSchema = interopZodTransformInputSchemaImpl(outputSchema._zod.def.innerType, recursive, cache);
				outputSchema = (0, zod_v4_core.clone)(outputSchema, {
					...outputSchema._zod.def,
					innerType: innerSchema
				});
			} else if (isZodNullableV4(outputSchema)) {
				const innerSchema = interopZodTransformInputSchemaImpl(outputSchema._zod.def.innerType, recursive, cache);
				outputSchema = (0, zod_v4_core.clone)(outputSchema, {
					...outputSchema._zod.def,
					innerType: innerSchema
				});
			}
		}
		const meta = zod_v4_core.globalRegistry.get(schema);
		if (meta) zod_v4_core.globalRegistry.add(outputSchema, meta);
		cache.set(schema, outputSchema);
		return outputSchema;
	}
	throw new Error("Schema must be an instance of z3.ZodType or z4.$ZodType");
}
/**
* Returns the input type of a Zod transform schema, for both v3 and v4.
* If the schema is not a transform, returns undefined. If `recursive` is true,
* recursively processes nested object schemas and arrays of object schemas.
*
* @param schema - The Zod schema instance (v3 or v4)
* @param {boolean} [recursive=false] - Whether to recursively process nested objects/arrays.
* @returns The input Zod schema of the transform, or undefined if not a transform
*/
function interopZodTransformInputSchema(schema, recursive = false) {
	return interopZodTransformInputSchemaImpl(schema, recursive, /* @__PURE__ */ new WeakMap());
}
/**
* Creates a modified version of a Zod object schema where fields matching a predicate are made optional.
* Supports both Zod v3 and v4 schemas and preserves the original schema version.
*
* @template T - The type of the Zod object schema.
* @param {T} schema - The Zod object schema instance (either v3 or v4).
* @param {(key: string, value: InteropZodType) => boolean} predicate - Function to determine which fields should be optional.
* @returns {InteropZodObject} The modified Zod object schema.
* @throws {Error} If the schema is not a Zod v3 or v4 object.
*/
function interopZodObjectMakeFieldsOptional(schema, predicate) {
	if (isZodSchemaV3(schema)) {
		const shape = getInteropZodObjectShape(schema);
		const modifiedShape = {};
		for (const [key, value] of Object.entries(shape)) if (predicate(key, value)) modifiedShape[key] = value.optional();
		else modifiedShape[key] = value;
		return schema.extend(modifiedShape);
	}
	if (isZodSchemaV4(schema)) {
		const shape = getInteropZodObjectShape(schema);
		const outputShape = { ...schema._zod.def.shape };
		for (const [key, value] of Object.entries(shape)) if (predicate(key, value)) outputShape[key] = new zod_v4_core.$ZodOptional({
			type: "optional",
			innerType: value
		});
		const modifiedSchema = (0, zod_v4_core.clone)(schema, {
			...schema._zod.def,
			shape: outputShape
		});
		const meta = zod_v4_core.globalRegistry.get(schema);
		if (meta) zod_v4_core.globalRegistry.add(modifiedSchema, meta);
		return modifiedSchema;
	}
	throw new Error("Schema must be an instance of z3.ZodObject or z4.$ZodObject");
}
function isInteropZodError(e) {
	return e instanceof Error && (e.constructor.name === "ZodError" || e.constructor.name === "$ZodError");
}
//#endregion
exports.extendInteropZodObject = extendInteropZodObject;
exports.getInteropZodDefaultGetter = getInteropZodDefaultGetter;
exports.getInteropZodObjectShape = getInteropZodObjectShape;
exports.getSchemaDescription = getSchemaDescription;
exports.interopParse = interopParse;
exports.interopParseAsync = interopParseAsync;
exports.interopSafeParse = interopSafeParse;
exports.interopSafeParseAsync = interopSafeParseAsync;
exports.interopZodObjectMakeFieldsOptional = interopZodObjectMakeFieldsOptional;
exports.interopZodObjectPartial = interopZodObjectPartial;
exports.interopZodObjectPassthrough = interopZodObjectPassthrough;
exports.interopZodObjectStrict = interopZodObjectStrict;
exports.interopZodTransformInputSchema = interopZodTransformInputSchema;
exports.isInteropZodError = isInteropZodError;
exports.isInteropZodLiteral = isInteropZodLiteral;
exports.isInteropZodObject = isInteropZodObject;
exports.isInteropZodSchema = isInteropZodSchema;
exports.isShapelessZodSchema = isShapelessZodSchema;
exports.isSimpleStringZodSchema = isSimpleStringZodSchema;
exports.isZodArrayV4 = isZodArrayV4;
exports.isZodLiteralV3 = isZodLiteralV3;
exports.isZodLiteralV4 = isZodLiteralV4;
exports.isZodNullableV4 = isZodNullableV4;
exports.isZodObjectV3 = isZodObjectV3;
exports.isZodObjectV4 = isZodObjectV4;
exports.isZodOptionalV4 = isZodOptionalV4;
exports.isZodSchema = isZodSchema;
exports.isZodSchemaV3 = isZodSchemaV3;
exports.isZodSchemaV4 = isZodSchemaV4;

//# sourceMappingURL=zod.cjs.map