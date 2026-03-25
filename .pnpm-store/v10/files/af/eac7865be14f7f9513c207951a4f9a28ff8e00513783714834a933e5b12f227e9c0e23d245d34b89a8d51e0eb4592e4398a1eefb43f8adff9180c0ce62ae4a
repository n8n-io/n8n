import { InteropZodType } from "./types/zod.cjs";
import { JsonSchema7ArrayType } from "./zod-to-json-schema/parsers/array.cjs";
import { JsonSchema7NumberType } from "./zod-to-json-schema/parsers/number.cjs";
import { JsonSchema7StringType } from "./zod-to-json-schema/parsers/string.cjs";
import { JsonSchema7NullableType } from "./zod-to-json-schema/parsers/nullable.cjs";
import { JsonSchema7ObjectType } from "./zod-to-json-schema/parsers/object.cjs";
import { JsonSchema7Type } from "./zod-to-json-schema/parseTypes.cjs";
import { toJSONSchema } from "zod/v4/core";
import { StandardJSONSchemaV1 } from "@standard-schema/spec";
import { Validator, deepCompareStrict } from "@cfworker/json-schema";

//#region src/utils/json_schema.d.ts
type ToJSONSchemaParams = NonNullable<Parameters<typeof toJSONSchema>[1]>;
/**
 * Converts a Standard JSON schema, Zod schema or JSON schema to a JSON schema.
 * @param schema - The schema to convert.
 * @param params - The parameters to pass to the toJSONSchema function.
 * @returns The converted schema.
 */
declare function toJsonSchema(schema: StandardJSONSchemaV1 | InteropZodType | JsonSchema7Type, params?: ToJSONSchemaParams): JsonSchema7Type;
/**
 * Validates if a JSON schema validates only strings. May return false negatives in some edge cases
 * (like recursive or unresolvable refs).
 *
 * @param schema - The schema to validate.
 * @returns `true` if the schema validates only strings, `false` otherwise.
 */
declare function validatesOnlyStrings(schema: unknown): boolean;
//#endregion
export { type JsonSchema7Type as JSONSchema, type JsonSchema7ArrayType, type JsonSchema7NullableType, type JsonSchema7NumberType, type JsonSchema7ObjectType, type JsonSchema7StringType, type JsonSchema7Type, ToJSONSchemaParams, Validator, deepCompareStrict, toJsonSchema, validatesOnlyStrings };
//# sourceMappingURL=json_schema.d.cts.map