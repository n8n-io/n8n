import { SharedV2ProviderMetadata } from '../../shared/v2/shared-v2-provider-metadata';

/**
 * Tool calls that the model has generated.
 */
export type LanguageModelV2ToolCall = {
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
   * Additional provider-specific metadata for the tool call.
   */
  providerMetadata?: SharedV2ProviderMetadata;
};
