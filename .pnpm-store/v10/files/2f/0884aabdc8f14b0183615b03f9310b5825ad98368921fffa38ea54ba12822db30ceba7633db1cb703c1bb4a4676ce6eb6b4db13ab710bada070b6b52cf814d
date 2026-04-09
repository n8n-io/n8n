import { ResponseFormatJSONSchema } from '../resources/index';
import type { infer as zodInfer, ZodType } from 'zod';
import {
  AutoParseableResponseFormat,
  AutoParseableTool,
  makeParseableResponseFormat,
  makeParseableTool,
} from '../lib/parser';
import { zodToJsonSchema as _zodToJsonSchema } from '../_vendor/zod-to-json-schema';

function zodToJsonSchema(schema: ZodType, options: { name: string }): Record<string, unknown> {
  return _zodToJsonSchema(schema, {
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
 * const completion = await client.beta.chat.completions.parse({
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
export function zodResponseFormat<ZodInput extends ZodType>(
  zodObject: ZodInput,
  name: string,
  props?: Omit<ResponseFormatJSONSchema.JSONSchema, 'schema' | 'strict' | 'name'>,
): AutoParseableResponseFormat<zodInfer<ZodInput>> {
  return makeParseableResponseFormat(
    {
      type: 'json_schema',
      json_schema: {
        ...props,
        name,
        strict: true,
        schema: zodToJsonSchema(zodObject, { name }),
      },
    },
    (content) => zodObject.parse(JSON.parse(content)),
  );
}

/**
 * Creates a chat completion `function` tool that can be invoked
 * automatically by the chat completion `.runTools()` method or automatically
 * parsed by `.parse()` / `.stream()`.
 */
export function zodFunction<Parameters extends ZodType>(options: {
  name: string;
  parameters: Parameters;
  function?: ((args: zodInfer<Parameters>) => unknown | Promise<unknown>) | undefined;
  description?: string | undefined;
}): AutoParseableTool<{
  arguments: Parameters;
  name: string;
  function: (args: zodInfer<Parameters>) => unknown;
}> {
  // @ts-expect-error TODO
  return makeParseableTool<any>(
    {
      type: 'function',
      function: {
        name: options.name,
        parameters: zodToJsonSchema(options.parameters, { name: options.name }),
        strict: true,
        ...(options.description ? { description: options.description } : undefined),
      },
    },
    {
      callback: options.function,
      parser: (args) => options.parameters.parse(JSON.parse(args)),
    },
  );
}
