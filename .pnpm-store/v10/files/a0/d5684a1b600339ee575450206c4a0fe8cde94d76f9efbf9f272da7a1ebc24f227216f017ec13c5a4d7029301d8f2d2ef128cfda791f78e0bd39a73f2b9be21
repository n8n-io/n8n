import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const webFetch_20250910ArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      maxUses: z.number().optional(),
      allowedDomains: z.array(z.string()).optional(),
      blockedDomains: z.array(z.string()).optional(),
      citations: z.object({ enabled: z.boolean() }).optional(),
      maxContentTokens: z.number().optional(),
    }),
  ),
);

export const webFetch_20250910OutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      type: z.literal('web_fetch_result'),
      url: z.string(),
      content: z.object({
        type: z.literal('document'),
        title: z.string().nullable(),
        citations: z.object({ enabled: z.boolean() }).optional(),
        source: z.union([
          z.object({
            type: z.literal('base64'),
            mediaType: z.literal('application/pdf'),
            data: z.string(),
          }),
          z.object({
            type: z.literal('text'),
            mediaType: z.literal('text/plain'),
            data: z.string(),
          }),
        ]),
      }),
      retrievedAt: z.string().nullable(),
    }),
  ),
);

const webFetch_20250910InputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      url: z.string(),
    }),
  ),
);

const factory = createProviderToolFactoryWithOutputSchema<
  {
    /**
     * The URL to fetch.
     */
    url: string;
  },
  {
    type: 'web_fetch_result';

    /**
     * Fetched content URL
     */
    url: string;

    /**
     * Fetched content.
     */
    content: {
      type: 'document';

      /**
       * Title of the document
       */
      title: string | null;

      /**
       * Citation configuration for the document
       */
      citations?: { enabled: boolean };

      source:
        | {
            type: 'base64';
            mediaType: 'application/pdf';
            data: string;
          }
        | {
            type: 'text';
            mediaType: 'text/plain';
            data: string;
          };
    };

    /**
     * ISO 8601 timestamp when the content was retrieved
     */
    retrievedAt: string | null;
  },
  {
    /**
     * The maxUses parameter limits the number of web fetches performed
     */
    maxUses?: number;

    /**
     * Only fetch from these domains
     */
    allowedDomains?: string[];

    /**
     * Never fetch from these domains
     */
    blockedDomains?: string[];

    /**
     * Unlike web search where citations are always enabled, citations are optional for
     * web fetch. Set "citations": {"enabled": true} to enable Claude to cite specific passages
     * from fetched documents.
     */
    citations?: {
      enabled: boolean;
    };

    /**
     * The maxContentTokens parameter limits the amount of content that will be included in the context.
     */
    maxContentTokens?: number;
  }
>({
  id: 'anthropic.web_fetch_20250910',
  inputSchema: webFetch_20250910InputSchema,
  outputSchema: webFetch_20250910OutputSchema,
  supportsDeferredResults: true,
});

export const webFetch_20250910 = (
  args: Parameters<typeof factory>[0] = {}, // default
) => {
  return factory(args);
};
