import type { JSONSchema } from 'json-schema-typed';
/**
 * JSON Schema type definition (JSON Schema Draft 2020-12)
 *
 * This uses the object form of JSON Schema (excluding boolean schemas).
 * While `true` and `false` are valid JSON Schemas, this SDK uses the
 * object form for practical type safety.
 *
 * Re-exported from json-schema-typed for convenience.
 * @see https://json-schema.org/draft/2020-12/json-schema-core.html
 */
export type JsonSchemaType = JSONSchema.Interface;
/**
 * Result of a JSON Schema validation operation
 */
export type JsonSchemaValidatorResult<T> = {
    valid: true;
    data: T;
    errorMessage: undefined;
} | {
    valid: false;
    data: undefined;
    errorMessage: string;
};
/**
 * A validator function that validates data against a JSON Schema
 */
export type JsonSchemaValidator<T> = (input: unknown) => JsonSchemaValidatorResult<T>;
/**
 * Provider interface for creating validators from JSON Schemas
 *
 * This is the main extension point for custom validator implementations.
 * Implementations should:
 * - Support JSON Schema Draft 2020-12 (or be compatible with it)
 * - Return validator functions that can be called multiple times
 * - Handle schema compilation/caching internally
 * - Provide clear error messages on validation failure
 *
 * @example
 * ```typescript
 * class MyValidatorProvider implements jsonSchemaValidator {
 *   getValidator<T>(schema: JsonSchemaType<T>): JsonSchemaValidator<T> {
 *     // Compile/cache validator from schema
 *     return (input: unknown) => {
 *       // Validate input against schema
 *       if (valid) {
 *         return { valid: true, data: input as T, errorMessage: undefined };
 *       } else {
 *         return { valid: false, data: undefined, errorMessage: 'Error details' };
 *       }
 *     };
 *   }
 * }
 * ```
 */
export interface jsonSchemaValidator {
    /**
     * Create a validator for the given JSON Schema
     *
     * @param schema - Standard JSON Schema object
     * @returns A validator function that can be called multiple times
     */
    getValidator<T>(schema: JsonSchemaType): JsonSchemaValidator<T>;
}
//# sourceMappingURL=types.d.ts.map