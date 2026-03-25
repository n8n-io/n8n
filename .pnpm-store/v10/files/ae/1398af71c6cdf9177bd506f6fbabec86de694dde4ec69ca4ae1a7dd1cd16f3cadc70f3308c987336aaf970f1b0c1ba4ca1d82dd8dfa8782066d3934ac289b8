import { LLMChain } from "../../chains/llm_chain.cjs";
import { BaseDocumentCompressor } from "./index.cjs";
import { PromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { DocumentInterface } from "@langchain/core/documents";

//#region src/retrievers/document_compressors/chain_extract.d.ts

/**
 * Interface for the arguments required to create an instance of
 * LLMChainExtractor.
 */
interface LLMChainExtractorArgs {
  llmChain: LLMChain;
  getInput: (query: string, doc: DocumentInterface) => Record<string, unknown>;
}
/**
 * A class that uses an LLM chain to extract relevant parts of documents.
 * It extends the BaseDocumentCompressor class.
 */
declare class LLMChainExtractor extends BaseDocumentCompressor {
  llmChain: LLMChain;
  getInput: (query: string, doc: DocumentInterface) => Record<string, unknown>;
  constructor({
    llmChain,
    getInput
  }: LLMChainExtractorArgs);
  /**
   * Compresses a list of documents based on the output of an LLM chain.
   * @param documents The list of documents to be compressed.
   * @param query The query to be used for document compression.
   * @returns A list of compressed documents.
   */
  compressDocuments(documents: DocumentInterface[], query: string): Promise<DocumentInterface[]>;
  /**
   * Creates a new instance of LLMChainExtractor from a given LLM, prompt
   * template, and getInput function.
   * @param llm The BaseLanguageModel instance used for document extraction.
   * @param prompt The PromptTemplate instance used for document extraction.
   * @param getInput A function used for constructing the chain input from the query and a Document.
   * @returns A new instance of LLMChainExtractor.
   */
  static fromLLM(llm: BaseLanguageModelInterface, prompt?: PromptTemplate, getInput?: (query: string, doc: DocumentInterface) => Record<string, unknown>): LLMChainExtractor;
}
//#endregion
export { LLMChainExtractor, LLMChainExtractorArgs };
//# sourceMappingURL=chain_extract.d.cts.map