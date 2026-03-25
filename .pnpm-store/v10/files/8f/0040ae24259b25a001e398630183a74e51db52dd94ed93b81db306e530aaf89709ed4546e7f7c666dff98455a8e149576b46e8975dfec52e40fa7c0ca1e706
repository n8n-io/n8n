"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.betaZodOutputFormat = betaZodOutputFormat;
exports.betaZodTool = betaZodTool;
const tslib_1 = require("../../internal/tslib.js");
const transform_json_schema_1 = require("../..//lib/transform-json-schema.js");
const z = tslib_1.__importStar(require("zod"));
const error_1 = require("../../core/error.js");
/**
 * Creates a JSON schema output format object from the given Zod schema.
 *
 * If this is passed to the `.parse()` method then the response message will contain a
 * `.parsed_output` property that is the result of parsing the content with the given Zod object.
 *
 * This can be passed directly to the `.create()` method but will not
 * result in any automatic parsing, you'll have to parse the response yourself.
 */
function betaZodOutputFormat(zodObject) {
    let jsonSchema = z.toJSONSchema(zodObject, { reused: 'ref' });
    jsonSchema = (0, transform_json_schema_1.transformJSONSchema)(jsonSchema);
    return {
        type: 'json_schema',
        schema: {
            ...jsonSchema,
        },
        parse: (content) => {
            const output = zodObject.safeParse(JSON.parse(content));
            if (!output.success) {
                throw new error_1.AnthropicError(`Failed to parse structured output: ${output.error.message} cause: ${output.error.issues}`);
            }
            return output.data;
        },
    };
}
/**
 * Creates a tool using the provided Zod schema that can be passed
 * into the `.toolRunner()` method. The Zod schema will automatically be
 * converted into JSON Schema when passed to the API. The provided function's
 * input arguments will also be validated against the provided schema.
 */
function betaZodTool(options) {
    const jsonSchema = z.toJSONSchema(options.inputSchema, { reused: 'ref' });
    if (jsonSchema.type !== 'object') {
        throw new Error(`Zod schema for tool "${options.name}" must be an object, but got ${jsonSchema.type}`);
    }
    // TypeScript doesn't narrow the type after the runtime check, so we need to assert it
    const objectSchema = jsonSchema;
    return {
        type: 'custom',
        name: options.name,
        input_schema: objectSchema,
        description: options.description,
        run: options.run,
        parse: (args) => options.inputSchema.parse(args),
    };
}
//# sourceMappingURL=zod.js.map