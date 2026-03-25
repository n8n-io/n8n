import { AgentMiddleware } from "./types.cjs";
import * as _langchain_core_language_models_base0 from "@langchain/core/language_models/base";
import { BaseLanguageModel } from "@langchain/core/language_models/base";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { InferInteropZodInput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/agents/middleware/llmToolSelector.d.ts
/**
 * Options for configuring the LLM Tool Selector middleware.
 */
declare const LLMToolSelectorOptionsSchema: z.ZodObject<{
  /**
   * The language model to use for tool selection (default: the provided model from the agent options).
   */
  model: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>, z.ZodTypeDef, BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>>]>>;
  /**
   * System prompt for the tool selection model.
   */
  systemPrompt: z.ZodOptional<z.ZodString>;
  /**
   * Maximum number of tools to select. If the model selects more,
   * only the first maxTools will be used. No limit if not specified.
   */
  maxTools: z.ZodOptional<z.ZodNumber>;
  /**
   * Tool names to always include regardless of selection.
   * These do not count against the maxTools limit.
   */
  alwaysInclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
  model?: string | BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions> | undefined;
  systemPrompt?: string | undefined;
  maxTools?: number | undefined;
  alwaysInclude?: string[] | undefined;
}, {
  model?: string | BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions> | undefined;
  systemPrompt?: string | undefined;
  maxTools?: number | undefined;
  alwaysInclude?: string[] | undefined;
}>;
type LLMToolSelectorConfig = InferInteropZodInput<typeof LLMToolSelectorOptionsSchema>;
/**
 * Middleware for selecting tools using an LLM-based strategy.
 *
 * When an agent has many tools available, this middleware filters them down
 * to only the most relevant ones for the user's query. This reduces token usage
 * and helps the main model focus on the right tools.
 *
 * @param options - Configuration options for the middleware
 * @param options.model - The language model to use for tool selection (default: the provided model from the agent options).
 * @param options.systemPrompt - Instructions for the selection model.
 * @param options.maxTools - Maximum number of tools to select. If the model selects more,
 *   only the first maxTools will be used. No limit if not specified.
 * @param options.alwaysInclude - Tool names to always include regardless of selection.
 *   These do not count against the maxTools limit.
 *
 * @example
 * Limit to 3 tools:
 * ```ts
 * import { llmToolSelectorMiddleware } from "langchain/agents/middleware";
 *
 * const middleware = llmToolSelectorMiddleware({ maxTools: 3 });
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   tools: [tool1, tool2, tool3, tool4, tool5],
 *   middleware: [middleware],
 * });
 * ```
 *
 * @example
 * Use a smaller model for selection:
 * ```ts
 * const middleware = llmToolSelectorMiddleware({
 *   model: "openai:gpt-4o-mini",
 *   maxTools: 2
 * });
 * ```
 */
declare function llmToolSelectorMiddleware(options: LLMToolSelectorConfig): AgentMiddleware<undefined, z.ZodObject<{
  /**
   * The language model to use for tool selection (default: the provided model from the agent options).
   */
  model: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>, z.ZodTypeDef, BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>>]>>;
  /**
   * System prompt for the tool selection model.
   */
  systemPrompt: z.ZodOptional<z.ZodString>;
  /**
   * Maximum number of tools to select. If the model selects more,
   * only the first maxTools will be used. No limit if not specified.
   */
  maxTools: z.ZodOptional<z.ZodNumber>;
  /**
   * Tool names to always include regardless of selection.
   * These do not count against the maxTools limit.
   */
  alwaysInclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
  model?: string | BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions> | undefined;
  systemPrompt?: string | undefined;
  maxTools?: number | undefined;
  alwaysInclude?: string[] | undefined;
}, {
  model?: string | BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions> | undefined;
  systemPrompt?: string | undefined;
  maxTools?: number | undefined;
  alwaysInclude?: string[] | undefined;
}>, {
  model?: string | BaseLanguageModel<unknown, _langchain_core_language_models_base0.BaseLanguageModelCallOptions> | undefined;
  systemPrompt?: string | undefined;
  maxTools?: number | undefined;
  alwaysInclude?: string[] | undefined;
}, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { LLMToolSelectorConfig, llmToolSelectorMiddleware };
//# sourceMappingURL=llmToolSelector.d.cts.map