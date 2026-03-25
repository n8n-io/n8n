import { StandardJSONSchemaV1, StandardSchemaV1, StandardTypedV1 } from "@standard-schema/spec";

//#region src/state/types.d.ts
interface CombinedProps<Input = unknown, Output = Input> extends StandardSchemaV1.Props<Input, Output>, StandardJSONSchemaV1.Props<Input, Output> {}
/**
 * SerializableSchema is the core interface for any schema used by LangGraph state.
 *
 * @template Input - The type of input data the schema can be used to validate.
 * @template Output - The type of output produced after validation, post-refinement/coercion.
 *
 * @remarks
 * - SerializableSchema provides a single property, `~standard`, which must conform to
 *   both `StandardSchemaV1.Props` and `StandardJSONSchemaV1.Props`.
 * - This ensures all schemas are compatible with both runtime validation (e.g., type checks,
 *   coercion, custom refinements) and structured schema export/generation (e.g., producing
 *   a compatible JSON Schema).
 * - A value matching SerializableSchema can be passed directly to LangGraph state
 *   definitions, reducers, or other schema-accepting APIs.
 *
 * @example
 * ```ts
 * import { z } from "zod";
 *
 * // complies with SerializableSchema
 * const zodSchema = z.object({ x: z.string() });
 *
 * // Use in a StateObject definition:
 * const AgentState = new StateObject({
 *   data: schema
 * });
 * ```
 */
interface SerializableSchema<Input = unknown, Output = Input> {
  "~standard": CombinedProps<Input, Output>;
}
declare namespace SerializableSchema {
  /**
   * Infers the type of input expected by a SerializableSchema.
   *
   * @template T - A SerializableSchema instance.
   * @returns The type of data that may be passed to the schema for validation.
   *
   * @example
   * ```ts
   * type MyInput = SerializableSchema.InferInput<typeof schema>;
   * ```
   */
  type InferInput<T extends SerializableSchema> = StandardTypedV1.InferInput<T>;
  /**
   * Infers the output type yielded by a SerializableSchema, after parsing or coercion.
   *
   * @template T - A SerializableSchema instance.
   * @returns The type produced by successfully validating/coercing input data.
   *
   * @example
   * ```ts
   * type MyOutput = SerializableSchema.InferOutput<typeof schema>;
   * ```
   */
  type InferOutput<T extends SerializableSchema> = StandardTypedV1.InferOutput<T>;
}
/**
 * Type guard to check if a given value is a Standard Schema V1 object.
 *
 * @remarks
 * A Standard Schema object is expected to have a `~standard` property with a `validate` function.
 * This guard does NOT check for JSON schema support.
 *
 * @typeParam Input - The type of input validated by this schema.
 * @typeParam Output - The type of output produced after validation.
 * @param schema - The value to test.
 * @returns True if the schema conforms to the Standard Schema interface.
 *
 * @example
 * ```ts
 * if (isStandardSchema(mySchema)) {
 *   const result = mySchema["~standard"].validate(input);
 * }
 * ```
 */
declare function isStandardSchema<Input = unknown, Output = Input>(schema: StandardSchemaV1<Input, Output>): schema is StandardSchemaV1<Input, Output>;
declare function isStandardSchema<Input = unknown, Output = Input>(schema: unknown): schema is StandardSchemaV1<Input, Output>;
/**
 * Type guard to check if a given value is a `SerializableSchema`, i.e.
 * both a Standard Schema and a Standard JSON Schema object.
 *
 * @remarks
 * This checks for both the presence of a Standard Schema V1 interface
 * and the ability to generate a JSON schema.
 *
 * @typeParam Input - The type of input described by the schema.
 * @typeParam Output - The type of output described by the schema.
 * @param schema - The value to test.
 * @returns True if the schema is a valid `SerializableSchema`.
 *
 * @example
 * ```ts
 * if (isSerializableSchema(schema)) {
 *   schema["~standard"].validate(data);
 *   const json = schema["~standard"].jsonSchema();
 * }
 * ```
 */
declare function isSerializableSchema<Input = unknown, Output = Input>(schema: SerializableSchema<Input, Output>): schema is SerializableSchema<Input, Output>;
declare function isSerializableSchema<Input = unknown, Output = Input>(schema: unknown): schema is SerializableSchema<Input, Output>;
//#endregion
export { SerializableSchema, isSerializableSchema, isStandardSchema };
//# sourceMappingURL=types.d.ts.map