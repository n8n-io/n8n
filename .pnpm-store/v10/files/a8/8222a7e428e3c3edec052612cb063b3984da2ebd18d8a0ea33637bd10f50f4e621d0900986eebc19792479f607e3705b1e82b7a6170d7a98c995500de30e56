import { InferSchema, lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export type OpenAISpeechModelId =
  | 'tts-1'
  | 'tts-1-1106'
  | 'tts-1-hd'
  | 'tts-1-hd-1106'
  | 'gpt-4o-mini-tts'
  | 'gpt-4o-mini-tts-2025-03-20'
  | 'gpt-4o-mini-tts-2025-12-15'
  | (string & {});

// https://platform.openai.com/docs/api-reference/audio/createSpeech
export const openaiSpeechModelOptionsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      instructions: z.string().nullish(),
      speed: z.number().min(0.25).max(4.0).default(1.0).nullish(),
    }),
  ),
);

export type OpenAISpeechModelOptions = InferSchema<
  typeof openaiSpeechModelOptionsSchema
>;
