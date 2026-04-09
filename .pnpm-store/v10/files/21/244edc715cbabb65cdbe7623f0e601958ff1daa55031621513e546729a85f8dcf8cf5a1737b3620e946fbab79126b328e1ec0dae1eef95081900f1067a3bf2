import {
  createJsonErrorResponseHandler,
  type InferSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

const googleErrorDataSchema = lazySchema(() =>
  zodSchema(
    z.object({
      error: z.object({
        code: z.number().nullable(),
        message: z.string(),
        status: z.string(),
      }),
    }),
  ),
);

export type GoogleErrorData = InferSchema<typeof googleErrorDataSchema>;

export const googleFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: googleErrorDataSchema,
  errorToMessage: data => data.error.message,
});
