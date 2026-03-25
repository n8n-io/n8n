import { BaseChain, ChainInputs } from "../../../chains/base.cjs";
import { JsonOutputFunctionsParser } from "../../../output_parsers/openai_functions.cjs";
import { MessageChunkResult } from "./types.cjs";
import { BaseMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChainValues } from "@langchain/core/utils/types";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { BaseRetrieverInterface } from "@langchain/core/retrievers";
import { ChatOpenAI } from "@langchain/openai";

//#region src/experimental/chains/violation_of_expectations/violation_of_expectations_chain.d.ts

/**
 * Interface for the input parameters of the ViolationOfExpectationsChain class.
 */
interface ViolationOfExpectationsChainInput extends ChainInputs {
  /**
   * The retriever to use for retrieving stored
   * thoughts and insights.
   */
  retriever: BaseRetrieverInterface;
  /**
   * The LLM to use
   */
  llm: ChatOpenAI;
}
/**
 * Chain that generates key insights/facts of a user based on a
 * a chat conversation with an AI.
 */
declare class ViolationOfExpectationsChain extends BaseChain implements ViolationOfExpectationsChainInput {
  static lc_name(): string;
  _chainType(): string;
  chatHistoryKey: string;
  thoughtsKey: string;
  get inputKeys(): string[];
  get outputKeys(): string[];
  retriever: BaseRetrieverInterface;
  llm: ChatOpenAI;
  jsonOutputParser: JsonOutputFunctionsParser;
  stringOutputParser: StringOutputParser;
  constructor(fields: ViolationOfExpectationsChainInput);
  getChatHistoryString(chatHistory: BaseMessage[]): string;
  removeDuplicateStrings(strings: Array<string>): Array<string>;
  /**
   * This method breaks down the chat history into chunks of messages.
   * Each chunk consists of a sequence of messages ending with an AI message and the subsequent user response, if any.
   *
   * @param {BaseMessage[]} chatHistory - The chat history to be chunked.
   *
   * @returns {MessageChunkResult[]} An array of message chunks. Each chunk includes a sequence of messages and the subsequent user response.
   *
   * @description
   * The method iterates over the chat history and pushes each message into a temporary array.
   * When it encounters an AI message, it checks for a subsequent user message.
   * If a user message is found, it is considered as the user response to the AI message.
   * If no user message is found after the AI message, the user response is undefined.
   * The method then pushes the chunk (sequence of messages and user response) into the result array.
   * This process continues until all messages in the chat history have been processed.
   */
  chunkMessagesByAIResponse(chatHistory: BaseMessage[]): MessageChunkResult[];
  /**
   * This method processes a chat history to generate insights about the user.
   *
   * @param {ChainValues} values - The input values for the chain. It should contain a key for chat history.
   * @param {CallbackManagerForChainRun} [runManager] - Optional callback manager for the chain run.
   *
   * @returns {Promise<ChainValues>} A promise that resolves to a list of insights about the user.
   *
   * @throws {Error} If the chat history key is not found in the input values or if the chat history is not an array of BaseMessages.
   *
   * @description
   * The method performs the following steps:
   * 1. Checks if the chat history key is present in the input values and if the chat history is an array of BaseMessages.
   * 2. Breaks the chat history into chunks of messages.
   * 3. For each chunk, it generates an initial prediction for the user's next message.
   * 4. For each prediction, it generates insights and prediction violations, and regenerates the prediction based on the violations.
   * 5. For each set of messages, it generates a fact/insight about the user.
   * The method returns a list of these insights.
   */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  private predictNextUserMessage;
  private retrieveRelevantInsights;
  private getPredictionViolations;
  private generateRevisedPrediction;
  private generateFacts;
  /**
   * Static method that creates a ViolationOfExpectationsChain instance from a
   * ChatOpenAI and retriever. It also accepts optional options
   * to customize the chain.
   *
   * @param llm The ChatOpenAI instance.
   * @param retriever The retriever used for similarity search.
   * @param options Optional options to customize the chain.
   *
   * @returns A new instance of ViolationOfExpectationsChain.
   */
  static fromLLM(llm: ChatOpenAI, retriever: BaseRetrieverInterface, options?: Partial<Omit<ViolationOfExpectationsChainInput, "llm" | "retriever">>): ViolationOfExpectationsChain;
}
//#endregion
export { ViolationOfExpectationsChain, ViolationOfExpectationsChainInput };
//# sourceMappingURL=violation_of_expectations_chain.d.cts.map