import { BaseChatMemory, BaseChatMemoryInput } from "./chat_memory.cjs";
import { BaseMessage } from "@langchain/core/messages";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { InputValues, MemoryVariables, OutputValues } from "@langchain/core/memory";

//#region src/memory/summary.d.ts

/**
 * Interface for the input parameters of the ConversationSummaryMemory
 * class.
 */
interface ConversationSummaryMemoryInput extends BaseConversationSummaryMemoryInput {}
/**
 * Interface for the input parameters of the BaseConversationSummaryMemory
 * class.
 */
interface BaseConversationSummaryMemoryInput extends BaseChatMemoryInput {
  llm: BaseLanguageModelInterface;
  memoryKey?: string;
  humanPrefix?: string;
  aiPrefix?: string;
  prompt?: BasePromptTemplate;
  summaryChatMessageClass?: new (content: string) => BaseMessage;
}
/**
 * Abstract class that provides a structure for storing and managing the
 * memory of a conversation. It includes methods for predicting a new
 * summary for the conversation given the existing messages and summary.
 */
declare abstract class BaseConversationSummaryMemory extends BaseChatMemory {
  memoryKey: string;
  humanPrefix: string;
  aiPrefix: string;
  llm: BaseLanguageModelInterface;
  prompt: BasePromptTemplate;
  summaryChatMessageClass: new (content: string) => BaseMessage;
  constructor(fields: BaseConversationSummaryMemoryInput);
  /**
   * Predicts a new summary for the conversation given the existing messages
   * and summary.
   * @param messages Existing messages in the conversation.
   * @param existingSummary Current summary of the conversation.
   * @returns A promise that resolves to a new summary string.
   */
  predictNewSummary(messages: BaseMessage[], existingSummary: string): Promise<string>;
}
/**
 * Class that provides a concrete implementation of the conversation
 * memory. It includes methods for loading memory variables, saving
 * context, and clearing the memory.
 * @example
 * ```typescript
 * const memory = new ConversationSummaryMemory({
 *   memoryKey: "chat_history",
 *   llm: new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 }),
 * });
 *
 * const model = new ChatOpenAI({ model: "gpt-4o-mini" });
 * const prompt =
 *   PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.
 *
 * Current conversation:
 * {chat_history}
 * Human: {input}
 * AI:`);
 * const chain = new LLMChain({ llm: model, prompt, memory });
 *
 * const res1 = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({ res1, memory: await memory.loadMemoryVariables({}) });
 *
 * const res2 = await chain.call({ input: "What's my name?" });
 * console.log({ res2, memory: await memory.loadMemoryVariables({}) });
 *
 * ```
 */
declare class ConversationSummaryMemory extends BaseConversationSummaryMemory {
  buffer: string;
  constructor(fields: ConversationSummaryMemoryInput);
  get memoryKeys(): string[];
  /**
   * Loads the memory variables for the conversation memory.
   * @returns A promise that resolves to an object containing the memory variables.
   */
  loadMemoryVariables(_: InputValues): Promise<MemoryVariables>;
  /**
   * Saves the context of the conversation memory.
   * @param inputValues Input values for the conversation.
   * @param outputValues Output values from the conversation.
   * @returns A promise that resolves when the context has been saved.
   */
  saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void>;
  /**
   * Clears the conversation memory.
   * @returns A promise that resolves when the memory has been cleared.
   */
  clear(): Promise<void>;
}
//#endregion
export { BaseConversationSummaryMemory, BaseConversationSummaryMemoryInput, ConversationSummaryMemory, ConversationSummaryMemoryInput };
//# sourceMappingURL=summary.d.cts.map