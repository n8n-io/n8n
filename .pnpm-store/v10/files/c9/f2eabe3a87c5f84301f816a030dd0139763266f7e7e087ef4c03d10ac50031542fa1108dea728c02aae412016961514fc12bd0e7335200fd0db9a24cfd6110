import { BaseMessage } from "@langchain/core/messages";
import { Runnable, RunnableInterface } from "@langchain/core/runnables";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { LanguageModelLike } from "@langchain/core/language_models/base";
import { DocumentInterface } from "@langchain/core/documents";

//#region src/chains/history_aware_retriever.d.ts

/**
 * Params for the createHistoryAwareRetriever method.
 */
type CreateHistoryAwareRetrieverParams = {
  /**
   * Language model to use for generating a search term given chat history.
   */
  llm: LanguageModelLike;
  /**
   * RetrieverLike object that takes a string as input and outputs a list of Documents.
   */
  retriever: RunnableInterface<string, DocumentInterface[]>;
  /**
   * The prompt used to generate the search query for the retriever.
   */
  rephrasePrompt: BasePromptTemplate;
};
/**
 * Create a chain that takes conversation history and returns documents.
 * If there is no `chat_history`, then the `input` is just passed directly to the
 * retriever. If there is `chat_history`, then the prompt and LLM will be used
 * to generate a search query. That search query is then passed to the retriever.
 * @param {CreateHistoryAwareRetriever} params
 * @returns An LCEL Runnable. The runnable input must take in `input`, and if there
 * is chat history should take it in the form of `chat_history`.
 * The Runnable output is a list of Documents
 * @example
 * ```typescript
 * // pnpm add langchain @langchain/openai
 *
 * import { ChatOpenAI } from "@langchain/openai";
 * import { pull } from "langchain/hub";
 * import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever";
 *
 * const rephrasePrompt = await pull("langchain-ai/chat-langchain-rephrase");
 * const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
 * const retriever = ...
 * const chain = await createHistoryAwareRetriever({
 *   llm,
 *   retriever,
 *   rephrasePrompt,
 * });
 * const result = await chain.invoke({"input": "...", "chat_history": [] })
 * ```
 */
declare function createHistoryAwareRetriever({
  llm,
  retriever,
  rephrasePrompt
}: CreateHistoryAwareRetrieverParams): Promise<Runnable<{
  input: string;
  chat_history: string | BaseMessage[];
}, DocumentInterface[]>>;
//#endregion
export { CreateHistoryAwareRetrieverParams, createHistoryAwareRetriever };
//# sourceMappingURL=history_aware_retriever.d.cts.map