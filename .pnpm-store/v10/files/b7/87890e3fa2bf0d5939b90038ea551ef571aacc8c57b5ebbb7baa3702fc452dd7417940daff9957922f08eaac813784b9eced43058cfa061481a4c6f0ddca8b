import { ResponseFormatJSONSchema } from "../resources/index.js";
import type { infer as zodInfer, ZodType } from 'zod';
import { AutoParseableResponseFormat, AutoParseableTextFormat, AutoParseableTool } from "../lib/parser.js";
import { AutoParseableResponseTool } from "../lib/ResponsesParser.js";
import { type ResponseFormatTextJSONSchemaConfig } from "../resources/responses/responses.js";
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
export declare function zodResponseFormat<ZodInput extends ZodType>(zodObject: ZodInput, name: string, props?: Omit<ResponseFormatJSONSchema.JSONSchema, 'schema' | 'strict' | 'name'>): AutoParseableResponseFormat<zodInfer<ZodInput>>;
export declare function zodTextFormat<ZodInput extends ZodType>(zodObject: ZodInput, name: string, props?: Omit<ResponseFormatTextJSONSchemaConfig, 'schema' | 'type' | 'strict' | 'name'>): AutoParseableTextFormat<zodInfer<ZodInput>>;
/**
 * Creates a chat completion `function` tool that can be invoked
 * automatically by the chat completion `.runTools()` method or automatically
 * parsed by `.parse()` / `.stream()`.
 */
export declare function zodFunction<Parameters extends ZodType>(options: {
    name: string;
    parameters: Parameters;
    function?: ((args: zodInfer<Parameters>) => unknown | Promise<unknown>) | undefined;
    description?: string | undefined;
}): AutoParseableTool<{
    arguments: Parameters;
    name: string;
    function: (args: zodInfer<Parameters>) => unknown;
}>;
export declare function zodResponsesFunction<Parameters extends ZodType>(options: {
    name: string;
    parameters: Parameters;
    function?: ((args: zodInfer<Parameters>) => unknown | Promise<unknown>) | undefined;
    description?: string | undefined;
}): AutoParseableResponseTool<{
    arguments: Parameters;
    name: string;
    function: (args: zodInfer<Parameters>) => unknown;
}>;
//# sourceMappingURL=zod.d.ts.map