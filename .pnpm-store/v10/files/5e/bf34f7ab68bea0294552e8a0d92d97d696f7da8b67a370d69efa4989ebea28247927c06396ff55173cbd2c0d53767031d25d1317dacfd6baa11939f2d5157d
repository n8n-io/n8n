import { BaseChatMemory, BaseChatMemoryInput } from "./chat_memory.cjs";
import { InputValues, MemoryVariables } from "@langchain/core/memory";

//#region src/memory/buffer_window_memory.d.ts

/**
 * Interface for the input parameters of the BufferWindowMemory class.
 */
interface BufferWindowMemoryInput extends BaseChatMemoryInput {
  humanPrefix?: string;
  aiPrefix?: string;
  memoryKey?: string;
  k?: number;
}
/**
 * Class for managing and storing previous chat messages. It extends the
 * BaseChatMemory class and implements the BufferWindowMemoryInput
 * interface. This class is stateful and stores messages in a buffer. When
 * called in a chain, it returns all of the messages it has stored.
 * @example
 * ```typescript
 * const prompt =
 *   PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.
 * Current conversation:
 * {chat_history}
 * Human: {input}
 * AI:`);
 *
 * const chain = new LLMChain({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 }),
 *   prompt,
 *   memory: new BufferWindowMemory({ memoryKey: "chat_history", k: 1 }),
 * });
 *
 * // Example of initiating a conversation with the AI
 * const res1 = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({ res1 });
 *
 * // Example of following up with another question
 * const res2 = await chain.call({ input: "What's my name?" });
 * console.log({ res2 });
 * ```
 */
declare class BufferWindowMemory extends BaseChatMemory implements BufferWindowMemoryInput {
  humanPrefix: string;
  aiPrefix: string;
  memoryKey: string;
  k: number;
  constructor(fields?: BufferWindowMemoryInput);
  get memoryKeys(): string[];
  /**
   * Method to load the memory variables. Retrieves the chat messages from
   * the history, slices the last 'k' messages, and stores them in the
   * memory under the memoryKey. If the returnMessages property is set to
   * true, the method returns the messages as they are. Otherwise, it
   * returns a string representation of the messages.
   * @param _values InputValues object.
   * @returns Promise that resolves to a MemoryVariables object.
   */
  loadMemoryVariables(_values: InputValues): Promise<MemoryVariables>;
}
//#endregion
export { BufferWindowMemory, BufferWindowMemoryInput };
//# sourceMappingURL=buffer_window_memory.d.cts.map