import { LLMChain } from "../chains/llm_chain.js";
import { BaseDocumentCompressor } from "./document_compressors/index.js";
import { Document } from "@langchain/core/documents";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { BaseRetriever, BaseRetrieverInput, BaseRetrieverInterface } from "@langchain/core/retrievers";

//#region src/retrievers/multi_query.d.ts
interface LineList {
  lines: string[];
}
type MultiDocs = Document<Record<string, any>>[];
interface MultiQueryRetrieverInput extends BaseRetrieverInput {
  retriever: BaseRetrieverInterface;
  /** @deprecated Pass a custom prompt into `.fromLLM` instead. */
  llmChain: LLMChain<LineList>;
  queryCount?: number;
  parserKey?: string;
  documentCompressor?: BaseDocumentCompressor | undefined;
  documentCompressorFilteringFn?: (docs: MultiDocs) => MultiDocs;
}
/**
 * @example
 * ```typescript
 * const retriever = new MultiQueryRetriever.fromLLM({
 *   llm: new ChatAnthropic({}),
 *   retriever: new MemoryVectorStore().asRetriever(),
 *   verbose: true,
 * });
 * const retrievedDocs = await retriever.invoke(
 *   "What are mitochondria made of?",
 * );
 * ```
 */
declare class MultiQueryRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  private retriever;
  private llmChain;
  private queryCount;
  private parserKey;
  documentCompressor: BaseDocumentCompressor | undefined;
  documentCompressorFilteringFn?: MultiQueryRetrieverInput["documentCompressorFilteringFn"];
  constructor(fields: MultiQueryRetrieverInput);
  static fromLLM(fields: Omit<MultiQueryRetrieverInput, "llmChain"> & {
    llm: BaseLanguageModelInterface;
    prompt?: BasePromptTemplate;
  }): MultiQueryRetriever;
  private _generateQueries;
  private _retrieveDocuments;
  private _uniqueUnion;
  _getRelevantDocuments(question: string, runManager?: CallbackManagerForRetrieverRun): Promise<Document[]>;
}
//#endregion
export { MultiDocs, MultiQueryRetriever, MultiQueryRetrieverInput };
//# sourceMappingURL=multi_query.d.ts.map