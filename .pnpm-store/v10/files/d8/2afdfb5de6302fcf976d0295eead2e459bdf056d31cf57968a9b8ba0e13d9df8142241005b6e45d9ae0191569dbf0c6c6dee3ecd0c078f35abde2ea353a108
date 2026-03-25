import { MapReduceDocumentsChain, MapReduceDocumentsChainInput, RefineDocumentsChain, StuffDocumentsChain } from "../combine_docs_chain.js";
import { BasePromptTemplate } from "@langchain/core/prompts";
import * as _langchain_core_language_models_base0 from "@langchain/core/language_models/base";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

//#region src/chains/summarization/load.d.ts

/**
 * Type for the base parameters that can be used to configure a
 * summarization chain.
 */
type BaseParams = {
  verbose?: boolean;
};
/** @interface */
type SummarizationChainParams = BaseParams & ({
  type?: "stuff";
  prompt?: BasePromptTemplate;
} | ({
  type?: "map_reduce";
  combineMapPrompt?: BasePromptTemplate;
  combinePrompt?: BasePromptTemplate;
  combineLLM?: BaseLanguageModelInterface;
} & Pick<MapReduceDocumentsChainInput, "returnIntermediateSteps">) | {
  type?: "refine";
  refinePrompt?: BasePromptTemplate;
  refineLLM?: BaseLanguageModelInterface;
  questionPrompt?: BasePromptTemplate;
});
declare const loadSummarizationChain: (llm: BaseLanguageModelInterface<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>, params?: SummarizationChainParams) => MapReduceDocumentsChain | RefineDocumentsChain | StuffDocumentsChain;
//#endregion
export { SummarizationChainParams, loadSummarizationChain };
//# sourceMappingURL=load.d.ts.map