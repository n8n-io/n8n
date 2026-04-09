import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

/**
 * Output schema for tool search results - returns tool references
 * that are automatically expanded into full tool definitions by the API.
 */
export const toolSearchBm25_20251119OutputSchema = lazySchema(() =>
  zodSchema(
    z.array(
      z.object({
        type: z.literal('tool_reference'),
        toolName: z.string(),
      }),
    ),
  ),
);

/**
 * Input schema for BM25-based tool search.
 * Claude uses natural language queries to search for tools.
 */
const toolSearchBm25_20251119InputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      /**
       * A natural language query to search for tools.
       * Claude will use BM25 text search to find relevant tools.
       */
      query: z.string(),
      /**
       * Maximum number of tools to return. Optional.
       */
      limit: z.number().optional(),
    }),
  ),
);

const factory = createProviderToolFactoryWithOutputSchema<
  {
    /**
     * A natural language query to search for tools.
     * Claude will use BM25 text search to find relevant tools.
     */
    query: string;
    /**
     * Maximum number of tools to return. Optional.
     */
    limit?: number;
  },
  Array<{
    type: 'tool_reference';
    /**
     * The name of the discovered tool.
     */
    toolName: string;
  }>,
  {}
>({
  id: 'anthropic.tool_search_bm25_20251119',
  inputSchema: toolSearchBm25_20251119InputSchema,
  outputSchema: toolSearchBm25_20251119OutputSchema,
  supportsDeferredResults: true,
});

/**
 * Creates a tool search tool that uses BM25 (natural language) to find tools.
 *
 * The tool search tool enables Claude to work with hundreds or thousands of tools
 * by dynamically discovering and loading them on-demand. Instead of loading all
 * tool definitions into the context window upfront, Claude searches your tool
 * catalog and loads only the tools it needs.
 *
 * When Claude uses this tool, it uses natural language queries (NOT regex patterns)
 * to search for tools using BM25 text search.
 *
 * **Important**: This tool should never have `deferLoading: true` in providerOptions.
 *
 * @example
 * ```ts
 * import { anthropicTools } from '@ai-sdk/anthropic';
 *
 * const tools = {
 *   toolSearch: anthropicTools.toolSearchBm25_20251119(),
 *   // Other tools with deferLoading...
 * };
 * ```
 *
 * @see https://docs.anthropic.com/en/docs/agents-and-tools/tool-search-tool
 */
export const toolSearchBm25_20251119 = (
  args: Parameters<typeof factory>[0] = {},
) => {
  return factory(args);
};
