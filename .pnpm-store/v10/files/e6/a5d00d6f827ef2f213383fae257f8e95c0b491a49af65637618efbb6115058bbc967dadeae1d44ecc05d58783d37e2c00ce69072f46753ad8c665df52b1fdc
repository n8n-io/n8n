/**
 * Cloudflare Worker-compatible JSON Schema validator provider
 *
 * This provider uses @cfworker/json-schema for validation without code generation,
 * making it compatible with edge runtimes like Cloudflare Workers that restrict
 * eval and new Function.
 */
import type { JsonSchemaType, JsonSchemaValidator, jsonSchemaValidator } from './types.js';
/**
 * JSON Schema draft version supported by @cfworker/json-schema
 */
export type CfWorkerSchemaDraft = '4' | '7' | '2019-09' | '2020-12';
/**
 *
 * @example
 * ```typescript
 * // Use with default configuration (2020-12, shortcircuit)
 * const validator = new CfWorkerJsonSchemaValidator();
 *
 * // Use with custom configuration
 * const validator = new CfWorkerJsonSchemaValidator({
 *   draft: '2020-12',
 *   shortcircuit: false // Report all errors
 * });
 * ```
 */
export declare class CfWorkerJsonSchemaValidator implements jsonSchemaValidator {
    private shortcircuit;
    private draft;
    /**
     * Create a validator
     *
     * @param options - Configuration options
     * @param options.shortcircuit - If true, stop validation after first error (default: true)
     * @param options.draft - JSON Schema draft version to use (default: '2020-12')
     */
    constructor(options?: {
        shortcircuit?: boolean;
        draft?: CfWorkerSchemaDraft;
    });
    /**
     * Create a validator for the given JSON Schema
     *
     * Unlike AJV, this validator is not cached internally
     *
     * @param schema - Standard JSON Schema object
     * @returns A validator function that validates input data
     */
    getValidator<T>(schema: JsonSchemaType): JsonSchemaValidator<T>;
}
//# sourceMappingURL=cfworker-provider.d.ts.map