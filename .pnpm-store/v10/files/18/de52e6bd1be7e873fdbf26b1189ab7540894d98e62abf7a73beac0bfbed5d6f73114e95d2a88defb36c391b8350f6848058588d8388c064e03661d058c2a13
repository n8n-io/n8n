import { lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export type XaiVideoModelOptions = {
  pollIntervalMs?: number | null;
  pollTimeoutMs?: number | null;
  resolution?: '480p' | '720p' | null;
  videoUrl?: string | null;
  [key: string]: unknown;
};

export const xaiVideoModelOptionsSchema = lazySchema(() =>
  zodSchema(
    z
      .object({
        pollIntervalMs: z.number().positive().nullish(),
        pollTimeoutMs: z.number().positive().nullish(),
        resolution: z.enum(['480p', '720p']).nullish(),
        videoUrl: z.string().nullish(),
      })
      .passthrough(),
  ),
);
