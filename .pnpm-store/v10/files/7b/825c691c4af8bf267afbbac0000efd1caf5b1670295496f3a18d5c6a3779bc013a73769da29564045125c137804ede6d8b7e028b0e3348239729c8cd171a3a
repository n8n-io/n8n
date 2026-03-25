import { ChainInputs } from "../base.js";
import { LLMChain } from "../llm_chain.js";
import { RouterChain } from "./multi_route.js";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { ChainValues } from "@langchain/core/utils/types";

//#region src/chains/router/llm_router.d.ts

/**
 * A type that represents the output schema of a router chain. It defines
 * the structure of the output data returned by the router chain.
 */
type RouterOutputSchema = {
  destination: string;
  next_inputs: {
    [key: string]: string;
  };
};
/**
 * An interface that extends the default ChainInputs interface and adds an
 * additional "llmChain" property.
 */
interface LLMRouterChainInput extends ChainInputs {
  llmChain: LLMChain<RouterOutputSchema>;
}
/**
 * A class that represents an LLM router chain in the LangChain framework.
 * It extends the RouterChain class and implements the LLMRouterChainInput
 * interface. It provides additional functionality specific to LLMs and
 * routing based on LLM predictions.
 */
declare class LLMRouterChain extends RouterChain implements LLMRouterChainInput {
  llmChain: LLMChain<RouterOutputSchema>;
  constructor(fields: LLMRouterChainInput);
  get inputKeys(): string[];
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun | undefined): Promise<RouterOutputSchema>;
  _chainType(): string;
  /**
   * A static method that creates an instance of LLMRouterChain from a
   * BaseLanguageModel and a BasePromptTemplate. It takes in an optional
   * options object and returns an instance of LLMRouterChain with the
   * specified LLMChain.
   * @param llm A BaseLanguageModel instance.
   * @param prompt A BasePromptTemplate instance.
   * @param options Optional LLMRouterChainInput object, excluding "llmChain".
   * @returns An instance of LLMRouterChain.
   */
  static fromLLM(llm: BaseLanguageModelInterface, prompt: BasePromptTemplate, options?: Omit<LLMRouterChainInput, "llmChain">): LLMRouterChain;
}
//#endregion
export { LLMRouterChain, LLMRouterChainInput, RouterOutputSchema };
//# sourceMappingURL=llm_router.d.ts.map