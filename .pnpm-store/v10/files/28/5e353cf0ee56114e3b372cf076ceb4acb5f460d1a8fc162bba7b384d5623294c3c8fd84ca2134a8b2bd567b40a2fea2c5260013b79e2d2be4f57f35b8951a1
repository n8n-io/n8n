import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const webSearchPreviewArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
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

export const webSearchPreviewInputSchema = lazySchema(() =>
  zodSchema(z.object({})),
);

const webSearchPreviewOutputSchema = lazySchema(() =>
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
    }),
  ),
);

export const webSearchPreview = createProviderToolFactoryWithOutputSchema<
  {
    // Web search preview doesn't take input parameters - it's controlled by the prompt
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
  },
  {
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
  id: 'openai.web_search_preview',
  inputSchema: webSearchPreviewInputSchema,
  outputSchema: webSearchPreviewOutputSchema,
});
