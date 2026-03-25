import { BaseChain } from "../base.js";
import { LLMChainInput } from "../llm_chain.js";
import { MultiRouteChain, MultiRouteChainInput } from "./multi_route.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

//#region src/chains/router/multi_prompt.d.ts

/**
 * A class that represents a multi-prompt chain in the LangChain
 * framework. It extends the MultiRouteChain class and provides additional
 * functionality specific to multi-prompt chains.
 * @example
 * ```typescript
 * const multiPromptChain = MultiPromptChain.fromLLMAndPrompts(
 *   new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   {
 *     promptNames: ["physics", "math", "history"],
 *     promptDescriptions: [
 *       "Good for answering questions about physics",
 *       "Good for answering math questions",
 *       "Good for answering questions about history",
 *     ],
 *     promptTemplates: [
 *       `You are a very smart physics professor. Here is a question:\n{input}\n`,
 *       `You are a very good mathematician. Here is a question:\n{input}\n`,
 *       `You are a very smart history professor. Here is a question:\n{input}\n`,
 *     ],
 *   }
 * );
 * const result = await multiPromptChain.call({
 *   input: "What is the speed of light?",
 * });
 * ```
 */
declare class MultiPromptChain extends MultiRouteChain {
  /**
   * @deprecated Use `fromLLMAndPrompts` instead
   */
  static fromPrompts(llm: BaseLanguageModelInterface, promptNames: string[], promptDescriptions: string[], promptTemplates: string[] | PromptTemplate[], defaultChain?: BaseChain, options?: Omit<MultiRouteChainInput, "defaultChain">): MultiPromptChain;
  /**
   * A static method that creates an instance of MultiPromptChain from a
   * BaseLanguageModel and a set of prompts. It takes in optional parameters
   * for the default chain and additional options.
   * @param llm A BaseLanguageModel instance.
   * @param promptNames An array of prompt names.
   * @param promptDescriptions An array of prompt descriptions.
   * @param promptTemplates An array of prompt templates.
   * @param defaultChain An optional BaseChain instance to be used as the default chain.
   * @param llmChainOpts Optional parameters for the LLMChainInput, excluding 'llm' and 'prompt'.
   * @param conversationChainOpts Optional parameters for the LLMChainInput, excluding 'llm' and 'outputKey'.
   * @param multiRouteChainOpts Optional parameters for the MultiRouteChainInput, excluding 'defaultChain'.
   * @returns An instance of MultiPromptChain.
   */
  static fromLLMAndPrompts(llm: BaseLanguageModelInterface, {
    promptNames,
    promptDescriptions,
    promptTemplates,
    defaultChain,
    llmChainOpts,
    conversationChainOpts,
    multiRouteChainOpts
  }: {
    promptNames: string[];
    promptDescriptions: string[];
    promptTemplates: string[] | PromptTemplate[];
    defaultChain?: BaseChain;
    llmChainOpts?: Omit<LLMChainInput, "llm" | "prompt">;
    conversationChainOpts?: Omit<LLMChainInput, "llm" | "outputKey">;
    multiRouteChainOpts?: Omit<MultiRouteChainInput, "defaultChain">;
  }): MultiPromptChain;
  _chainType(): string;
}
//#endregion
export { MultiPromptChain };
//# sourceMappingURL=multi_prompt.d.ts.map