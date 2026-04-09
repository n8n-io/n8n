import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const webSearchArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      allowedDomains: z.array(z.string()).max(5).optional(),
      excludedDomains: z.array(z.string()).max(5).optional(),
      enableImageUnderstanding: z.boolean().optional(),
    }),
  ),
);

const webSearchOutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      query: z.string(),
      sources: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          snippet: z.string(),
        }),
      ),
    }),
  ),
);

const webSearchToolFactory = createProviderToolFactoryWithOutputSchema<
  {},
  {
    query: string;
    sources: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
  },
  {
    allowedDomains?: string[];
    excludedDomains?: string[];
    enableImageUnderstanding?: boolean;
  }
>({
  id: 'xai.web_search',
  inputSchema: lazySchema(() => zodSchema(z.object({}))),
  outputSchema: webSearchOutputSchema,
});

export const webSearch = (
  args: Parameters<typeof webSearchToolFactory>[0] = {},
) => webSearchToolFactory(args);
