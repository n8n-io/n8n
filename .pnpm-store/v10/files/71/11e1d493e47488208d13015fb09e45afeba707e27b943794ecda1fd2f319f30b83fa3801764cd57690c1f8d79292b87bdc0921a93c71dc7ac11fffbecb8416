"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodResponseFormat = zodResponseFormat;
exports.zodTextFormat = zodTextFormat;
exports.zodFunction = zodFunction;
exports.zodResponsesFunction = zodResponsesFunction;
const parser_1 = require("../lib/parser.js");
const zod_to_json_schema_1 = require("../_vendor/zod-to-json-schema/index.js");
const ResponsesParser_1 = require("../lib/ResponsesParser.js");
function zodToJsonSchema(schema, options) {
    return (0, zod_to_json_schema_1.zodToJsonSchema)(schema, {
        openaiStrictMode: true,
        name: options.name,
        nameStrategy: 'duplicate-ref',
        $refStrategy: 'extract-to-root',
        nullableStrategy: 'property',
    });
}
/**
 * Creates a chat completion `JSONSchema` response format object from
 * the given Zod schema.
 *
 * If this is passed to the `.parse()`, `.stream()` or `.runTools()`
 * chat completion methods then the response message will contain a
 * `.parsed` property that is the result of parsing the content with
 * the given Zod object.
 *
 * ```ts
 * const completion = await client.chat.completions.parse({
 *    model: 'gpt-4o-2024-08-06',
 *    messages: [
 *      { role: 'system', content: 'You are a helpful math tutor.' },
 *      { role: 'user', content: 'solve 8x + 31 = 2' },
 *    ],
 *    response_format: zodResponseFormat(
 *      z.object({
 *        steps: z.array(z.object({
 *          explanation: z.string(),
 *          answer: z.string(),
 *        })),
 *        final_answer: z.string(),
 *      }),
 *      'math_answer',
 *    ),
 *  });
 *  const message = completion.choices[0]?.message;
 *  if (message?.parsed) {
 *    console.log(message.parsed);
 *    console.log(message.parsed.final_answer);
 * }
 * ```
 *
 * This can be passed directly to the `.create()` method but will not
 * result in any automatic parsing, you'll have to parse the response yourself.
 */
function zodResponseFormat(zodObject, name, props) {
    return (0, parser_1.makeParseableResponseFormat)({
        type: 'json_schema',
        json_schema: {
            ...props,
            name,
            strict: true,
            schema: zodToJsonSchema(zodObject, { name }),
        },
    }, (content) => zodObject.parse(JSON.parse(content)));
}
function zodTextFormat(zodObject, name, props) {
    return (0, parser_1.makeParseableTextFormat)({
        type: 'json_schema',
        ...props,
        name,
        strict: true,
        schema: zodToJsonSchema(zodObject, { name }),
    }, (content) => zodObject.parse(JSON.parse(content)));
}
/**
 * Creates a chat completion `function` tool that can be invoked
 * automatically by the chat completion `.runTools()` method or automatically
 * parsed by `.parse()` / `.stream()`.
 */
function zodFunction(options) {
    // @ts-expect-error TODO
    return (0, parser_1.makeParseableTool)({
        type: 'function',
        function: {
            name: options.name,
            parameters: zodToJsonSchema(options.parameters, { name: options.name }),
            strict: true,
            ...(options.description ? { description: options.description } : undefined),
        },
    }, {
        callback: options.function,
        parser: (args) => options.parameters.parse(JSON.parse(args)),
    });
}
function zodResponsesFunction(options) {
    return (0, ResponsesParser_1.makeParseableResponseTool)({
        type: 'function',
        name: options.name,
        parameters: zodToJsonSchema(options.parameters, { name: options.name }),
        strict: true,
        ...(options.description ? { description: options.description } : undefined),
    }, {
        callback: options.function,
        parser: (args) => options.parameters.parse(JSON.parse(args)),
    });
}
//# sourceMappingURL=zod.js.map