import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';

export interface ParallelSearchSourcePolicy {
  /**
   * List of domains to include in search results.
   * Example: ['wikipedia.org', 'nature.com']
   */
  includeDomains?: string[];

  /**
   * List of domains to exclude from search results.
   * Example: ['reddit.com', 'twitter.com']
   */
  excludeDomains?: string[];

  /**
   * Only include results published after this date (ISO 8601 format).
   * Example: '2024-01-01'
   */
  afterDate?: string;
}

export interface ParallelSearchExcerpts {
  /**
   * Maximum characters per result.
   */
  maxCharsPerResult?: number;

  /**
   * Maximum total characters across all results.
   */
  maxCharsTotal?: number;
}

export interface ParallelSearchFetchPolicy {
  /**
   * Maximum age in seconds for cached content.
   * Set to 0 to always fetch fresh content.
   */
  maxAgeSeconds?: number;
}

export interface ParallelSearchConfig {
  /**
   * Mode preset for different use cases:
   * - "one-shot": Comprehensive results with longer excerpts for single-response answers (default)
   * - "agentic": Concise, token-efficient results for multi-step agentic workflows
   */
  mode?: 'one-shot' | 'agentic';

  /**
   * Default maximum number of results to return (1-20).
   * Defaults to 10 if not specified.
   */
  maxResults?: number;

  /**
   * Default source policy for controlling which domains to include/exclude.
   */
  sourcePolicy?: ParallelSearchSourcePolicy;

  /**
   * Default excerpt configuration for controlling result length.
   */
  excerpts?: ParallelSearchExcerpts;

  /**
   * Default fetch policy for controlling content freshness.
   */
  fetchPolicy?: ParallelSearchFetchPolicy;
}

export interface ParallelSearchResult {
  /** URL of the search result */
  url: string;
  /** Title of the search result */
  title: string;
  /** Extracted text excerpt/content from the page */
  excerpt: string;
  /** Publication date of the content (may be null) */
  publishDate?: string | null;
  /** Relevance score for the result */
  relevanceScore?: number;
}

export interface ParallelSearchResponse {
  /** Unique identifier for this search request */
  searchId: string;
  /** Array of search results */
  results: ParallelSearchResult[];
}

export interface ParallelSearchError {
  /** Error type */
  error:
    | 'api_error'
    | 'rate_limit'
    | 'timeout'
    | 'invalid_input'
    | 'configuration_error'
    | 'unknown';
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Human-readable error message */
  message: string;
}

export interface ParallelSearchInput {
  /**
   * Natural-language description of the web research goal.
   * Include source or freshness guidance and broader context from the task.
   * Maximum 5000 characters.
   */
  objective: string;

  /**
   * Optional search queries to supplement the objective.
   * Maximum 200 characters per query.
   */
  search_queries?: string[];

  /**
   * Mode preset for different use cases:
   * - "one-shot": Comprehensive results with longer excerpts
   * - "agentic": Concise, token-efficient results for multi-step workflows
   */
  mode?: 'one-shot' | 'agentic';

  /**
   * Maximum number of results to return (1-20).
   * Defaults to 10 if not specified.
   */
  max_results?: number;

  /**
   * Source policy for controlling which domains to include/exclude.
   */
  source_policy?: {
    include_domains?: string[];
    exclude_domains?: string[];
    after_date?: string;
  };

  /**
   * Excerpt configuration for controlling result length.
   */
  excerpts?: {
    max_chars_per_result?: number;
    max_chars_total?: number;
  };

  /**
   * Fetch policy for controlling content freshness.
   */
  fetch_policy?: {
    max_age_seconds?: number;
  };
}

export type ParallelSearchOutput = ParallelSearchResponse | ParallelSearchError;

const parallelSearchInputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      objective: z
        .string()
        .describe(
          'Natural-language description of the web research goal, including source or freshness guidance and broader context from the task. Maximum 5000 characters.',
        ),

      search_queries: z
        .array(z.string())
        .optional()
        .describe(
          'Optional search queries to supplement the objective. Maximum 200 characters per query.',
        ),

      mode: z
        .enum(['one-shot', 'agentic'])
        .optional()
        .describe(
          'Mode preset: "one-shot" for comprehensive results with longer excerpts (default), "agentic" for concise, token-efficient results for multi-step workflows.',
        ),

      max_results: z
        .number()
        .optional()
        .describe(
          'Maximum number of results to return (1-20). Defaults to 10 if not specified.',
        ),

      source_policy: z
        .object({
          include_domains: z
            .array(z.string())
            .optional()
            .describe('List of domains to include in search results.'),
          exclude_domains: z
            .array(z.string())
            .optional()
            .describe('List of domains to exclude from search results.'),
          after_date: z
            .string()
            .optional()
            .describe(
              'Only include results published after this date (ISO 8601 format).',
            ),
        })
        .optional()
        .describe(
          'Source policy for controlling which domains to include/exclude and freshness.',
        ),

      excerpts: z
        .object({
          max_chars_per_result: z
            .number()
            .optional()
            .describe('Maximum characters per result.'),
          max_chars_total: z
            .number()
            .optional()
            .describe('Maximum total characters across all results.'),
        })
        .optional()
        .describe('Excerpt configuration for controlling result length.'),

      fetch_policy: z
        .object({
          max_age_seconds: z
            .number()
            .optional()
            .describe(
              'Maximum age in seconds for cached content. Set to 0 to always fetch fresh content.',
            ),
        })
        .optional()
        .describe('Fetch policy for controlling content freshness.'),
    }),
  ),
);

const parallelSearchOutputSchema = lazySchema(() =>
  zodSchema(
    z.union([
      // Success response
      z.object({
        searchId: z.string(),
        results: z.array(
          z.object({
            url: z.string(),
            title: z.string(),
            excerpt: z.string(),
            publishDate: z.string().nullable().optional(),
            relevanceScore: z.number().optional(),
          }),
        ),
      }),
      // Error response
      z.object({
        error: z.enum([
          'api_error',
          'rate_limit',
          'timeout',
          'invalid_input',
          'configuration_error',
          'unknown',
        ]),
        statusCode: z.number().optional(),
        message: z.string(),
      }),
    ]),
  ),
);

export const parallelSearchToolFactory =
  createProviderToolFactoryWithOutputSchema<
    ParallelSearchInput,
    ParallelSearchOutput,
    ParallelSearchConfig
  >({
    id: 'gateway.parallel_search',
    inputSchema: parallelSearchInputSchema,
    outputSchema: parallelSearchOutputSchema,
  });

export const parallelSearch = (
  config: ParallelSearchConfig = {},
): ReturnType<typeof parallelSearchToolFactory> =>
  parallelSearchToolFactory(config);
