/**
 * The configuration of a provider tool.
 *
 * Provider tools are tools that are specific to a certain provider.
 * The input and output schemas are defined be the provider, and
 * some of the tools are also executed on the provider systems.
 */
export type LanguageModelV3ProviderTool = {
  /**
   * The type of the tool (always 'provider').
   */
  type: 'provider';

  /**
   * The ID of the tool. Should follow the format `<provider-id>.<unique-tool-name>`.
   */
  id: `${string}.${string}`;

  /**
   * The name of the tool. Unique within this model call.
   */
  name: string;

  /**
   * The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool.
   */
  args: Record<string, unknown>;
};
