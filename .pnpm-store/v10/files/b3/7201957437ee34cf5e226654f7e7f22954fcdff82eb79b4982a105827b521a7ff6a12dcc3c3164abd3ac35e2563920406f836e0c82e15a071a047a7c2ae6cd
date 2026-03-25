import { SerializedAPIChain } from "../serde.cjs";
import { BaseChain, ChainInputs } from "../base.cjs";
import { LLMChain } from "../llm_chain.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";

//#region src/chains/api/api_chain.d.ts

/**
 * Interface that extends ChainInputs and defines additional input
 * parameters specific to an APIChain.
 */
interface APIChainInput extends Omit<ChainInputs, "memory"> {
  apiAnswerChain: LLMChain;
  apiRequestChain: LLMChain;
  apiDocs: string;
  inputKey?: string;
  headers?: Record<string, string>;
  /** Key to use for output, defaults to `output` */
  outputKey?: string;
}
/**
 * Type that defines optional configuration options for an APIChain.
 */
type APIChainOptions = {
  headers?: Record<string, string>;
  apiUrlPrompt?: BasePromptTemplate;
  apiResponsePrompt?: BasePromptTemplate;
};
/**
 * Class that extends BaseChain and represents a chain specifically
 * designed for making API requests and processing API responses.
 */
declare class APIChain extends BaseChain implements APIChainInput {
  apiAnswerChain: LLMChain;
  apiRequestChain: LLMChain;
  apiDocs: string;
  headers: {};
  inputKey: string;
  outputKey: string;
  get inputKeys(): string[];
  get outputKeys(): string[];
  constructor(fields: APIChainInput);
  /** @ignore */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): "api_chain";
  static deserialize(data: SerializedAPIChain): Promise<APIChain>;
  serialize(): SerializedAPIChain;
  /**
   * Static method to create a new APIChain from a BaseLanguageModel and API
   * documentation.
   * @param llm BaseLanguageModel instance.
   * @param apiDocs API documentation.
   * @param options Optional configuration options for the APIChain.
   * @returns New APIChain instance.
   */
  static fromLLMAndAPIDocs(llm: BaseLanguageModelInterface, apiDocs: string, options?: APIChainOptions & Omit<APIChainInput, "apiAnswerChain" | "apiRequestChain" | "apiDocs">): APIChain;
}
//#endregion
export { APIChain, APIChainInput, APIChainOptions };
//# sourceMappingURL=api_chain.d.cts.map