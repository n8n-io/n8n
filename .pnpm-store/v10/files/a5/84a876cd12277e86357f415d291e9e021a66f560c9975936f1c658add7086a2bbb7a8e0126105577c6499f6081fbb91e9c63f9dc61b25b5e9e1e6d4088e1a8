import { AgentMiddleware } from "./types.cjs";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { InferInteropZodInput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/agents/middleware/toolCallLimit.d.ts
/**
 * Exception raised when tool call limits are exceeded.
 *
 * This exception is raised when the configured exit behavior is 'error'
 * and either the thread or run tool call limit has been exceeded.
 */
declare class ToolCallLimitExceededError extends Error {
  /**
   * Current thread tool call count.
   */
  threadCount: number;
  /**
   * Current run tool call count.
   */
  runCount: number;
  /**
   * Thread tool call limit (if set).
   */
  threadLimit: number | undefined;
  /**
   * Run tool call limit (if set).
   */
  runLimit: number | undefined;
  /**
   * Tool name being limited (if specific tool), or undefined for all tools.
   */
  toolName: string | undefined;
  constructor(threadCount: number, runCount: number, threadLimit: number | undefined, runLimit: number | undefined, toolName?: string | undefined);
}
/**
 * Options for configuring the Tool Call Limit middleware.
 */
declare const ToolCallLimitOptionsSchema: z.ZodObject<{
  /**
   * Name of the specific tool to limit. If undefined, limits apply to all tools.
   */
  toolName: z.ZodOptional<z.ZodString>;
  /**
   * Maximum number of tool calls allowed per thread.
   * undefined means no limit.
   */
  threadLimit: z.ZodOptional<z.ZodNumber>;
  /**
   * Maximum number of tool calls allowed per run.
   * undefined means no limit.
   */
  runLimit: z.ZodOptional<z.ZodNumber>;
  /**
   * What to do when limits are exceeded.
   * - "continue": Block exceeded tools with error messages, let other tools continue (default)
   * - "error": Raise a ToolCallLimitExceededError exception
   * - "end": Stop execution immediately, injecting a ToolMessage and an AI message
   *   for the single tool call that exceeded the limit. Raises NotImplementedError
   *   if there are multiple tool calls.
   *
   * @default "continue"
   */
  exitBehavior: z.ZodDefault<z.ZodEnum<["continue", "error", "end"]>>;
}, "strip", z.ZodTypeAny, {
  toolName?: string | undefined;
  threadLimit?: number | undefined;
  runLimit?: number | undefined;
  exitBehavior: "continue" | "end" | "error";
}, {
  toolName?: string | undefined;
  threadLimit?: number | undefined;
  runLimit?: number | undefined;
  exitBehavior?: "continue" | "end" | "error" | undefined;
}>;
type ToolCallLimitConfig = InferInteropZodInput<typeof ToolCallLimitOptionsSchema>;
/**
 * Middleware that tracks tool call counts and enforces limits.
 *
 * This middleware monitors the number of tool calls made during agent execution
 * and can terminate the agent when specified limits are reached. It supports
 * both thread-level and run-level call counting with configurable exit behaviors.
 *
 * Thread-level: The middleware counts all tool calls in the entire message history
 * and persists this count across multiple runs (invocations) of the agent.
 *
 * Run-level: The middleware counts tool calls made after the last HumanMessage,
 * representing the current run (invocation) of the agent.
 *
 * @param options - Configuration options for the middleware
 * @param options.toolName - Name of the specific tool to limit. If undefined, limits apply to all tools.
 * @param options.threadLimit - Maximum number of tool calls allowed per thread. undefined means no limit.
 * @param options.runLimit - Maximum number of tool calls allowed per run. undefined means no limit.
 * @param options.exitBehavior - What to do when limits are exceeded.
 *   - "continue": Block exceeded tools with error messages, let other tools continue. Model decides when to end. (default)
 *   - "error": Raise a ToolCallLimitExceededError exception
 *   - "end": Stop execution immediately with a ToolMessage + AI message for the single tool call that exceeded the limit. Raises NotImplementedError if there are multiple tool calls.
 *
 * @throws {Error} If both limits are undefined, if exitBehavior is invalid, or if runLimit exceeds threadLimit.
 * @throws {NotImplementedError} If exitBehavior is "end" and there are multiple tool calls.
 *
 * @example Continue execution with blocked tools (default)
 * ```ts
 * import { toolCallLimitMiddleware } from "@langchain/langchain/agents/middleware";
 * import { createAgent } from "@langchain/langchain/agents";
 *
 * // Block exceeded tools but let other tools and model continue
 * const limiter = toolCallLimitMiddleware({
 *   threadLimit: 20,
 *   runLimit: 10,
 *   exitBehavior: "continue", // default
 * });
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   middleware: [limiter]
 * });
 * ```
 *
 * @example Stop immediately when limit exceeded
 * ```ts
 * // End execution immediately with an AI message
 * const limiter = toolCallLimitMiddleware({
 *   runLimit: 5,
 *   exitBehavior: "end"
 * });
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   middleware: [limiter]
 * });
 * ```
 *
 * @example Raise exception on limit
 * ```ts
 * // Strict limit with exception handling
 * const limiter = toolCallLimitMiddleware({
 *   toolName: "search",
 *   threadLimit: 5,
 *   exitBehavior: "error"
 * });
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   middleware: [limiter]
 * });
 *
 * try {
 *   const result = await agent.invoke({ messages: [new HumanMessage("Task")] });
 * } catch (error) {
 *   if (error instanceof ToolCallLimitExceededError) {
 *     console.log(`Search limit exceeded: ${error}`);
 *   }
 * }
 * ```
 */
declare function toolCallLimitMiddleware(options: ToolCallLimitConfig): AgentMiddleware<z.ZodObject<{
  threadToolCallCount: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
  runToolCallCount: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
  threadToolCallCount: Record<string, number>;
  runToolCallCount: Record<string, number>;
}, {
  threadToolCallCount?: Record<string, number> | undefined;
  runToolCallCount?: Record<string, number> | undefined;
}>, undefined, unknown, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { ToolCallLimitConfig, ToolCallLimitExceededError, toolCallLimitMiddleware };
//# sourceMappingURL=toolCallLimit.d.cts.map