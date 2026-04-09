import { SharedV3ProviderMetadata } from '../../shared/v3/shared-v3-provider-metadata';

/**
 * Tool calls that the model has generated.
 */
export type LanguageModelV3ToolCall = {
  type: 'tool-call';

  /**
   * The identifier of the tool call. It must be unique across all tool calls.
   */
  toolCallId: string;

  /**
   * The name of the tool that should be called.
   */
  toolName: string;

  /**
   * Stringified JSON object with the tool call arguments. Must match the
   * parameters schema of the tool.
   */
  input: string;

  /**
   * Whether the tool call will be executed by the provider.
   * If this flag is not set or is false, the tool call will be executed by the client.
   */
  providerExecuted?: boolean;

  /**
   * Whether the tool is dynamic, i.e. defined at runtime.
   * For example, MCP (Model Context Protocol) tools that are executed by the provider.
   */
  dynamic?: boolean;

  /**
   * Additional provider-specific metadata for the tool call.
   */
  providerMetadata?: SharedV3ProviderMetadata;
};
