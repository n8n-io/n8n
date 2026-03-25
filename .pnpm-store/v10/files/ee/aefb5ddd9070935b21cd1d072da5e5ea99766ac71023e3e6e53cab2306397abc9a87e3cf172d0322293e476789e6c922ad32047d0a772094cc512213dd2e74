import { BaseMemory, InputValues, OutputValues } from "@langchain/core/memory";
import { BaseChatMessageHistory } from "@langchain/core/chat_history";

//#region src/memory/chat_memory.d.ts

/**
 * Interface for the input parameters of the BaseChatMemory class.
 */
interface BaseChatMemoryInput {
  chatHistory?: BaseChatMessageHistory;
  returnMessages?: boolean;
  inputKey?: string;
  outputKey?: string;
}
/**
 * Abstract class that provides a base for implementing different types of
 * memory systems. It is designed to maintain the state of an application,
 * specifically the history of a conversation. This class is typically
 * extended by other classes to create specific types of memory systems.
 */
declare abstract class BaseChatMemory extends BaseMemory {
  chatHistory: BaseChatMessageHistory;
  returnMessages: boolean;
  inputKey?: string;
  outputKey?: string;
  constructor(fields?: BaseChatMemoryInput);
  /**
   * Method to add user and AI messages to the chat history in sequence.
   * @param inputValues The input values from the user.
   * @param outputValues The output values from the AI.
   * @returns Promise that resolves when the context has been saved.
   */
  saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void>;
  /**
   * Method to clear the chat history.
   * @returns Promise that resolves when the chat history has been cleared.
   */
  clear(): Promise<void>;
}
//#endregion
export { BaseChatMemory, BaseChatMemoryInput };
//# sourceMappingURL=chat_memory.d.cts.map