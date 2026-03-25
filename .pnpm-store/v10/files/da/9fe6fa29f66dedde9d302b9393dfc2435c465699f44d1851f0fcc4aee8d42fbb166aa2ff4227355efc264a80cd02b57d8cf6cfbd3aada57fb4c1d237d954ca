import { SerializableSchema } from "../standard_schema.cjs";
import * as z3 from "zod/v3";
import * as z4 from "zod/v4/core";
import * as z4Classic from "zod/v4";
import * as zodMain from "zod";

//#region src/utils/types/zod.d.ts
type ZodStringV3 = z3.ZodString;
type ZodStringV4 = z4.$ZodType<string, unknown>;
type ZodObjectV3 = z3.ZodObject<any, any, any, any, any>;
type ZodObjectV4 = z4.$ZodObject;
type ZodObjectV4Classic = z4Classic.ZodObject<any, any>;
type ZodObjectMain = zodMain.ZodObject<any, any>;
type ZodDefaultV3<T extends z3.ZodTypeAny> = z3.ZodDefault<T>;
type ZodDefaultV4<T extends z4.SomeType> = z4.$ZodDefault<T>;
type ZodOptionalV3<T extends z3.ZodTypeAny> = z3.ZodOptional<T>;
type ZodOptionalV4<T extends z4.SomeType> = z4.$ZodOptional<T>;
type ZodNullableV4<T extends z4.SomeType> = z4.$ZodNullable<T>;
type InteropZodType<Output = any, Input = Output> = z3.ZodType<Output, z3.ZodTypeDef, Input> | z4.$ZodType<Output, Input>;
type InteropZodObject = ZodObjectV3 | ZodObjectV4 | ZodObjectV4Classic | ZodObjectMain;
type InteropZodDefault<T = InteropZodObjectShape> = T extends z3.ZodTypeAny ? ZodDefaultV3<T> : T extends z4.SomeType ? ZodDefaultV4<T> : never;
type InteropZodOptional<T = InteropZodObjectShape> = T extends z3.ZodTypeAny ? ZodOptionalV3<T> : T extends z4.SomeType ? ZodOptionalV4<T> : never;
type InteropZodObjectShape<T extends InteropZodObject = InteropZodObject> = T extends z3.ZodObject<infer Shape> ? { [K in keyof Shape]: Shape[K] } : T extends z4.$ZodObject<infer Shape> ? { [K in keyof Shape]: Shape[K] } : T extends z4Classic.ZodObject<infer Shape> ? { [K in keyof Shape]: Shape[K] } : T extends zodMain.ZodObject<infer Shape> ? { [K in keyof Shape]: Shape[K] } : never;
type InteropZodIssue = z3.ZodIssue | z4.$ZodIssue;
type InferInteropZodInput<T> = T extends z3.ZodType<unknown, z3.ZodTypeDef, infer Input> ? Input : T extends z4.$ZodType<unknown, infer Input> ? Input : T extends {
  _zod: {
    input: infer Input;
  };
} ? Input : never;
type InferInteropZodOutput<T> = T extends z3.ZodType<infer Output, z3.ZodTypeDef, unknown> ? Output : T extends z4.$ZodType<infer Output, unknown> ? Output : T extends {
  _zod: {
    output: infer Output;
  };
} ? Output : never;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };
declare function isZodSchemaV4(schema: unknown): schema is z4.$ZodType<unknown, unknown>;
declare function isZodSchemaV3(schema: unknown): schema is z3.ZodType<unknown, z3.ZodTypeDef, unknown>;
/** Backward compatible isZodSchema for Zod 3 */
declare function isZodSchema<RunOutput extends Record<string, unknown> = Record<string, unknown>>(schema: z3.ZodType<RunOutput> | Record<string, unknown>): schema is z3.ZodType<RunOutput>;
/**
 * Given either a Zod schema, or plain object, determine if the input is a Zod schema.
 *
 * @param {unknown} input
 * @returns {boolean} Whether or not the provided input is a Zod schema.
 */
declare function isInteropZodSchema(input: unknown): input is InteropZodType;
type InteropZodLiteral = z3.ZodLiteral<unknown> | z4.$ZodLiteral;
declare function isZodLiteralV3(obj: unknown): obj is z3.ZodLiteral<unknown>;
declare function isZodLiteralV4(obj: unknown): obj is z4.$ZodLiteral;
/**
 * Determines if the provided value is an InteropZodLiteral (Zod v3 or v4 literal schema).
 *
 * @param obj The value to check.
 * @returns {boolean} True if the value is a Zod v3 or v4 literal schema, false otherwise.
 */
declare function isInteropZodLiteral(obj: unknown): obj is InteropZodLiteral;
type InteropZodSafeParseResult<T> = z3.SafeParseReturnType<T, T>;
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
declare function interopSafeParseAsync<T>(schema: InteropZodType<T>, input: unknown): Promise<InteropZodSafeParseResult<T>>;
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
declare function interopParseAsync<T>(schema: InteropZodType<T>, input: unknown): Promise<T>;
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
declare function interopSafeParse<T>(schema: InteropZodType<T>, input: unknown): InteropZodSafeParseResult<T>;
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
declare function interopParse<T>(schema: InteropZodType<T>, input: unknown): T;
/**
 * Retrieves the description from a schema definition (v3, v4, standard schema, or plain object), if available.
 *
 * @param {unknown} schema - The schema to extract the description from.
 * @returns {string | undefined} The description of the schema, or undefined if not present.
 */
declare function getSchemaDescription(schema: SerializableSchema | InteropZodType<unknown> | Record<string, unknown>): string | undefined;
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
declare function isShapelessZodSchema(schema: unknown): boolean;
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
declare function isSimpleStringZodSchema(schema: unknown): schema is InteropZodType<string | undefined>;
declare function isZodObjectV3(obj: unknown): obj is ZodObjectV3;
declare function isZodObjectV4(obj: unknown): obj is z4.$ZodObject;
declare function isZodArrayV4(obj: unknown): obj is z4.$ZodArray;
declare function isZodOptionalV4(obj: unknown): obj is z4.$ZodOptional;
declare function isZodNullableV4(obj: unknown): obj is z4.$ZodNullable;
/**
 * Determines if the provided value is an InteropZodObject (Zod v3 or v4 object schema).
 *
 * @param obj The value to check.
 * @returns {boolean} True if the value is a Zod v3 or v4 object schema, false otherwise.
 */
declare function isInteropZodObject(obj: unknown): obj is InteropZodObject;
/**
 * Retrieves the shape (fields) of a Zod object schema, supporting both Zod v3 and v4.
 *
 * @template T - The type of the Zod object schema.
 * @param {T} schema - The Zod object schema instance (either v3 or v4).
 * @returns {InteropZodObjectShape<T>} The shape of the object schema.
 * @throws {Error} If the schema is not a Zod v3 or v4 object.
 */
declare function getInteropZodObjectShape<T extends InteropZodObject>(schema: T): InteropZodObjectShape<T>;
/**
 * Extends a Zod object schema with additional fields, supporting both Zod v3 and v4.
 *
 * @template T - The type of the Zod object schema.
 * @param {T} schema - The Zod object schema instance (either v3 or v4).
 * @param {InteropZodObjectShape} extension - The fields to add to the schema.
 * @returns {InteropZodObject} The extended Zod object schema.
 * @throws {Error} If the schema is not a Zod v3 or v4 object.
 */
declare function extendInteropZodObject<T extends InteropZodObject>(schema: T, extension: InteropZodObjectShape): InteropZodObject;
/**
 * Returns a partial version of a Zod object schema, making all fields optional.
 * Supports both Zod v3 and v4.
 *
 * @template T - The type of the Zod object schema.
 * @param {T} schema - The Zod object schema instance (either v3 or v4).
 * @returns {InteropZodObject} The partial Zod object schema.
 * @throws {Error} If the schema is not a Zod v3 or v4 object.
 */
declare function interopZodObjectPartial<T extends InteropZodObject>(schema: T): InteropZodObject;
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
declare function interopZodObjectStrict<T extends InteropZodObject>(schema: T, recursive?: boolean): InteropZodObject;
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
declare function interopZodObjectPassthrough<T extends InteropZodObject>(schema: T, recursive?: boolean): InteropZodObject;
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
declare function getInteropZodDefaultGetter<T extends InteropZodType>(schema: T): (() => InferInteropZodOutput<T>) | undefined;
/**
 * Returns the input type of a Zod transform schema, for both v3 and v4.
 * If the schema is not a transform, returns undefined. If `recursive` is true,
 * recursively processes nested object schemas and arrays of object schemas.
 *
 * @param schema - The Zod schema instance (v3 or v4)
 * @param {boolean} [recursive=false] - Whether to recursively process nested objects/arrays.
 * @returns The input Zod schema of the transform, or undefined if not a transform
 */
declare function interopZodTransformInputSchema(schema: InteropZodType, recursive?: boolean): InteropZodType;
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
declare function interopZodObjectMakeFieldsOptional<T extends InteropZodObject>(schema: T, predicate: (key: string, value: InteropZodType) => boolean): InteropZodObject;
declare function isInteropZodError(e: unknown): boolean;
//#endregion
export { InferInteropZodInput, InferInteropZodOutput, InteropZodDefault, InteropZodIssue, InteropZodLiteral, InteropZodObject, InteropZodObjectShape, InteropZodOptional, InteropZodType, Mutable, ZodDefaultV3, ZodDefaultV4, ZodNullableV4, ZodObjectMain, ZodObjectV3, ZodObjectV4, ZodObjectV4Classic, ZodOptionalV3, ZodOptionalV4, ZodStringV3, ZodStringV4, extendInteropZodObject, getInteropZodDefaultGetter, getInteropZodObjectShape, getSchemaDescription, interopParse, interopParseAsync, interopSafeParse, interopSafeParseAsync, interopZodObjectMakeFieldsOptional, interopZodObjectPartial, interopZodObjectPassthrough, interopZodObjectStrict, interopZodTransformInputSchema, isInteropZodError, isInteropZodLiteral, isInteropZodObject, isInteropZodSchema, isShapelessZodSchema, isSimpleStringZodSchema, isZodArrayV4, isZodLiteralV3, isZodLiteralV4, isZodNullableV4, isZodObjectV3, isZodObjectV4, isZodOptionalV4, isZodSchema, isZodSchemaV3, isZodSchemaV4 };
//# sourceMappingURL=zod.d.cts.map