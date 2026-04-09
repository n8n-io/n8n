/**
 * Typed tool result that is returned by `generateText` and `streamText`.
 * It contains the tool call ID, the tool name, the tool arguments, and the tool result.
 */
export interface ToolResult<NAME extends string, INPUT, OUTPUT> {
  /**
   * ID of the tool call. This ID is used to match the tool call with the tool result.
   */
  toolCallId: string;

  /**
   * Name of the tool that was called.
   */
  toolName: NAME;

  /**
   * Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
   */
  input: INPUT;

  /**
   * Result of the tool call. This is the result of the tool's execution.
   */
  output: OUTPUT;

  /**
   * Whether the tool result has been executed by the provider.
   */
  providerExecuted?: boolean;

  /**
   * Whether the tool is dynamic.
   */
  dynamic?: boolean;
}
