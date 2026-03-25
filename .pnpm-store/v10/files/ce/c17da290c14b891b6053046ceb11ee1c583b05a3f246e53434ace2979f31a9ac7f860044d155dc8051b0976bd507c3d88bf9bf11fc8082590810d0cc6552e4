import { chat_memory_d_exports } from "./chat_memory.js";
import * as _langchain_core_messages9 from "@langchain/core/messages";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { InputValues, MemoryVariables, OutputValues } from "@langchain/core/memory";
import { Zep, ZepClient } from "@getzep/zep-cloud";
import { Memory } from "@getzep/zep-cloud/api";

//#region src/memory/zep_cloud.d.ts
declare const zepMemoryContextToSystemPrompt: (memory: Memory) => string;
declare const condenseZepMemoryIntoHumanMessage: (memory: Memory) => HumanMessage<_langchain_core_messages9.MessageStructure<_langchain_core_messages9.MessageToolSet>>;
declare const zepMemoryToMessages: (memory: Memory) => BaseMessage<_langchain_core_messages9.MessageStructure<_langchain_core_messages9.MessageToolSet>, _langchain_core_messages9.MessageType>[];
/**
 * Interface defining the structure of the input data for the ZepMemory
 * class. It includes properties like humanPrefix, aiPrefix, memoryKey, memoryType
 * sessionId, and apiKey.
 */
interface ZepCloudMemoryInput extends chat_memory_d_exports.BaseChatMemoryInput {
  humanPrefix?: string;
  aiPrefix?: string;
  memoryKey?: string;
  sessionId: string;
  apiKey: string;
  memoryType?: Zep.MemoryType;
  separateMessages?: boolean;
}
/**
 * Class used to manage the memory of a chat session, including loading
 * and saving the chat history, and clearing the memory when needed. It
 * uses the ZepClient to interact with the Zep service for managing the
 * chat session's memory.
 * @example
 * ```typescript
 * const sessionId = randomUUID();
 *
 * // Initialize ZepCloudMemory with session ID and API key
 * const memory = new ZepCloudMemory({
 *   sessionId,
 *   apiKey: "<zep api key>",
 * });
 *
 * // Create a ChatOpenAI model instance with specific parameters
 * const model = new ChatOpenAI({
 *   model: "gpt-3.5-turbo",
 *   temperature: 0,
 * });
 *
 * // Create a ConversationChain with the model and memory
 * const chain = new ConversationChain({ llm: model, memory });
 *
 * // Example of calling the chain with an input
 * const res1 = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({ res1 });
 *
 * // Follow-up call to the chain to demonstrate memory usage
 * const res2 = await chain.call({ input: "What did I just say my name was?" });
 * console.log({ res2 });
 *
 * // Output the session ID and the current state of memory
 * console.log("Session ID: ", sessionId);
 * console.log("Memory: ", await memory.loadMemoryVariables({}));
 *
 * ```
 */
declare class ZepCloudMemory extends chat_memory_d_exports.BaseChatMemory implements ZepCloudMemoryInput {
  humanPrefix: string;
  aiPrefix: string;
  memoryKey: string;
  apiKey: string;
  sessionId: string;
  zepClient: ZepClient;
  memoryType: Zep.MemoryType;
  separateMessages: boolean;
  constructor(fields: ZepCloudMemoryInput);
  get memoryKeys(): string[];
  /**
   * Method that retrieves the chat history from the Zep service and formats
   * it into a list of messages.
   * @param values Input values for the method.
   * @returns Promise that resolves with the chat history formatted into a list of messages.
   */
  loadMemoryVariables(values: InputValues): Promise<MemoryVariables>;
  /**
   * Method that saves the input and output messages to the Zep service.
   * @param inputValues Input messages to be saved.
   * @param outputValues Output messages to be saved.
   * @returns Promise that resolves when the messages have been saved.
   */
  saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void>;
  /**
   * Method that deletes the chat history from the Zep service.
   * @returns Promise that resolves when the chat history has been deleted.
   */
  clear(): Promise<void>;
}
//#endregion
export { ZepCloudMemory, ZepCloudMemoryInput, condenseZepMemoryIntoHumanMessage, zepMemoryContextToSystemPrompt, zepMemoryToMessages };
//# sourceMappingURL=zep_cloud.d.ts.map