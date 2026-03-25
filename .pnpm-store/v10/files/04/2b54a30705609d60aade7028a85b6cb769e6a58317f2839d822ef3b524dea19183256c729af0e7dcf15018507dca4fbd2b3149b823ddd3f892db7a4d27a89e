import { AgentMiddleware } from "../../types.cjs";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

//#region src/agents/middleware/provider/openai/moderation.d.ts
type ModerationModel = "omni-moderation-latest" | "omni-moderation-2024-09-26" | "text-moderation-latest" | "text-moderation-stable";
/**
 * Error raised when OpenAI flags content and `exitBehavior` is set to `"error"`.
 */
/**
 * Options for configuring the OpenAI Moderation middleware.
 */
interface OpenAIModerationMiddlewareOptions {
  /**
   * OpenAI model to use for moderation. Can be either a model name or a BaseChatModel instance.
   * @example
   * ```ts
   * const model = new ChatOpenAI({ model: "gpt-4o-mini" });
   * const middleware = openAIModerationMiddleware({ model });
   * const agent = createAgent({
   *   model,
   *   middleware: [middleware],
   * });
   * ```
   * @example
   * ```ts
   * const middleware = openAIModerationMiddleware({ model: "gpt-4o-mini" });
   * const agent = createAgent({
   *   model: "gpt-5",
   *   middleware: [middleware],
   * });
   * ```
   */
  model: string | BaseChatModel;
  /**
   * Moderation model to use.
   * @default "omni-moderation-latest"
   */
  moderationModel?: ModerationModel;
  /**
   * Whether to check user input messages.
   * @default true
   */
  checkInput?: boolean;
  /**
   * Whether to check model output messages.
   * @default true
   */
  checkOutput?: boolean;
  /**
   * Whether to check tool result messages.
   * @default false
   */
  checkToolResults?: boolean;
  /**
   * How to handle violations.
   * - `"error"`: Throw an error when content is flagged
   * - `"end"`: End the agent execution and return a violation message
   * - `"replace"`: Replace the flagged content with a violation message
   * @default "end"
   */
  exitBehavior?: "error" | "end" | "replace";
  /**
   * Custom template for violation messages.
   * Available placeholders: `{categories}`, `{category_scores}`, `{original_content}`
   */
  violationMessage?: string;
}
/**
 * Middleware that moderates agent traffic using OpenAI's moderation endpoint.
 *
 * This middleware checks messages for content policy violations at different stages:
 * - Input: User messages before they reach the model
 * - Output: AI model responses
 * - Tool results: Results returned from tool executions
 *
 * @param options - Configuration options for the middleware
 * @param options.model - OpenAI model to use for moderation. Can be either a model name or a BaseChatModel instance.
 * @param options.moderationModel - Moderation model to use.
 * @param options.checkInput - Whether to check user input messages.
 * @param options.checkOutput - Whether to check model output messages.
 * @param options.checkToolResults - Whether to check tool result messages.
 * @param options.exitBehavior - How to handle violations.
 * @param options.violationMessage - Custom template for violation messages.
 * @returns Middleware function that can be used to moderate agent traffic.
 *
 * @example  Using model instance
 * ```ts
 * import { createAgent, openAIModerationMiddleware } from "langchain";
 *
 * const middleware = openAIModerationMiddleware({
 *   checkInput: true,
 *   checkOutput: true,
 *   exitBehavior: "end"
 * });
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   tools: [...],
 *   middleware: [middleware],
 * });
 * ```
 *
 * @example Using model name
 * ```ts
 * import { createAgent, openAIModerationMiddleware } from "langchain";
 *
 * const middleware = openAIModerationMiddleware({
 *   model: "gpt-4o-mini",
 *   checkInput: true,
 *   checkOutput: true,
 *   exitBehavior: "end"
 * });
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   tools: [...],
 *   middleware: [middleware],
 * });
 * ```
 *
 * @example Custom violation message
 * ```ts
 * const middleware = openAIModerationMiddleware({
 *   violationMessage: "Content flagged: {categories}. Scores: {category_scores}"
 * });
 * ```
 */
declare function openAIModerationMiddleware(options: OpenAIModerationMiddlewareOptions): AgentMiddleware;
//#endregion
export { OpenAIModerationMiddlewareOptions, openAIModerationMiddleware };
//# sourceMappingURL=moderation.d.cts.map