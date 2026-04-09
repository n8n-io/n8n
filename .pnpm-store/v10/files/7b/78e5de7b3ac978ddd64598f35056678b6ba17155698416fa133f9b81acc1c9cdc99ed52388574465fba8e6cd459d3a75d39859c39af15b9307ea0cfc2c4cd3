import { lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const openaiTranscriptionResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      text: z.string(),
      language: z.string().nullish(),
      duration: z.number().nullish(),
      words: z
        .array(
          z.object({
            word: z.string(),
            start: z.number(),
            end: z.number(),
          }),
        )
        .nullish(),
      segments: z
        .array(
          z.object({
            id: z.number(),
            seek: z.number(),
            start: z.number(),
            end: z.number(),
            text: z.string(),
            tokens: z.array(z.number()),
            temperature: z.number(),
            avg_logprob: z.number(),
            compression_ratio: z.number(),
            no_speech_prob: z.number(),
          }),
        )
        .nullish(),
    }),
  ),
);
