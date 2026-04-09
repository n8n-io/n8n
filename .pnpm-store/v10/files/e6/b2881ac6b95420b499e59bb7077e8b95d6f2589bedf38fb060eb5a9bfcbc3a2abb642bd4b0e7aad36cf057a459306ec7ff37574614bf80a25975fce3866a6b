import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const webSearch_20250305ArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      maxUses: z.number().optional(),
      allowedDomains: z.array(z.string()).optional(),
      blockedDomains: z.array(z.string()).optional(),
      userLocation: z
        .object({
          type: z.literal('approximate'),
          city: z.string().optional(),
          region: z.string().optional(),
          country: z.string().optional(),
          timezone: z.string().optional(),
        })
        .optional(),
    }),
  ),
);

export const webSearch_20250305OutputSchema = lazySchema(() =>
  zodSchema(
    z.array(
      z.object({
        url: z.string(),
        title: z.string().nullable(),
        pageAge: z.string().nullable(),
        encryptedContent: z.string(),
        type: z.literal('web_search_result'),
      }),
    ),
  ),
);

const webSearch_20250305InputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      query: z.string(),
    }),
  ),
);

const factory = createProviderToolFactoryWithOutputSchema<
  {
    /**
     * The search query to execute.
     */
    query: string;
  },
  Array<{
    type: 'web_search_result';

    /**
     * The URL of the source page.
     */
    url: string;

    /**
     * The title of the source page.
     */
    title: string | null;

    /**
     * When the site was last updated
     */
    pageAge: string | null;

    /**
     * Encrypted content that must be passed back in multi-turn conversations for citations
     */
    encryptedContent: string;
  }>,
  {
    /**
     * Maximum number of web searches Claude can perform during the conversation.
     */
    maxUses?: number;

    /**
     * Optional list of domains that Claude is allowed to search.
     */
    allowedDomains?: string[];

    /**
     * Optional list of domains that Claude should avoid when searching.
     */
    blockedDomains?: string[];

    /**
     * Optional user location information to provide geographically relevant search results.
     */
    userLocation?: {
      /**
       * The type of location (must be approximate)
       */
      type: 'approximate';

      /**
       * The city name
       */
      city?: string;

      /**
       * The region or state
       */
      region?: string;

      /**
       * The country
       */
      country?: string;

      /**
       * The IANA timezone ID.
       */
      timezone?: string;
    };
  }
>({
  id: 'anthropic.web_search_20250305',
  inputSchema: webSearch_20250305InputSchema,
  outputSchema: webSearch_20250305OutputSchema,
  supportsDeferredResults: true,
});

export const webSearch_20250305 = (
  args: Parameters<typeof factory>[0] = {}, // default
) => {
  return factory(args);
};
