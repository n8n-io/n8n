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
export const toolSearchRegex_20251119OutputSchema = lazySchema(() =>
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
 * Input schema for regex-based tool search.
 * Claude constructs regex patterns using Python's re.search() syntax.
 */
const toolSearchRegex_20251119InputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      /**
       * A regex pattern to search for tools.
       * Uses Python re.search() syntax. Maximum 200 characters.
       *
       * Examples:
       * - "weather" - matches tool names/descriptions containing "weather"
       * - "get_.*_data" - matches tools like get_user_data, get_weather_data
       * - "database.*query|query.*database" - OR patterns for flexibility
       * - "(?i)slack" - case-insensitive search
       */
      pattern: z.string(),
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
     * A regex pattern to search for tools.
     * Uses Python re.search() syntax. Maximum 200 characters.
     *
     * Examples:
     * - "weather" - matches tool names/descriptions containing "weather"
     * - "get_.*_data" - matches tools like get_user_data, get_weather_data
     * - "database.*query|query.*database" - OR patterns for flexibility
     * - "(?i)slack" - case-insensitive search
     */
    pattern: string;
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
  id: 'anthropic.tool_search_regex_20251119',
  inputSchema: toolSearchRegex_20251119InputSchema,
  outputSchema: toolSearchRegex_20251119OutputSchema,
  supportsDeferredResults: true,
});

/**
 * Creates a tool search tool that uses regex patterns to find tools.
 *
 * The tool search tool enables Claude to work with hundreds or thousands of tools
 * by dynamically discovering and loading them on-demand. Instead of loading all
 * tool definitions into the context window upfront, Claude searches your tool
 * catalog and loads only the tools it needs.
 *
 * When Claude uses this tool, it constructs regex patterns using Python's
 * re.search() syntax (NOT natural language queries).
 *
 * **Important**: This tool should never have `deferLoading: true` in providerOptions.
 *
 * @example
 * ```ts
 * import { anthropicTools } from '@ai-sdk/anthropic';
 *
 * const tools = {
 *   toolSearch: anthropicTools.toolSearchRegex_20251119(),
 *   // Other tools with deferLoading...
 * };
 * ```
 *
 * @see https://docs.anthropic.com/en/docs/agents-and-tools/tool-search-tool
 */
export const toolSearchRegex_20251119 = (
  args: Parameters<typeof factory>[0] = {},
) => {
  return factory(args);
};
