/**
 * Typed tool call that is returned by generateText and streamText.
 * It contains the tool call ID, the tool name, and the tool arguments.
 */
export interface ToolCall<NAME extends string, INPUT> {
  /**
   * ID of the tool call. This ID is used to match the tool call with the tool result.
   */
  toolCallId: string;

  /**
   * Name of the tool that is being called.
   */
  toolName: NAME;

  /**
   * Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
   */
  input: INPUT;

  /**
   * Whether the tool call will be executed by the provider.
   * If this flag is not set or is false, the tool call will be executed by the client.
   */
  providerExecuted?: boolean;

  /**
   * Whether the tool is dynamic.
   */
  dynamic?: boolean;
}
