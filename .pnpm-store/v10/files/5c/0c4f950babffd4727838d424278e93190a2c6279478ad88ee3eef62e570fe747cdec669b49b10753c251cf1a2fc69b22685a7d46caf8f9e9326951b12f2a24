"use strict";
/**
 * Cloudflare Worker-compatible JSON Schema validator provider
 *
 * This provider uses @cfworker/json-schema for validation without code generation,
 * making it compatible with edge runtimes like Cloudflare Workers that restrict
 * eval and new Function.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CfWorkerJsonSchemaValidator = void 0;
const json_schema_1 = require("@cfworker/json-schema");
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
class CfWorkerJsonSchemaValidator {
    /**
     * Create a validator
     *
     * @param options - Configuration options
     * @param options.shortcircuit - If true, stop validation after first error (default: true)
     * @param options.draft - JSON Schema draft version to use (default: '2020-12')
     */
    constructor(options) {
        this.shortcircuit = options?.shortcircuit ?? true;
        this.draft = options?.draft ?? '2020-12';
    }
    /**
     * Create a validator for the given JSON Schema
     *
     * Unlike AJV, this validator is not cached internally
     *
     * @param schema - Standard JSON Schema object
     * @returns A validator function that validates input data
     */
    getValidator(schema) {
        // Cast to the cfworker Schema type - our JsonSchemaType is structurally compatible
        const validator = new json_schema_1.Validator(schema, this.draft, this.shortcircuit);
        return (input) => {
            const result = validator.validate(input);
            if (result.valid) {
                return {
                    valid: true,
                    data: input,
                    errorMessage: undefined
                };
            }
            else {
                return {
                    valid: false,
                    data: undefined,
                    errorMessage: result.errors.map(err => `${err.instanceLocation}: ${err.error}`).join('; ')
                };
            }
        };
    }
}
exports.CfWorkerJsonSchemaValidator = CfWorkerJsonSchemaValidator;
//# sourceMappingURL=cfworker-provider.js.map