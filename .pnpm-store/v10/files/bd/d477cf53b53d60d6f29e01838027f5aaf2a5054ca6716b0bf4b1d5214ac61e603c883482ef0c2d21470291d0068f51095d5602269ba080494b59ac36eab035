import { lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

// minimal version of the schema, focused on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
export const openaiImageResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      created: z.number().nullish(),
      data: z.array(
        z.object({
          b64_json: z.string(),
          revised_prompt: z.string().nullish(),
        }),
      ),
      background: z.string().nullish(),
      output_format: z.string().nullish(),
      size: z.string().nullish(),
      quality: z.string().nullish(),
      usage: z
        .object({
          input_tokens: z.number().nullish(),
          output_tokens: z.number().nullish(),
          total_tokens: z.number().nullish(),
          input_tokens_details: z
            .object({
              image_tokens: z.number().nullish(),
              text_tokens: z.number().nullish(),
            })
            .nullish(),
        })
        .nullish(),
    }),
  ),
);
