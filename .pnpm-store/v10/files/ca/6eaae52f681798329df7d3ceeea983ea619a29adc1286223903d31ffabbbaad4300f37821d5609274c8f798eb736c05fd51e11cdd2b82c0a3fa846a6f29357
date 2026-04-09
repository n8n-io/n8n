import { z } from 'zod/v4';
import { openaiErrorDataSchema } from '../openai-error';
import { InferSchema, lazySchema, zodSchema } from '@ai-sdk/provider-utils';

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
export const openaiCompletionResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      id: z.string().nullish(),
      created: z.number().nullish(),
      model: z.string().nullish(),
      choices: z.array(
        z.object({
          text: z.string(),
          finish_reason: z.string(),
          logprobs: z
            .object({
              tokens: z.array(z.string()),
              token_logprobs: z.array(z.number()),
              top_logprobs: z.array(z.record(z.string(), z.number())).nullish(),
            })
            .nullish(),
        }),
      ),
      usage: z
        .object({
          prompt_tokens: z.number(),
          completion_tokens: z.number(),
          total_tokens: z.number(),
        })
        .nullish(),
    }),
  ),
);

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
export const openaiCompletionChunkSchema = lazySchema(() =>
  zodSchema(
    z.union([
      z.object({
        id: z.string().nullish(),
        created: z.number().nullish(),
        model: z.string().nullish(),
        choices: z.array(
          z.object({
            text: z.string(),
            finish_reason: z.string().nullish(),
            index: z.number(),
            logprobs: z
              .object({
                tokens: z.array(z.string()),
                token_logprobs: z.array(z.number()),
                top_logprobs: z
                  .array(z.record(z.string(), z.number()))
                  .nullish(),
              })
              .nullish(),
          }),
        ),
        usage: z
          .object({
            prompt_tokens: z.number(),
            completion_tokens: z.number(),
            total_tokens: z.number(),
          })
          .nullish(),
      }),
      openaiErrorDataSchema,
    ]),
  ),
);

export type OpenAICompletionChunk = InferSchema<
  typeof openaiCompletionChunkSchema
>;

export type OpenAICompletionResponse = InferSchema<
  typeof openaiCompletionResponseSchema
>;
