import { BaseChatMemory, BaseChatMemoryInput } from "./chat_memory.cjs";
import { InputValues, MemoryVariables } from "@langchain/core/memory";

//#region src/memory/buffer_memory.d.ts

/**
 * Interface for the input parameters of the `BufferMemory` class.
 */
interface BufferMemoryInput extends BaseChatMemoryInput {
  humanPrefix?: string;
  aiPrefix?: string;
  memoryKey?: string;
}
/**
 * The `BufferMemory` class is a type of memory component used for storing
 * and managing previous chat messages. It is a wrapper around
 * `ChatMessageHistory` that extracts the messages into an input variable.
 * This class is particularly useful in applications like chatbots where
 * it is essential to remember previous interactions. Note: The memory
 * instance represents the history of a single conversation. Therefore, it
 * is not recommended to share the same history or memory instance between
 * two different chains. If you deploy your LangChain app on a serverless
 * environment, do not store memory instances in a variable, as your
 * hosting provider may reset it by the next time the function is called.
 * @example
 * ```typescript
 * // Initialize the memory to store chat history and set up the language model with a specific temperature.
 * const memory = new BufferMemory({ memoryKey: "chat_history" });
 * const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 });
 *
 * // Create a prompt template for a friendly conversation between a human and an AI.
 * const prompt =
 *   PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.
 *
 * Current conversation:
 * {chat_history}
 * Human: {input}
 * AI:`);
 *
 * // Set up the chain with the language model, prompt, and memory.
 * const chain = new LLMChain({ llm: model, prompt, memory });
 *
 * // Example usage of the chain to continue the conversation.
 * // The `call` method sends the input to the model and returns the AI's response.
 * const res = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({ res });
 *
 * ```
 */
declare class BufferMemory extends BaseChatMemory implements BufferMemoryInput {
  humanPrefix: string;
  aiPrefix: string;
  memoryKey: string;
  constructor(fields?: BufferMemoryInput);
  get memoryKeys(): string[];
  /**
   * Loads the memory variables. It takes an `InputValues` object as a
   * parameter and returns a `Promise` that resolves with a
   * `MemoryVariables` object.
   * @param _values `InputValues` object.
   * @returns A `Promise` that resolves with a `MemoryVariables` object.
   */
  loadMemoryVariables(_values: InputValues): Promise<MemoryVariables>;
}
//#endregion
export { BufferMemory, BufferMemoryInput };
//# sourceMappingURL=buffer_memory.d.cts.map