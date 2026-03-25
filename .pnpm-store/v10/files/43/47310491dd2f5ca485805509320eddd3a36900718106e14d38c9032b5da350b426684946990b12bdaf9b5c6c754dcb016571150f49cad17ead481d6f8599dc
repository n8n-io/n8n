import { SerializedChatVectorDBQAChain } from "./serde.cjs";
import { BaseChain, ChainInputs } from "./base.cjs";
import { LLMChain } from "./llm_chain.cjs";
import { QAChainParams } from "./question_answering/load.cjs";
import { BaseMessage } from "@langchain/core/messages";
import { ChainValues } from "@langchain/core/utils/types";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { BaseRetrieverInterface } from "@langchain/core/retrievers";

//#region src/chains/conversational_retrieval_chain.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoadValues = Record<string, any>;
/**
 * Interface for the input parameters of the
 * ConversationalRetrievalQAChain class.
 */
interface ConversationalRetrievalQAChainInput extends ChainInputs {
  retriever: BaseRetrieverInterface;
  combineDocumentsChain: BaseChain;
  questionGeneratorChain: LLMChain;
  returnSourceDocuments?: boolean;
  returnGeneratedQuestion?: boolean;
  inputKey?: string;
}
/**
 * Class for conducting conversational question-answering tasks with a
 * retrieval component. Extends the BaseChain class and implements the
 * ConversationalRetrievalQAChainInput interface.
 * @example
 * ```typescript
 * import { ChatAnthropic } from "@langchain/anthropic";
 * import {
 *   ChatPromptTemplate,
 *   MessagesPlaceholder,
 * } from "@langchain/core/prompts";
 * import { BaseMessage } from "@langchain/core/messages";
 * import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
 * import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever";
 * import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
 *
 * const retriever = ...your retriever;
 * const llm = new ChatAnthropic();
 *
 * // Contextualize question
 * const contextualizeQSystemPrompt = `
 * Given a chat history and the latest user question
 * which might reference context in the chat history,
 * formulate a standalone question which can be understood
 * without the chat history. Do NOT answer the question, just
 * reformulate it if needed and otherwise return it as is.`;
 * const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
 *   ["system", contextualizeQSystemPrompt],
 *   new MessagesPlaceholder("chat_history"),
 *   ["human", "{input}"],
 * ]);
 * const historyAwareRetriever = await createHistoryAwareRetriever({
 *   llm,
 *   retriever,
 *   rephrasePrompt: contextualizeQPrompt,
 * });
 *
 * // Answer question
 * const qaSystemPrompt = `
 * You are an assistant for question-answering tasks. Use
 * the following pieces of retrieved context to answer the
 * question. If you don't know the answer, just say that you
 * don't know. Use three sentences maximum and keep the answer
 * concise.
 * \n\n
 * {context}`;
 * const qaPrompt = ChatPromptTemplate.fromMessages([
 *   ["system", qaSystemPrompt],
 *   new MessagesPlaceholder("chat_history"),
 *   ["human", "{input}"],
 * ]);
 *
 * // Below we use createStuffDocuments_chain to feed all retrieved context
 * // into the LLM. Note that we can also use StuffDocumentsChain and other
 * // instances of BaseCombineDocumentsChain.
 * const questionAnswerChain = await createStuffDocumentsChain({
 *   llm,
 *   prompt: qaPrompt,
 * });
 *
 * const ragChain = await createRetrievalChain({
 *   retriever: historyAwareRetriever,
 *   combineDocsChain: questionAnswerChain,
 * });
 *
 * // Usage:
 * const chat_history: BaseMessage[] = [];
 * const response = await ragChain.invoke({
 *   chat_history,
 *   input: "...",
 * });
 * ```
 */
declare class ConversationalRetrievalQAChain extends BaseChain implements ConversationalRetrievalQAChainInput {
  static lc_name(): string;
  inputKey: string;
  chatHistoryKey: string;
  get inputKeys(): string[];
  get outputKeys(): string[];
  retriever: BaseRetrieverInterface;
  combineDocumentsChain: BaseChain;
  questionGeneratorChain: LLMChain;
  returnSourceDocuments: boolean;
  returnGeneratedQuestion: boolean;
  constructor(fields: ConversationalRetrievalQAChainInput);
  /**
   * Static method to convert the chat history input into a formatted
   * string.
   * @param chatHistory Chat history input which can be a string, an array of BaseMessage instances, or an array of string arrays.
   * @returns A formatted string representing the chat history.
   */
  static getChatHistoryString(chatHistory: string | BaseMessage[] | string[][]): string;
  /** @ignore */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): string;
  static deserialize(_data: SerializedChatVectorDBQAChain, _values: LoadValues): Promise<ConversationalRetrievalQAChain>;
  serialize(): SerializedChatVectorDBQAChain;
  /**
   * Static method to create a new ConversationalRetrievalQAChain from a
   * BaseLanguageModel and a BaseRetriever.
   * @param llm {@link BaseLanguageModelInterface} instance used to generate a new question.
   * @param retriever {@link BaseRetrieverInterface} instance used to retrieve relevant documents.
   * @param options.returnSourceDocuments Whether to return source documents in the final output
   * @param options.questionGeneratorChainOptions Options to initialize the standalone question generation chain used as the first internal step
   * @param options.qaChainOptions {@link QAChainParams} used to initialize the QA chain used as the second internal step
   * @returns A new instance of ConversationalRetrievalQAChain.
   */
  static fromLLM(llm: BaseLanguageModelInterface, retriever: BaseRetrieverInterface, options?: {
    outputKey?: string; // not used
    returnSourceDocuments?: boolean;
    /** @deprecated Pass in questionGeneratorChainOptions.template instead */
    questionGeneratorTemplate?: string;
    /** @deprecated Pass in qaChainOptions.prompt instead */
    qaTemplate?: string;
    questionGeneratorChainOptions?: {
      llm?: BaseLanguageModelInterface;
      template?: string;
    };
    qaChainOptions?: QAChainParams;
  } & Omit<ConversationalRetrievalQAChainInput, "retriever" | "combineDocumentsChain" | "questionGeneratorChain">): ConversationalRetrievalQAChain;
}
//#endregion
export { ConversationalRetrievalQAChain, ConversationalRetrievalQAChainInput };
//# sourceMappingURL=conversational_retrieval_chain.d.cts.map