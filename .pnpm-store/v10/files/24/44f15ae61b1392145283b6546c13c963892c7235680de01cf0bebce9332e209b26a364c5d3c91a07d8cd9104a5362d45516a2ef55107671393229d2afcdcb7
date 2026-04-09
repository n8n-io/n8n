/**
 * The configuration of a tool that is defined by the provider.
 */
export type LanguageModelV2ProviderDefinedTool = {
  /**
   * The type of the tool (always 'provider-defined').
   */
  type: 'provider-defined';

  /**
   * The ID of the tool. Should follow the format `<provider-name>.<unique-tool-name>`.
   */
  id: `${string}.${string}`;

  /**
   * The name of the tool that the user must use in the tool set.
   */
  name: string;

  /**
   * The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool.
   */
  args: Record<string, unknown>;
};
