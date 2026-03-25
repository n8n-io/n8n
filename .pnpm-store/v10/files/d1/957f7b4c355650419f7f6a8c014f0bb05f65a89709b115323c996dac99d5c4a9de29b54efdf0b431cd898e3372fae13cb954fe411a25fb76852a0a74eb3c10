"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformToChatCompletionRequest = transformToChatCompletionRequest;
exports.convertToParsedChatCompletionResponse = convertToParsedChatCompletionResponse;
exports.responseFormatFromZodObject = responseFormatFromZodObject;
const zod_to_json_schema_1 = require("zod-to-json-schema");
function transformToChatCompletionRequest(parsedRequest) {
    const { responseFormat, ...rest } = parsedRequest;
    // Transform responseFormat from z.ZodType to ResponseFormat
    const transformedResponseFormat = responseFormatFromZodObject(responseFormat);
    return {
        ...rest,
        responseFormat: transformedResponseFormat,
    };
}
function convertToParsedChatCompletionResponse(response, responseFormat) {
    if (response.choices === undefined || response.choices.length === 0) {
        return {
            ...response,
            choices: response.choices === undefined ? undefined : [],
        };
    }
    const parsedChoices = [];
    for (const _choice of response.choices) {
        if (_choice.message === null || typeof _choice.message === 'undefined') {
            parsedChoices.push({ ..._choice, message: undefined });
        }
        else {
            if (_choice.message.content !== null && typeof _choice.message.content !== 'undefined' && !Array.isArray(_choice.message.content)) {
                parsedChoices.push({
                    ..._choice,
                    message: {
                        ..._choice.message,
                        parsed: responseFormat.safeParse(JSON.parse(_choice.message.content)).data,
                    }
                });
            }
        }
    }
    return {
        ...response,
        choices: parsedChoices,
    };
}
// Function to convert Zod schema to strict JSON schema
function responseFormatFromZodObject(responseFormat) {
    const responseJsonSchema = (0, zod_to_json_schema_1.zodToJsonSchema)(responseFormat);
    // It is not possible to get the variable name of a Zod object at runtime in TypeScript so we're using a placeholder name.
    // This has not impact on the parsing as the initial Zod object is used to parse the response.
    const placeholderName = "placeholderName";
    return {
        type: "json_schema",
        jsonSchema: {
            name: placeholderName,
            schemaDefinition: responseJsonSchema,
            strict: true,
        },
    };
}
//# sourceMappingURL=structChat.js.map