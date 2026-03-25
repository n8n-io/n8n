import { BaseChain } from "../base.cjs";
import { RetrievalQAChainInput } from "../retrieval_qa.cjs";
import { MultiRouteChain, MultiRouteChainInput } from "./multi_route.cjs";
import { PromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { BaseRetrieverInterface } from "@langchain/core/retrievers";

//#region src/chains/router/multi_retrieval_qa.d.ts

/**
 * A type that represents the default values for the MultiRetrievalQAChain
 * class. It includes optional properties for the default retriever,
 * default prompt, and default chain.
 */
type MultiRetrievalDefaults = {
  defaultRetriever?: BaseRetrieverInterface;
  defaultPrompt?: PromptTemplate;
  defaultChain?: BaseChain;
};
/**
 * A class that represents a multi-retrieval question answering chain in
 * the LangChain framework. It extends the MultiRouteChain class and
 * provides additional functionality specific to multi-retrieval QA
 * chains.
 * @example
 * ```typescript
 * const multiRetrievalQAChain = MultiRetrievalQAChain.fromLLMAndRetrievers(
 *   new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   {
 *     retrieverNames: ["aqua teen", "mst3k", "animaniacs"],
 *     retrieverDescriptions: [
 *       "Good for answering questions about Aqua Teen Hunger Force theme song",
 *       "Good for answering questions about Mystery Science Theater 3000 theme song",
 *       "Good for answering questions about Animaniacs theme song",
 *     ],
 *     retrievers: [
 *       new MemoryVectorStore().asRetriever(3),
 *       new MemoryVectorStore().asRetriever(3),
 *       new MemoryVectorStore().asRetriever(3),
 *     ],
 *     retrievalQAChainOpts: {
 *       returnSourceDocuments: true,
 *     },
 *   },
 * );
 *
 * const result = await multiRetrievalQAChain.call({
 *   input:
 *     "In the Aqua Teen Hunger Force theme song, who calls himself the mike rula?",
 * });
 *
 * console.log(result.sourceDocuments, result.text);
 * ```
 */
declare class MultiRetrievalQAChain extends MultiRouteChain {
  get outputKeys(): string[];
  /**
   * @deprecated Use `fromRetrieversAndPrompts` instead
   */
  static fromRetrievers(llm: BaseLanguageModelInterface, retrieverNames: string[], retrieverDescriptions: string[], retrievers: BaseRetrieverInterface[], retrieverPrompts?: PromptTemplate[], defaults?: MultiRetrievalDefaults, options?: Omit<MultiRouteChainInput, "defaultChain">): MultiRetrievalQAChain;
  /**
   * A static method that creates an instance of MultiRetrievalQAChain from
   * a BaseLanguageModel and a set of retrievers. It takes in optional
   * parameters for the retriever names, descriptions, prompts, defaults,
   * and additional options. It is an alternative method to fromRetrievers
   * and provides more flexibility in configuring the underlying chains.
   * @param llm A BaseLanguageModel instance.
   * @param retrieverNames An array of retriever names.
   * @param retrieverDescriptions An array of retriever descriptions.
   * @param retrievers An array of BaseRetrieverInterface instances.
   * @param retrieverPrompts An optional array of PromptTemplate instances for the retrievers.
   * @param defaults An optional MultiRetrievalDefaults instance.
   * @param multiRetrievalChainOpts Additional optional parameters for the multi-retrieval chain.
   * @param retrievalQAChainOpts Additional optional parameters for the retrieval QA chain.
   * @returns A new instance of MultiRetrievalQAChain.
   */
  static fromLLMAndRetrievers(llm: BaseLanguageModelInterface, {
    retrieverNames,
    retrieverDescriptions,
    retrievers,
    retrieverPrompts,
    defaults,
    multiRetrievalChainOpts,
    retrievalQAChainOpts
  }: {
    retrieverNames: string[];
    retrieverDescriptions: string[];
    retrievers: BaseRetrieverInterface[];
    retrieverPrompts?: PromptTemplate[];
    defaults?: MultiRetrievalDefaults;
    multiRetrievalChainOpts?: Omit<MultiRouteChainInput, "defaultChain">;
    retrievalQAChainOpts?: Partial<Omit<RetrievalQAChainInput, "retriever" | "combineDocumentsChain">> & {
      prompt?: PromptTemplate;
    };
  }): MultiRetrievalQAChain;
  _chainType(): string;
}
//#endregion
export { MultiRetrievalQAChain };
//# sourceMappingURL=multi_retrieval_qa.d.cts.map