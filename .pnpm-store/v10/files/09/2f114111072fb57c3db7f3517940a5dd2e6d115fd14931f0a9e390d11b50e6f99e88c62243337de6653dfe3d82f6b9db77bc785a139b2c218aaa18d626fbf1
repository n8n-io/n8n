import { chat_memory_d_exports } from "./chat_memory.cjs";
import * as _langchain_core_messages4 from "@langchain/core/messages";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { InputValues, MemoryVariables, OutputValues } from "@langchain/core/memory";
import { ZepClient } from "@getzep/zep-js";

//#region src/memory/zep.d.ts
interface ZepMemoryData {
  messages: Array<{
    role: string;
    content: string;
  }>;
  summary?: {
    content?: string;
  };
}
/**
 * Extracts summary from Zep memory and composes a system prompt.
 * @param memory - The memory object containing potential summary.
 * @returns A string containing the summary as a system prompt.
 */
declare const zepMemoryContextToSystemPrompt: (memory: ZepMemoryData) => string;
/**
 * Condenses Zep memory context into a single HumanMessage.
 * This is particularly useful for models like Claude that have limitations with system messages
 * (e.g., Anthropic's Claude only supports one system message and doesn't support multiple user messages in a row).
 *
 * @param memory - The memory object containing conversation history.
 * @param humanPrefix - The prefix to use for human messages (default: "Human").
 * @param aiPrefix - The prefix to use for AI messages (default: "AI").
 * @returns A HumanMessage containing the condensed memory context.
 */
declare const condenseZepMemoryIntoHumanMessage: (memory: ZepMemoryData) => HumanMessage<_langchain_core_messages4.MessageStructure<_langchain_core_messages4.MessageToolSet>>;
/**
 * Converts Zep Memory to a list of BaseMessages, preserving the structure.
 * Creates a SystemMessage from summary and facts, and converts the rest of the messages
 * to their corresponding message types.
 *
 * @param memory - The memory object containing conversation history.
 * @param humanPrefix - The prefix to use for human messages (default: "Human").
 * @param aiPrefix - The prefix to use for AI messages (default: "AI").
 * @returns An array of BaseMessage objects representing the conversation history.
 */
declare const zepMemoryToMessages: (memory: ZepMemoryData, humanPrefix?: string, aiPrefix?: string) => BaseMessage<_langchain_core_messages4.MessageStructure<_langchain_core_messages4.MessageToolSet>, _langchain_core_messages4.MessageType>[];
/**
 * Interface defining the structure of the input data for the ZepMemory
 * class. It includes properties like humanPrefix, aiPrefix, memoryKey,
 * baseURL, sessionId, apiKey, and separateMessages.
 */
interface ZepMemoryInput extends chat_memory_d_exports.BaseChatMemoryInput {
  humanPrefix?: string;
  aiPrefix?: string;
  memoryKey?: string;
  baseURL: string;
  sessionId: string;
  apiKey?: string;
  /**
   * Whether to return separate messages for chat history with a SystemMessage containing facts and summary,
   * or return a single HumanMessage with the entire memory context.
   * Defaults to true (preserving message types) for backward compatibility.
   *
   * Keep as true for models that fully support system messages.
   * Set to false for models like Claude that have limitations with system messages.
   */
  separateMessages?: boolean;
}
/**
 * Class used to manage the memory of a chat session, including loading
 * and saving the chat history, and clearing the memory when needed. It
 * uses the ZepClient to interact with the Zep service for managing the
 * chat session's memory.
 *
 * The class provides options for handling different LLM requirements:
 * - Use separateMessages=true (default) for models that fully support system messages
 * - Use separateMessages=false for models like Claude that have limitations with system messages
 *
 * @example
 * ```typescript
 * const sessionId = randomUUID();
 * const zepURL = "http://your-zep-url";
 *
 * // Initialize ZepMemory with session ID, base URL, and API key
 * const memory = new ZepMemory({
 *   sessionId,
 *   baseURL: zepURL,
 *   apiKey: "change_this_key",
 *   // Set to false for models like Claude that have limitations with system messages
 *   // Defaults to true for backward compatibility
 *   separateMessages: false,
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
declare class ZepMemory extends chat_memory_d_exports.BaseChatMemory implements ZepMemoryInput {
  humanPrefix: string;
  aiPrefix: string;
  memoryKey: string;
  baseURL: string;
  sessionId: string;
  zepClientPromise: Promise<ZepClient>;
  private readonly zepInitFailMsg;
  /**
   * Whether to return separate messages for chat history with a SystemMessage containing facts and summary,
   * or return a single HumanMessage with the entire memory context.
   * Defaults to true (preserving message types) for backward compatibility.
   *
   * Keep as true for models that fully support system messages.
   * Set to false for models like Claude that have limitations with system messages.
   */
  separateMessages: boolean;
  constructor(fields: ZepMemoryInput);
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
export { ZepMemory, ZepMemoryInput, condenseZepMemoryIntoHumanMessage, zepMemoryContextToSystemPrompt, zepMemoryToMessages };
//# sourceMappingURL=zep.d.cts.map