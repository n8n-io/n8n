import { AgentMiddleware } from "./types.cjs";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { InferInteropZodInput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/agents/middleware/modelCallLimit.d.ts
declare const contextSchema: z.ZodObject<{
  /**
   * The maximum number of model calls allowed per thread.
   */
  threadLimit: z.ZodOptional<z.ZodNumber>;
  /**
   * The maximum number of model calls allowed per run.
   */
  runLimit: z.ZodOptional<z.ZodNumber>;
  /**
   * The behavior to take when the limit is exceeded.
   * - "error" will throw an error and stop the agent.
   * - "end" will end the agent.
   * @default "end"
   */
  exitBehavior: z.ZodOptional<z.ZodEnum<["error", "end"]>>;
}, "strip", z.ZodTypeAny, {
  threadLimit?: number | undefined;
  runLimit?: number | undefined;
  exitBehavior?: "end" | "error" | undefined;
}, {
  threadLimit?: number | undefined;
  runLimit?: number | undefined;
  exitBehavior?: "end" | "error" | undefined;
}>;
type ModelCallLimitMiddlewareConfig = Partial<InferInteropZodInput<typeof contextSchema>>;
/**
 * Creates a middleware to limit the number of model calls at both thread and run levels.
 *
 * This middleware helps prevent excessive model API calls by enforcing limits on how many
 * times the model can be invoked. It supports two types of limits:
 *
 * - **Thread-level limit**: Restricts the total number of model calls across an entire conversation thread
 * - **Run-level limit**: Restricts the number of model calls within a single agent run/invocation
 *
 * ## How It Works
 *
 * The middleware intercepts model requests before they are sent and checks the current call counts
 * against the configured limits. If either limit is exceeded, it throws a `ModelCallLimitMiddlewareError`
 * to stop execution and prevent further API calls.
 *
 * ## Use Cases
 *
 * - **Cost Control**: Prevent runaway costs from excessive model calls in production
 * - **Testing**: Ensure agents don't make too many calls during development/testing
 * - **Safety**: Limit potential infinite loops or recursive agent behaviors
 * - **Rate Limiting**: Enforce organizational policies on model usage per conversation
 *
 * @param middlewareOptions - Configuration options for the call limits
 * @param middlewareOptions.threadLimit - Maximum number of model calls allowed per thread (optional)
 * @param middlewareOptions.runLimit - Maximum number of model calls allowed per run (optional)
 *
 * @returns A middleware instance that can be passed to `createAgent`
 *
 * @throws {ModelCallLimitMiddlewareError} When either the thread or run limit is exceeded
 *
 * @example
 * ```typescript
 * import { createAgent, modelCallLimitMiddleware } from "langchain";
 *
 * // Limit to 10 calls per thread and 3 calls per run
 * const agent = createAgent({
 *   model: "openai:gpt-4o-mini",
 *   tools: [myTool],
 *   middleware: [
 *     modelCallLimitMiddleware({
 *       threadLimit: 10,
 *       runLimit: 3
 *     })
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Limits can also be configured at runtime via context
 * const result = await agent.invoke(
 *   { messages: ["Hello"] },
 *   {
 *     configurable: {
 *       threadLimit: 5  // Override the default limit for this run
 *     }
 *   }
 * );
 * ```
 */
declare function modelCallLimitMiddleware(middlewareOptions?: ModelCallLimitMiddlewareConfig): AgentMiddleware<z.ZodObject<{
  threadModelCallCount: z.ZodDefault<z.ZodNumber>;
  runModelCallCount: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  threadModelCallCount: number;
  runModelCallCount: number;
}, {
  threadModelCallCount?: number | undefined;
  runModelCallCount?: number | undefined;
}>, z.ZodObject<{
  /**
   * The maximum number of model calls allowed per thread.
   */
  threadLimit: z.ZodOptional<z.ZodNumber>;
  /**
   * The maximum number of model calls allowed per run.
   */
  runLimit: z.ZodOptional<z.ZodNumber>;
  /**
   * The behavior to take when the limit is exceeded.
   * - "error" will throw an error and stop the agent.
   * - "end" will end the agent.
   * @default "end"
   */
  exitBehavior: z.ZodOptional<z.ZodEnum<["error", "end"]>>;
}, "strip", z.ZodTypeAny, {
  threadLimit?: number | undefined;
  runLimit?: number | undefined;
  exitBehavior?: "end" | "error" | undefined;
}, {
  threadLimit?: number | undefined;
  runLimit?: number | undefined;
  exitBehavior?: "end" | "error" | undefined;
}>, {
  threadLimit?: number | undefined;
  runLimit?: number | undefined;
  exitBehavior?: "end" | "error" | undefined;
}, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { ModelCallLimitMiddlewareConfig, modelCallLimitMiddleware };
//# sourceMappingURL=modelCallLimit.d.cts.map