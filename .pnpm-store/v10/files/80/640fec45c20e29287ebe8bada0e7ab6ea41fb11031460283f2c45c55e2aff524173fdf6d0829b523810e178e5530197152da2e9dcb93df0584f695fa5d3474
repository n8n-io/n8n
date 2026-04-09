import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';

export interface PerplexitySearchConfig {
  /**
   * Default maximum number of search results to return (1-20, default: 10).
   */
  maxResults?: number;

  /**
   * Default maximum tokens to extract per search result page (256-2048, default: 2048).
   */
  maxTokensPerPage?: number;

  /**
   * Default maximum total tokens across all search results (default: 25000, max: 1000000).
   */
  maxTokens?: number;

  /**
   * Default two-letter ISO 3166-1 alpha-2 country code for regional search results.
   * Examples: 'US', 'GB', 'FR'
   */
  country?: string;

  /**
   * Default list of domains to include or exclude from search results (max 20).
   * To include: ['nature.com', 'science.org']
   * To exclude: ['-example.com', '-spam.net']
   */
  searchDomainFilter?: string[];

  /**
   * Default list of ISO 639-1 language codes to filter results (max 10, lowercase).
   * Examples: ['en', 'fr', 'de']
   */
  searchLanguageFilter?: string[];

  /**
   * Default recency filter for results.
   * Cannot be combined with searchAfterDate/searchBeforeDate at runtime.
   */
  searchRecencyFilter?: 'day' | 'week' | 'month' | 'year';
}

export interface PerplexitySearchResult {
  /** Title of the search result */
  title: string;
  /** URL of the search result */
  url: string;
  /** Text snippet/preview of the content */
  snippet: string;
  /** Publication date of the content */
  date?: string;
  /** Last updated date of the content */
  lastUpdated?: string;
}

export interface PerplexitySearchResponse {
  /** Array of search results */
  results: PerplexitySearchResult[];
  /** Unique identifier for this search request */
  id: string;
}

export interface PerplexitySearchError {
  /** Error type */
  error: 'api_error' | 'rate_limit' | 'timeout' | 'invalid_input' | 'unknown';
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Human-readable error message */
  message: string;
}

export interface PerplexitySearchInput {
  /**
   * Search query (string) or multiple queries (array of up to 5 strings).
   * Multi-query searches return combined results from all queries.
   */
  query: string | string[];

  /**
   * Maximum number of search results to return (1-20, default: 10).
   */
  max_results?: number;

  /**
   * Maximum number of tokens to extract per search result page (256-2048, default: 2048).
   */
  max_tokens_per_page?: number;

  /**
   * Maximum total tokens across all search results (default: 25000, max: 1000000).
   */
  max_tokens?: number;

  /**
   * Two-letter ISO 3166-1 alpha-2 country code for regional search results.
   * Examples: 'US', 'GB', 'FR'
   */
  country?: string;

  /**
   * List of domains to include or exclude from search results (max 20).
   * To include: ['nature.com', 'science.org']
   * To exclude: ['-example.com', '-spam.net']
   */
  search_domain_filter?: string[];

  /**
   * List of ISO 639-1 language codes to filter results (max 10, lowercase).
   * Examples: ['en', 'fr', 'de']
   */
  search_language_filter?: string[];

  /**
   * Include only results published after this date.
   * Format: 'MM/DD/YYYY' (e.g., '3/1/2025')
   * Cannot be used with search_recency_filter.
   */
  search_after_date?: string;

  /**
   * Include only results published before this date.
   * Format: 'MM/DD/YYYY' (e.g., '3/15/2025')
   * Cannot be used with search_recency_filter.
   */
  search_before_date?: string;

  /**
   * Include only results last updated after this date.
   * Format: 'MM/DD/YYYY' (e.g., '3/1/2025')
   * Cannot be used with search_recency_filter.
   */
  last_updated_after_filter?: string;

  /**
   * Include only results last updated before this date.
   * Format: 'MM/DD/YYYY' (e.g., '3/15/2025')
   * Cannot be used with search_recency_filter.
   */
  last_updated_before_filter?: string;

  /**
   * Filter results by relative time period.
   * Cannot be used with search_after_date or search_before_date.
   */
  search_recency_filter?: 'day' | 'week' | 'month' | 'year';
}

export type PerplexitySearchOutput =
  | PerplexitySearchResponse
  | PerplexitySearchError;

const perplexitySearchInputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      query: z
        .union([z.string(), z.array(z.string())])
        .describe(
          'Search query (string) or multiple queries (array of up to 5 strings). Multi-query searches return combined results from all queries.',
        ),

      max_results: z
        .number()
        .optional()
        .describe(
          'Maximum number of search results to return (1-20, default: 10)',
        ),

      max_tokens_per_page: z
        .number()
        .optional()
        .describe(
          'Maximum number of tokens to extract per search result page (256-2048, default: 2048)',
        ),

      max_tokens: z
        .number()
        .optional()
        .describe(
          'Maximum total tokens across all search results (default: 25000, max: 1000000)',
        ),

      country: z
        .string()
        .optional()
        .describe(
          "Two-letter ISO 3166-1 alpha-2 country code for regional search results (e.g., 'US', 'GB', 'FR')",
        ),

      search_domain_filter: z
        .array(z.string())
        .optional()
        .describe(
          "List of domains to include or exclude from search results (max 20). To include: ['nature.com', 'science.org']. To exclude: ['-example.com', '-spam.net']",
        ),

      search_language_filter: z
        .array(z.string())
        .optional()
        .describe(
          "List of ISO 639-1 language codes to filter results (max 10, lowercase). Examples: ['en', 'fr', 'de']",
        ),

      search_after_date: z
        .string()
        .optional()
        .describe(
          "Include only results published after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter.",
        ),

      search_before_date: z
        .string()
        .optional()
        .describe(
          "Include only results published before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter.",
        ),

      last_updated_after_filter: z
        .string()
        .optional()
        .describe(
          "Include only results last updated after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter.",
        ),

      last_updated_before_filter: z
        .string()
        .optional()
        .describe(
          "Include only results last updated before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter.",
        ),

      search_recency_filter: z
        .enum(['day', 'week', 'month', 'year'])
        .optional()
        .describe(
          'Filter results by relative time period. Cannot be used with search_after_date or search_before_date.',
        ),
    }),
  ),
);

const perplexitySearchOutputSchema = lazySchema(() =>
  zodSchema(
    z.union([
      // Success response
      z.object({
        results: z.array(
          z.object({
            title: z.string(),
            url: z.string(),
            snippet: z.string(),
            date: z.string().optional(),
            lastUpdated: z.string().optional(),
          }),
        ),
        id: z.string(),
      }),
      // Error response
      z.object({
        error: z.enum([
          'api_error',
          'rate_limit',
          'timeout',
          'invalid_input',
          'unknown',
        ]),
        statusCode: z.number().optional(),
        message: z.string(),
      }),
    ]),
  ),
);

export const perplexitySearchToolFactory =
  createProviderToolFactoryWithOutputSchema<
    PerplexitySearchInput,
    PerplexitySearchOutput,
    PerplexitySearchConfig
  >({
    id: 'gateway.perplexity_search',
    inputSchema: perplexitySearchInputSchema,
    outputSchema: perplexitySearchOutputSchema,
  });

export const perplexitySearch = (
  config: PerplexitySearchConfig = {},
): ReturnType<typeof perplexitySearchToolFactory> =>
  perplexitySearchToolFactory(config);
