import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const webSearchArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      externalWebAccess: z.boolean().optional(),
      filters: z
        .object({ allowedDomains: z.array(z.string()).optional() })
        .optional(),
      searchContextSize: z.enum(['low', 'medium', 'high']).optional(),
      userLocation: z
        .object({
          type: z.literal('approximate'),
          country: z.string().optional(),
          city: z.string().optional(),
          region: z.string().optional(),
          timezone: z.string().optional(),
        })
        .optional(),
    }),
  ),
);

const webSearchInputSchema = lazySchema(() => zodSchema(z.object({})));

export const webSearchOutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      action: z
        .discriminatedUnion('type', [
          z.object({
            type: z.literal('search'),
            query: z.string().optional(),
          }),
          z.object({
            type: z.literal('openPage'),
            url: z.string().nullish(),
          }),
          z.object({
            type: z.literal('findInPage'),
            url: z.string().nullish(),
            pattern: z.string().nullish(),
          }),
        ])
        .optional(),
      sources: z
        .array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('url'), url: z.string() }),
            z.object({ type: z.literal('api'), name: z.string() }),
          ]),
        )
        .optional(),
    }),
  ),
);

export const webSearchToolFactory = createProviderToolFactoryWithOutputSchema<
  {
    // Web search doesn't take input parameters - it's controlled by the prompt
  },
  {
    /**
     * An object describing the specific action taken in this web search call.
     * Includes details on how the model used the web (search, open_page, find_in_page).
     */
    action?:
      | {
          /**
           * Action type "search" - Performs a web search query.
           */
          type: 'search';

          /**
           * The search query.
           */
          query?: string;
        }
      | {
          /**
           * Action type "openPage" - Opens a specific URL from search results.
           */
          type: 'openPage';

          /**
           * The URL opened by the model.
           */
          url?: string | null;
        }
      | {
          /**
           * Action type "findInPage": Searches for a pattern within a loaded page.
           */
          type: 'findInPage';

          /**
           * The URL of the page searched for the pattern.
           */
          url?: string | null;

          /**
           * The pattern or text to search for within the page.
           */
          pattern?: string | null;
        };

    /**
     * Optional sources cited by the model for the web search call.
     */
    sources?: Array<
      { type: 'url'; url: string } | { type: 'api'; name: string }
    >;
  },
  {
    /**
     * Whether to use external web access for fetching live content.
     * - true: Fetch live web content (default)
     * - false: Use cached/indexed results
     */
    externalWebAccess?: boolean;

    /**
     * Filters for the search.
     */
    filters?: {
      /**
       * Allowed domains for the search.
       * If not provided, all domains are allowed.
       * Subdomains of the provided domains are allowed as well.
       */
      allowedDomains?: string[];
    };

    /**
     * Search context size to use for the web search.
     * - high: Most comprehensive context, highest cost, slower response
     * - medium: Balanced context, cost, and latency (default)
     * - low: Least context, lowest cost, fastest response
     */
    searchContextSize?: 'low' | 'medium' | 'high';

    /**
     * User location information to provide geographically relevant search results.
     */
    userLocation?: {
      /**
       * Type of location (always 'approximate')
       */
      type: 'approximate';
      /**
       * Two-letter ISO country code (e.g., 'US', 'GB')
       */
      country?: string;
      /**
       * City name (free text, e.g., 'Minneapolis')
       */
      city?: string;
      /**
       * Region name (free text, e.g., 'Minnesota')
       */
      region?: string;
      /**
       * IANA timezone (e.g., 'America/Chicago')
       */
      timezone?: string;
    };
  }
>({
  id: 'openai.web_search',
  inputSchema: webSearchInputSchema,
  outputSchema: webSearchOutputSchema,
});

export const webSearch = (
  args: Parameters<typeof webSearchToolFactory>[0] = {}, // default
) => webSearchToolFactory(args);
