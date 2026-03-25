import { AgentMiddleware } from "./types.cjs";
import { ClientTool, ServerTool } from "@langchain/core/tools";
import { z } from "zod/v3";

//#region src/agents/middleware/toolRetry.d.ts
/**
 * Configuration options for the Tool Retry Middleware.
 */
declare const ToolRetryMiddlewareOptionsSchema: z.ZodObject<{
  /**
   * Optional list of tools or tool names to apply retry logic to.
   * Can be a list of `BaseTool` instances or tool name strings.
   * If `undefined`, applies to all tools. Default is `undefined`.
   */
  tools: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodType<ClientTool, z.ZodTypeDef, ClientTool>, z.ZodType<ServerTool, z.ZodTypeDef, ServerTool>, z.ZodString]>, "many">>;
  /**
   * Behavior when all retries are exhausted. Options:
   * - `"continue"` (default): Return an AIMessage with error details, allowing
   *   the agent to potentially handle the failure gracefully.
   * - `"error"`: Re-raise the exception, stopping agent execution.
   * - Custom function: Function that takes the exception and returns a string
   *   for the AIMessage content, allowing custom error formatting.
   *
   * Deprecated values:
   * - `"raise"`: use `"error"` instead.
   * - `"return_message"`: use `"continue"` instead.
   */
  onFailure: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"error">, z.ZodLiteral<"continue">, z.ZodLiteral<"raise">, z.ZodLiteral<"return_message">, z.ZodFunction<z.ZodTuple<[z.ZodType<Error, z.ZodTypeDef, Error>], z.ZodUnknown>, z.ZodString>]>>;
} & {
  maxRetries: z.ZodDefault<z.ZodNumber>;
  retryOn: z.ZodDefault<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodType<Error, z.ZodTypeDef, Error>], z.ZodUnknown>, z.ZodBoolean>, z.ZodArray<z.ZodType<new (...args: any[]) => Error, z.ZodTypeDef, new (...args: any[]) => Error>, "many">]>>;
  backoffFactor: z.ZodDefault<z.ZodNumber>;
  initialDelayMs: z.ZodDefault<z.ZodNumber>;
  maxDelayMs: z.ZodDefault<z.ZodNumber>;
  jitter: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
  maxRetries: number;
  retryOn: (new (...args: any[]) => Error)[] | ((args_0: Error, ...args: unknown[]) => boolean);
  backoffFactor: number;
  initialDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  tools?: (string | ServerTool | ClientTool)[] | undefined;
  onFailure: "continue" | "error" | "raise" | "return_message" | ((args_0: Error, ...args: unknown[]) => string);
}, {
  maxRetries?: number | undefined;
  retryOn?: (new (...args: any[]) => Error)[] | ((args_0: Error, ...args: unknown[]) => boolean) | undefined;
  backoffFactor?: number | undefined;
  initialDelayMs?: number | undefined;
  maxDelayMs?: number | undefined;
  jitter?: boolean | undefined;
  tools?: (string | ServerTool | ClientTool)[] | undefined;
  onFailure?: "continue" | "error" | "raise" | "return_message" | ((args_0: Error, ...args: unknown[]) => string) | undefined;
}>;
type ToolRetryMiddlewareConfig = z.input<typeof ToolRetryMiddlewareOptionsSchema>;
/**
 * Middleware that automatically retries failed tool calls with configurable backoff.
 *
 * Supports retrying on specific exceptions and exponential backoff.
 *
 * @example Basic usage with default settings (2 retries, exponential backoff)
 * ```ts
 * import { createAgent, toolRetryMiddleware } from "langchain";
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   tools: [searchTool],
 *   middleware: [toolRetryMiddleware()],
 * });
 * ```
 *
 * @example Retry specific exceptions only
 * ```ts
 * import { toolRetryMiddleware } from "langchain";
 *
 * const retry = toolRetryMiddleware({
 *   maxRetries: 4,
 *   retryOn: [TimeoutError, NetworkError],
 *   backoffFactor: 1.5,
 * });
 * ```
 *
 * @example Custom exception filtering
 * ```ts
 * function shouldRetry(error: Error): boolean {
 *   // Only retry on 5xx errors
 *   if (error.name === "HTTPError" && "statusCode" in error) {
 *     const statusCode = (error as any).statusCode;
 *     return 500 <= statusCode && statusCode < 600;
 *   }
 *   return false;
 * }
 *
 * const retry = toolRetryMiddleware({
 *   maxRetries: 3,
 *   retryOn: shouldRetry,
 * });
 * ```
 *
 * @example Apply to specific tools with custom error handling
 * ```ts
 * const formatError = (error: Error) =>
 *   "Database temporarily unavailable. Please try again later.";
 *
 * const retry = toolRetryMiddleware({
 *   maxRetries: 4,
 *   tools: ["search_database"],
 *   onFailure: formatError,
 * });
 * ```
 *
 * @example Apply to specific tools using BaseTool instances
 * ```ts
 * import { tool } from "@langchain/core/tools";
 * import { z } from "zod";
 *
 * const searchDatabase = tool(
 *   async ({ query }) => {
 *     // Search implementation
 *     return results;
 *   },
 *   {
 *     name: "search_database",
 *     description: "Search the database",
 *     schema: z.object({ query: z.string() }),
 *   }
 * );
 *
 * const retry = toolRetryMiddleware({
 *   maxRetries: 4,
 *   tools: [searchDatabase], // Pass BaseTool instance
 * });
 * ```
 *
 * @example Constant backoff (no exponential growth)
 * ```ts
 * const retry = toolRetryMiddleware({
 *   maxRetries: 5,
 *   backoffFactor: 0.0, // No exponential growth
 *   initialDelayMs: 2000, // Always wait 2 seconds
 * });
 * ```
 *
 * @example Raise exception on failure
 * ```ts
 * const retry = toolRetryMiddleware({
 *   maxRetries: 2,
 *   onFailure: "raise", // Re-raise exception instead of returning message
 * });
 * ```
 *
 * @param config - Configuration options for the retry middleware
 * @returns A middleware instance that handles tool failures with retries
 */
declare function toolRetryMiddleware(config?: ToolRetryMiddlewareConfig): AgentMiddleware<undefined, z.ZodObject<{
  /**
   * Optional list of tools or tool names to apply retry logic to.
   * Can be a list of `BaseTool` instances or tool name strings.
   * If `undefined`, applies to all tools. Default is `undefined`.
   */
  tools: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodType<ClientTool, z.ZodTypeDef, ClientTool>, z.ZodType<ServerTool, z.ZodTypeDef, ServerTool>, z.ZodString]>, "many">>;
  /**
   * Behavior when all retries are exhausted. Options:
   * - `"continue"` (default): Return an AIMessage with error details, allowing
   *   the agent to potentially handle the failure gracefully.
   * - `"error"`: Re-raise the exception, stopping agent execution.
   * - Custom function: Function that takes the exception and returns a string
   *   for the AIMessage content, allowing custom error formatting.
   *
   * Deprecated values:
   * - `"raise"`: use `"error"` instead.
   * - `"return_message"`: use `"continue"` instead.
   */
  onFailure: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"error">, z.ZodLiteral<"continue">, z.ZodLiteral<"raise">, z.ZodLiteral<"return_message">, z.ZodFunction<z.ZodTuple<[z.ZodType<Error, z.ZodTypeDef, Error>], z.ZodUnknown>, z.ZodString>]>>;
} & {
  maxRetries: z.ZodDefault<z.ZodNumber>;
  retryOn: z.ZodDefault<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodType<Error, z.ZodTypeDef, Error>], z.ZodUnknown>, z.ZodBoolean>, z.ZodArray<z.ZodType<new (...args: any[]) => Error, z.ZodTypeDef, new (...args: any[]) => Error>, "many">]>>;
  backoffFactor: z.ZodDefault<z.ZodNumber>;
  initialDelayMs: z.ZodDefault<z.ZodNumber>;
  maxDelayMs: z.ZodDefault<z.ZodNumber>;
  jitter: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
  maxRetries: number;
  retryOn: (new (...args: any[]) => Error)[] | ((args_0: Error, ...args: unknown[]) => boolean);
  backoffFactor: number;
  initialDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  tools?: (string | ServerTool | ClientTool)[] | undefined;
  onFailure: "continue" | "error" | "raise" | "return_message" | ((args_0: Error, ...args: unknown[]) => string);
}, {
  maxRetries?: number | undefined;
  retryOn?: (new (...args: any[]) => Error)[] | ((args_0: Error, ...args: unknown[]) => boolean) | undefined;
  backoffFactor?: number | undefined;
  initialDelayMs?: number | undefined;
  maxDelayMs?: number | undefined;
  jitter?: boolean | undefined;
  tools?: (string | ServerTool | ClientTool)[] | undefined;
  onFailure?: "continue" | "error" | "raise" | "return_message" | ((args_0: Error, ...args: unknown[]) => string) | undefined;
}>, {
  maxRetries: number;
  retryOn: (new (...args: any[]) => Error)[] | ((args_0: Error, ...args: unknown[]) => boolean);
  backoffFactor: number;
  initialDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  tools?: (string | ServerTool | ClientTool)[] | undefined;
  onFailure: "continue" | "error" | "raise" | "return_message" | ((args_0: Error, ...args: unknown[]) => string);
}, readonly (ServerTool | ClientTool)[]>;
//#endregion
export { ToolRetryMiddlewareConfig, toolRetryMiddleware };
//# sourceMappingURL=toolRetry.d.cts.map