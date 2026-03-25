import { ToolCall } from "@langchain/core/messages/tool";

//#region src/agents/errors.d.ts
declare class MultipleToolsBoundError extends Error {
  constructor();
}
/**
 * Raised when model returns multiple structured output tool calls when only one is expected.
 */
declare class MultipleStructuredOutputsError extends Error {
  readonly toolNames: string[];
  constructor(toolNames: string[]);
}
/**
 * Raised when structured output tool call arguments fail to parse according to the schema.
 */
declare class StructuredOutputParsingError extends Error {
  readonly toolName: string;
  readonly errors: string[];
  constructor(toolName: string, errors: string[]);
}
/**
 * Raised when a tool call is throwing an error.
 */
declare class ToolInvocationError extends Error {
  readonly toolCall: ToolCall;
  readonly toolError: Error;
  constructor(toolError: unknown, toolCall: ToolCall);
}
/**
 * Error thrown when a middleware fails.
 *
 * Use `MiddlewareError.wrap()` to create instances. The constructor is private
 * to ensure that GraphBubbleUp errors (like GraphInterrupt) are never wrapped.
 */
declare class MiddlewareError extends Error {
  static readonly "~brand" = "MiddlewareError";
  private constructor();
  /**
   * Wrap an error in a MiddlewareError, unless it's a GraphBubbleUp error
   * (like GraphInterrupt) which should propagate unchanged.
   *
   * @param error - The error to wrap
   * @param middlewareName - The name of the middleware that threw the error
   * @returns The original error if it's a GraphBubbleUp, otherwise a new MiddlewareError
   */
  static wrap(error: unknown, middlewareName: string): Error;
  /**
   * Check if the error is a MiddlewareError.
   * @param error - The error to check
   * @returns Whether the error is a MiddlewareError
   */
  static isInstance(error: unknown): error is MiddlewareError;
}
//#endregion
export { MiddlewareError, MultipleStructuredOutputsError, MultipleToolsBoundError, StructuredOutputParsingError, ToolInvocationError };
//# sourceMappingURL=errors.d.ts.map