import { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec";

//#region src/utils/standard_schema.d.ts
/**
 * A schema that supports both runtime validation and JSON Schema generation. Any schema passed
 * to withStructuredOutput must satisfy both interfaces.
 */
type SerializableSchema<Input = any, Output = Input> = StandardSchemaV1<Input, Output> & StandardJSONSchemaV1<Input, Output>;
/**
 * Type guard for Standard Schema V1. Returns true if the value has a `~standard.validate`
 * interface, indicating it can validate unknown values at runtime (e.g. for parsing LLM output).
 */
declare function isStandardSchema<Input = any, Output = Input>(schema: unknown): schema is StandardSchemaV1<Input, Output>;
/**
 * Type guard for Standard JSON Schema V1. Returns true if the value has a `~standard.jsonSchema`
 * interface, indicating it can be converted to a JSON Schema object (e.g. for sending as a tool
 * definition to an LLM).
 */
declare function isStandardJsonSchema<Input = any, Output = Input>(schema: unknown): schema is StandardJSONSchemaV1<Input, Output>;
/**
 * Type guard for Standard Schema V1. Returns true if the value has a `~standard.validate` interface,
 * indicating it can validate unknown values at runtime (e.g. for parsing LLM output).
 */
declare function isSerializableSchema<Input = any, Output = Input>(schema: unknown): schema is SerializableSchema<Input, Output>;
//#endregion
export { SerializableSchema, isSerializableSchema, isStandardJsonSchema, isStandardSchema };
//# sourceMappingURL=standard_schema.d.ts.map