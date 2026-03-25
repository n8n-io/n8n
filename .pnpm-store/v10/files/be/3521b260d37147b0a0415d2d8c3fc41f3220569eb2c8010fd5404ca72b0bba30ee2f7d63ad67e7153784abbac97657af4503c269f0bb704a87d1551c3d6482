import { SerializableSchema } from "./types.js";

//#region src/state/adapter.d.ts
/**
 * Get the JSON schema from a SerializableSchema.
 */
declare function getJsonSchemaFromSchema(schema: SerializableSchema | unknown): Record<string, unknown> | undefined;
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
declare function getSchemaDefaultGetter(schema: SerializableSchema | unknown): (() => unknown) | undefined;
//#endregion
export { getJsonSchemaFromSchema, getSchemaDefaultGetter };
//# sourceMappingURL=adapter.d.ts.map