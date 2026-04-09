import {
  LanguageModelV3FunctionTool,
  LanguageModelV3ProviderTool,
} from '@ai-sdk/provider';

/**
 * Interface for mapping between custom tool names and provider tool names.
 */
export interface ToolNameMapping {
  /**
   * Maps a custom tool name (used by the client) to the provider's tool name.
   * If the custom tool name does not have a mapping, returns the input name.
   *
   * @param customToolName - The custom name of the tool defined by the client.
   * @returns The corresponding provider tool name, or the input name if not mapped.
   */
  toProviderToolName: (customToolName: string) => string;

  /**
   * Maps a provider tool name to the custom tool name used by the client.
   * If the provider tool name does not have a mapping, returns the input name.
   *
   * @param providerToolName - The name of the tool as understood by the provider.
   * @returns The corresponding custom tool name, or the input name if not mapped.
   */
  toCustomToolName: (providerToolName: string) => string;
}

/**
 * @param tools - Tools that were passed to the language model.
 * @param providerToolNames - Maps the provider tool ids to the provider tool names.
 */
export function createToolNameMapping({
  tools = [],
  providerToolNames,
  resolveProviderToolName,
}: {
  /**
   * Tools that were passed to the language model.
   */
  tools:
    | Array<LanguageModelV3FunctionTool | LanguageModelV3ProviderTool>
    | undefined;

  /**
   * Maps the provider tool ids to the provider tool names.
   */
  providerToolNames: Record<`${string}.${string}`, string>;

  /**
   * Optional resolver for provider tool names that cannot be represented as
   * static id -> name mappings (e.g. dynamic provider names).
   */
  resolveProviderToolName?: (
    tool: LanguageModelV3ProviderTool,
  ) => string | undefined;
}): ToolNameMapping {
  const customToolNameToProviderToolName: Record<string, string> = {};
  const providerToolNameToCustomToolName: Record<string, string> = {};

  for (const tool of tools) {
    if (tool.type === 'provider') {
      const providerToolName =
        resolveProviderToolName?.(tool) ??
        (tool.id in providerToolNames ? providerToolNames[tool.id] : undefined);

      if (providerToolName == null) {
        continue;
      }

      customToolNameToProviderToolName[tool.name] = providerToolName;
      providerToolNameToCustomToolName[providerToolName] = tool.name;
    }
  }

  return {
    toProviderToolName: (customToolName: string) =>
      customToolNameToProviderToolName[customToolName] ?? customToolName,
    toCustomToolName: (providerToolName: string) =>
      providerToolNameToCustomToolName[providerToolName] ?? providerToolName,
  };
}
