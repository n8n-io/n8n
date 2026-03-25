import { MapReduceDocumentsChain, MapReduceDocumentsChainInput, RefineDocumentsChain, StuffDocumentsChain } from "../combine_docs_chain.js";
import { BasePromptTemplate } from "@langchain/core/prompts";
import * as _langchain_core_language_models_base0 from "@langchain/core/language_models/base";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

//#region src/chains/question_answering/load.d.ts

/**
 * Represents the parameters for creating a QAChain. It can be of three
 * types: "stuff", "map_reduce", or "refine".
 */
type QAChainParams = ({
  type?: "stuff";
} & StuffQAChainParams) | ({
  type?: "map_reduce";
} & MapReduceQAChainParams) | ({
  type?: "refine";
} & RefineQAChainParams);
declare const loadQAChain: (llm: BaseLanguageModelInterface<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>, params?: QAChainParams) => MapReduceDocumentsChain | RefineDocumentsChain | StuffDocumentsChain;
/**
 * Represents the parameters for creating a StuffQAChain.
 */
interface StuffQAChainParams {
  prompt?: BasePromptTemplate;
  verbose?: boolean;
}
/**
 * Loads a StuffQAChain based on the provided parameters. It takes an LLM
 * instance and StuffQAChainParams as parameters.
 * @param llm An instance of BaseLanguageModel.
 * @param params Parameters for creating a StuffQAChain.
 * @returns A StuffQAChain instance.
 */
declare function loadQAStuffChain(llm: BaseLanguageModelInterface, params?: StuffQAChainParams): StuffDocumentsChain;
/**
 * Represents the parameters for creating a MapReduceQAChain.
 */
interface MapReduceQAChainParams {
  returnIntermediateSteps?: MapReduceDocumentsChainInput["returnIntermediateSteps"];
  combineMapPrompt?: BasePromptTemplate;
  combinePrompt?: BasePromptTemplate;
  combineLLM?: BaseLanguageModelInterface;
  verbose?: boolean;
}
/**
 * Loads a MapReduceQAChain based on the provided parameters. It takes an
 * LLM instance and MapReduceQAChainParams as parameters.
 * @param llm An instance of BaseLanguageModel.
 * @param params Parameters for creating a MapReduceQAChain.
 * @returns A MapReduceQAChain instance.
 */
declare function loadQAMapReduceChain(llm: BaseLanguageModelInterface, params?: MapReduceQAChainParams): MapReduceDocumentsChain;
/**
 * Represents the parameters for creating a RefineQAChain.
 */
interface RefineQAChainParams {
  questionPrompt?: BasePromptTemplate;
  refinePrompt?: BasePromptTemplate;
  refineLLM?: BaseLanguageModelInterface;
  verbose?: boolean;
}
/**
 * Loads a RefineQAChain based on the provided parameters. It takes an LLM
 * instance and RefineQAChainParams as parameters.
 * @param llm An instance of BaseLanguageModel.
 * @param params Parameters for creating a RefineQAChain.
 * @returns A RefineQAChain instance.
 */
declare function loadQARefineChain(llm: BaseLanguageModelInterface, params?: RefineQAChainParams): RefineDocumentsChain;
//#endregion
export { MapReduceQAChainParams, QAChainParams, RefineQAChainParams, StuffQAChainParams, loadQAChain, loadQAMapReduceChain, loadQARefineChain, loadQAStuffChain };
//# sourceMappingURL=load.d.ts.map