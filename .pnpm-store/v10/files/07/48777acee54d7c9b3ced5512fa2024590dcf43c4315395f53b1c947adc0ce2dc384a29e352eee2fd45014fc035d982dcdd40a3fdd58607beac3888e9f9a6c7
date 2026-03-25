"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.betaTool = betaTool;
exports.betaJSONSchemaOutputFormat = betaJSONSchemaOutputFormat;
const __1 = require("../../index.js");
const transform_json_schema_1 = require("../../lib/transform-json-schema.js");
/**
 * Creates a Tool with a provided JSON schema that can be passed
 * to the `.toolRunner()` method. The schema is used to automatically validate
 * the input arguments for the tool.
 */
function betaTool(options) {
    if (options.inputSchema.type !== 'object') {
        throw new Error(`JSON schema for tool "${options.name}" must be an object, but got ${options.inputSchema.type}`);
    }
    return {
        type: 'custom',
        name: options.name,
        input_schema: options.inputSchema,
        description: options.description,
        run: options.run,
        parse: (content) => content,
    };
}
/**
 * Creates a JSON schema output format object from the given JSON schema.
 * If this is passed to the `.parse()` method then the response message will contain a
 * `.parsed_output` property that is the result of parsing the content with the given JSON schema.
 *
 */
function betaJSONSchemaOutputFormat(jsonSchema, options) {
    if (jsonSchema.type !== 'object') {
        throw new Error(`JSON schema for tool must be an object, but got ${jsonSchema.type}`);
    }
    const transform = options?.transform ?? true;
    if (transform) {
        // todo: doing this is arguably necessary, but it does change the schema the user passed in
        // so I'm not sure how we should handle that
        jsonSchema = (0, transform_json_schema_1.transformJSONSchema)(jsonSchema);
    }
    return {
        type: 'json_schema',
        schema: {
            ...jsonSchema,
        },
        parse: (content) => {
            try {
                return JSON.parse(content);
            }
            catch (error) {
                throw new __1.AnthropicError(`Failed to parse structured output: ${error}`);
            }
        },
    };
}
//# sourceMappingURL=json-schema.js.map