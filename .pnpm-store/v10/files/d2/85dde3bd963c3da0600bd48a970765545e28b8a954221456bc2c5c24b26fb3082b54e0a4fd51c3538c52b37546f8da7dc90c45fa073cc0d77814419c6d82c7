import { JSONValue } from '../../json-value';
import { SharedV3ProviderMetadata } from '../../shared/v3/shared-v3-provider-metadata';

/**
 * Result of a tool call that has been executed by the provider.
 */
export type LanguageModelV3ToolResult = {
  type: 'tool-result';

  /**
   * The ID of the tool call that this result is associated with.
   */
  toolCallId: string;

  /**
   * Name of the tool that generated this result.
   */
  toolName: string;

  /**
   * Result of the tool call. This is a JSON-serializable object.
   */
  result: NonNullable<JSONValue>;

  /**
   * Optional flag if the result is an error or an error message.
   */
  isError?: boolean;

  /**
   * Whether the tool result is preliminary.
   *
   * Preliminary tool results replace each other, e.g. image previews.
   * There always has to be a final, non-preliminary tool result.
   *
   * If this flag is set to true, the tool result is preliminary.
   * If this flag is not set or is false, the tool result is not preliminary.
   */
  preliminary?: boolean;

  /**
   * Whether the tool is dynamic, i.e. defined at runtime.
   * For example, MCP (Model Context Protocol) tools that are executed by the provider.
   */
  dynamic?: boolean;

  /**
   * Additional provider-specific metadata for the tool result.
   */
  providerMetadata?: SharedV3ProviderMetadata;
};
