import {
  createProviderToolFactory,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

// https://ai.google.dev/gemini-api/docs/google-search
// https://ai.google.dev/api/generate-content#GroundingSupport
// https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search

const googleSearchToolArgsBaseSchema = z
  .object({
    searchTypes: z
      .object({
        webSearch: z.object({}).optional(),
        imageSearch: z.object({}).optional(),
      })
      .optional(),

    timeRangeFilter: z
      .object({
        startTime: z.string(),
        endTime: z.string(),
      })
      .optional(),
  })
  .passthrough();

export type GoogleSearchToolArgs = z.infer<
  typeof googleSearchToolArgsBaseSchema
>;

const googleSearchToolArgsSchema = lazySchema(() =>
  zodSchema(googleSearchToolArgsBaseSchema),
);

export const googleSearch = createProviderToolFactory<{}, GoogleSearchToolArgs>(
  {
    id: 'google.google_search',
    inputSchema: googleSearchToolArgsSchema,
  },
);
