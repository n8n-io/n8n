import { AgentMiddleware } from "./types.cjs";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { z } from "zod/v3";

//#region src/agents/middleware/modelRetry.d.ts
/**
 * Configuration options for the Model Retry Middleware.
 */
declare const ModelRetryMiddlewareOptionsSchema: z.ZodObject<{
  /**
   * Behavior when all retries are exhausted. Options:
   * - `"continue"` (default): Return an AIMessage with error details, allowing
   *   the agent to potentially handle the failure gracefully.
   * - `"error"`: Re-raise the exception, stopping agent execution.
   * - Custom function: Function that takes the exception and returns a string
   *   for the AIMessage content, allowing custom error formatting.
   */
  onFailure: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"error">, z.ZodLiteral<"continue">, z.ZodFunction<z.ZodTuple<[z.ZodType<Error, z.ZodTypeDef, Error>], z.ZodUnknown>, z.ZodString>]>>;
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
  onFailure: "continue" | "error" | ((args_0: Error, ...args: unknown[]) => string);
}, {
  maxRetries?: number | undefined;
  retryOn?: (new (...args: any[]) => Error)[] | ((args_0: Error, ...args: unknown[]) => boolean) | undefined;
  backoffFactor?: number | undefined;
  initialDelayMs?: number | undefined;
  maxDelayMs?: number | undefined;
  jitter?: boolean | undefined;
  onFailure?: "continue" | "error" | ((args_0: Error, ...args: unknown[]) => string) | undefined;
}>;
type ModelRetryMiddlewareConfig = z.input<typeof ModelRetryMiddlewareOptionsSchema>;
/**
 * Middleware that automatically retries failed model calls with configurable backoff.
 *
 * Supports retrying on specific exceptions and exponential backoff.
 *
 * @example Basic usage with default settings (2 retries, exponential backoff)
 * ```ts
 * import { createAgent, modelRetryMiddleware } from "langchain";
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   tools: [searchTool],
 *   middleware: [modelRetryMiddleware()],
 * });
 * ```
 *
 * @example Retry specific exceptions only
 * ```ts
 * import { modelRetryMiddleware } from "langchain";
 *
 * const retry = modelRetryMiddleware({
 *   maxRetries: 4,
 *   retryOn: [TimeoutError, NetworkError],
 *   backoffFactor: 1.5,
 * });
 * ```
 *
 * @example Custom exception filtering
 * ```ts
 * function shouldRetry(error: Error): boolean {
 *   // Only retry on rate limit errors
 *   if (error.name === "RateLimitError") {
 *     return true;
 *   }
 *   // Or check for specific HTTP status codes
 *   if (error.name === "HTTPError" && "statusCode" in error) {
 *     const statusCode = (error as any).statusCode;
 *     return statusCode === 429 || statusCode === 503;
 *   }
 *   return false;
 * }
 *
 * const retry = modelRetryMiddleware({
 *   maxRetries: 3,
 *   retryOn: shouldRetry,
 * });
 * ```
 *
 * @example Return error message instead of raising
 * ```ts
 * const retry = modelRetryMiddleware({
 *   maxRetries: 4,
 *   onFailure: "continue", // Return AIMessage with error instead of throwing
 * });
 * ```
 *
 * @example Custom error message formatting
 * ```ts
 * const formatError = (error: Error) =>
 *   `Model call failed: ${error.message}. Please try again later.`;
 *
 * const retry = modelRetryMiddleware({
 *   maxRetries: 4,
 *   onFailure: formatError,
 * });
 * ```
 *
 * @example Constant backoff (no exponential growth)
 * ```ts
 * const retry = modelRetryMiddleware({
 *   maxRetries: 5,
 *   backoffFactor: 0.0, // No exponential growth
 *   initialDelayMs: 2000, // Always wait 2 seconds
 * });
 * ```
 *
 * @example Raise exception on failure
 * ```ts
 * const retry = modelRetryMiddleware({
 *   maxRetries: 2,
 *   onFailure: "error", // Re-raise exception instead of returning message
 * });
 * ```
 *
 * @param config - Configuration options for the retry middleware
 * @returns A middleware instance that handles model failures with retries
 */
declare function modelRetryMiddleware(config?: ModelRetryMiddlewareConfig): AgentMiddleware<undefined, z.ZodObject<{
  /**
   * Behavior when all retries are exhausted. Options:
   * - `"continue"` (default): Return an AIMessage with error details, allowing
   *   the agent to potentially handle the failure gracefully.
   * - `"error"`: Re-raise the exception, stopping agent execution.
   * - Custom function: Function that takes the exception and returns a string
   *   for the AIMessage content, allowing custom error formatting.
   */
  onFailure: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"error">, z.ZodLiteral<"continue">, z.ZodFunction<z.ZodTuple<[z.ZodType<Error, z.ZodTypeDef, Error>], z.ZodUnknown>, z.ZodString>]>>;
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
  onFailure: "continue" | "error" | ((args_0: Error, ...args: unknown[]) => string);
}, {
  maxRetries?: number | undefined;
  retryOn?: (new (...args: any[]) => Error)[] | ((args_0: Error, ...args: unknown[]) => boolean) | undefined;
  backoffFactor?: number | undefined;
  initialDelayMs?: number | undefined;
  maxDelayMs?: number | undefined;
  jitter?: boolean | undefined;
  onFailure?: "continue" | "error" | ((args_0: Error, ...args: unknown[]) => string) | undefined;
}>, {
  maxRetries: number;
  retryOn: (new (...args: any[]) => Error)[] | ((args_0: Error, ...args: unknown[]) => boolean);
  backoffFactor: number;
  initialDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  onFailure: "continue" | "error" | ((args_0: Error, ...args: unknown[]) => string);
}, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { ModelRetryMiddlewareConfig, modelRetryMiddleware };
//# sourceMappingURL=modelRetry.d.cts.map