import { BaseMessage } from "@langchain/core/messages";
import { Runnable, RunnableInterface } from "@langchain/core/runnables";
import { BaseRetrieverInterface } from "@langchain/core/retrievers";
import { Document, DocumentInterface } from "@langchain/core/documents";

//#region src/chains/retrieval.d.ts

/**
 * Parameters for the createRetrievalChain method.
 */
type CreateRetrievalChainParams<RunOutput> = {
  /**
   * Retriever-like object that returns list of documents. Should
   * either be a subclass of BaseRetriever or a Runnable that returns
   * a list of documents. If a subclass of BaseRetriever, then it
   * is expected that an `input` key be passed in - this is what
   * is will be used to pass into the retriever. If this is NOT a
   * subclass of BaseRetriever, then all the inputs will be passed
   * into this runnable, meaning that runnable should take a object
   * as input.
   */
  retriever: BaseRetrieverInterface | RunnableInterface<Record<string, any>, DocumentInterface[]>;
  /**
   * Runnable that takes inputs and produces a string output.
   * The inputs to this will be any original inputs to this chain, a new
   * context key with the retrieved documents, and chat_history (if not present
   * in the inputs) with a value of `[]` (to easily enable conversational
   * retrieval).
   */
  combineDocsChain: RunnableInterface<Record<string, any>, RunOutput>;
};
/**
 * Create a retrieval chain that retrieves documents and then passes them on.
 * @param {CreateRetrievalChainParams} params A params object
 *     containing a retriever and a combineDocsChain.
 * @returns An LCEL Runnable which returns a an object
 *     containing at least `context` and `answer` keys.
 * @example
 * ```typescript
 * // pnpm add langchain @langchain/openai
 *
 * import { ChatOpenAI } from "@langchain/openai";
 * import { pull } from "langchain/hub";
 * import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
 * import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
 *
 * const retrievalQAChatPrompt = await pull("langchain-ai/retrieval-qa-chat");
 * const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
 * const retriever = ...
 * const combineDocsChain = await createStuffDocumentsChain(...);
 * const retrievalChain = await createRetrievalChain({
 *   retriever,
 *   combineDocsChain,
 * });
 * const response = await chain.invoke({ input: "..." });
 * ```
 */
declare function createRetrievalChain<RunOutput>({
  retriever,
  combineDocsChain
}: CreateRetrievalChainParams<RunOutput>): Promise<Runnable<{
  input: string;
  chat_history?: BaseMessage[] | string;
} & {
  [key: string]: unknown;
}, {
  context: Document[];
  answer: RunOutput;
} & {
  [key: string]: unknown;
}>>;
//#endregion
export { CreateRetrievalChainParams, createRetrievalChain };
//# sourceMappingURL=retrieval.d.cts.map