import { z } from 'zod/v4';

// https://docs.x.ai/docs/models
export type XaiChatModelId =
  | 'grok-4-1-fast-reasoning'
  | 'grok-4-1-fast-non-reasoning'
  | 'grok-4-fast-non-reasoning'
  | 'grok-4-fast-reasoning'
  | 'grok-4.20-0309-non-reasoning'
  | 'grok-4.20-0309-reasoning'
  | 'grok-4.20-multi-agent-0309'
  | 'grok-code-fast-1'
  | 'grok-4'
  | 'grok-4-0709'
  | 'grok-4-latest'
  | 'grok-3'
  | 'grok-3-latest'
  | 'grok-3-mini'
  | 'grok-3-mini-latest'
  | (string & {});

// search source schemas
const webSourceSchema = z.object({
  type: z.literal('web'),
  country: z.string().length(2).optional(),
  excludedWebsites: z.array(z.string()).max(5).optional(),
  allowedWebsites: z.array(z.string()).max(5).optional(),
  safeSearch: z.boolean().optional(),
});

const xSourceSchema = z.object({
  type: z.literal('x'),
  excludedXHandles: z.array(z.string()).optional(),
  includedXHandles: z.array(z.string()).optional(),
  postFavoriteCount: z.number().int().optional(),
  postViewCount: z.number().int().optional(),
  /**
   * @deprecated use `includedXHandles` instead
   */
  xHandles: z.array(z.string()).optional(),
});

const newsSourceSchema = z.object({
  type: z.literal('news'),
  country: z.string().length(2).optional(),
  excludedWebsites: z.array(z.string()).max(5).optional(),
  safeSearch: z.boolean().optional(),
});

const rssSourceSchema = z.object({
  type: z.literal('rss'),
  links: z.array(z.string().url()).max(1), // currently only supports one RSS link
});

const searchSourceSchema = z.discriminatedUnion('type', [
  webSourceSchema,
  xSourceSchema,
  newsSourceSchema,
  rssSourceSchema,
]);

// xai-specific provider options
export const xaiLanguageModelChatOptions = z.object({
  reasoningEffort: z.enum(['low', 'high']).optional(),
  logprobs: z.boolean().optional(),
  topLogprobs: z.number().int().min(0).max(8).optional(),

  /**
   * Whether to enable parallel function calling during tool use.
   * When true, the model can call multiple functions in parallel.
   * When false, the model will call functions sequentially.
   * Defaults to true.
   */
  parallel_function_calling: z.boolean().optional(),

  searchParameters: z
    .object({
      /**
       * search mode preference
       * - "off": disables search completely
       * - "auto": model decides whether to search (default)
       * - "on": always enables search
       */
      mode: z.enum(['off', 'auto', 'on']),

      /**
       * whether to return citations in the response
       * defaults to true
       */
      returnCitations: z.boolean().optional(),

      /**
       * start date for search data (ISO8601 format: YYYY-MM-DD)
       */
      fromDate: z.string().optional(),

      /**
       * end date for search data (ISO8601 format: YYYY-MM-DD)
       */
      toDate: z.string().optional(),

      /**
       * maximum number of search results to consider
       * defaults to 20
       */
      maxSearchResults: z.number().min(1).max(50).optional(),

      /**
       * data sources to search from.
       * defaults to [{ type: 'web' }, { type: 'x' }] if not specified.
       *
       * @example
       * sources: [{ type: 'web', country: 'US' }, { type: 'x' }]
       */
      sources: z.array(searchSourceSchema).optional(),
    })
    .optional(),
});

export type XaiLanguageModelChatOptions = z.infer<
  typeof xaiLanguageModelChatOptions
>;
