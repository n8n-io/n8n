import {
  createJsonErrorResponseHandler,
  InferSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const anthropicErrorDataSchema = lazySchema(() =>
  zodSchema(
    z.object({
      type: z.literal('error'),
      error: z.object({
        type: z.string(),
        message: z.string(),
      }),
    }),
  ),
);

export type AnthropicErrorData = InferSchema<typeof anthropicErrorDataSchema>;

export const anthropicFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: anthropicErrorDataSchema,
  errorToMessage: data => data.error.message,
});
