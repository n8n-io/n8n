import { AgentMiddleware } from "./types.cjs";
import { LanguageModelLike } from "@langchain/core/language_models/base";
import * as _langchain_core_tools0 from "@langchain/core/tools";

//#region src/agents/middleware/modelFallback.d.ts
/**
 * Middleware that provides automatic model fallback on errors.
 *
 * This middleware attempts to retry failed model calls with alternative models
 * in sequence. When a model call fails, it tries the next model in the fallback
 * list until either a call succeeds or all models have been exhausted.
 *
 * @example
 * ```ts
 * import { createAgent, modelFallbackMiddleware } from "langchain";
 *
 * // Create middleware with fallback models (not including primary)
 * const fallback = modelFallbackMiddleware(
 *   "openai:gpt-4o-mini",  // First fallback
 *   "anthropic:claude-sonnet-4-5-20250929",  // Second fallback
 * );
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",  // Primary model
 *   middleware: [fallback],
 *   tools: [],
 * });
 *
 * // If gpt-4o fails, automatically tries gpt-4o-mini, then claude
 * const result = await agent.invoke({
 *   messages: [{ role: "user", content: "Hello" }]
 * });
 * ```
 *
 * @param fallbackModels - The fallback models to try, in order.
 * @returns A middleware instance that handles model failures with fallbacks
 */
declare function modelFallbackMiddleware(
/**
 * The fallback models to try, in order.
 */
...fallbackModels: (string | LanguageModelLike)[]): AgentMiddleware<undefined, undefined, unknown, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { modelFallbackMiddleware };
//# sourceMappingURL=modelFallback.d.cts.map