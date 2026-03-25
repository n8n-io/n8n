import { InputValues, MemoryVariables, OutputValues } from "@langchain/core/memory";
import { BaseChatMemory, BaseChatMemoryInput } from "langchain/memory";
import { ZepClient } from "../";
export interface ZepMemoryInput extends BaseChatMemoryInput {
    humanPrefix?: string;
    aiPrefix?: string;
    memoryKey?: string;
    baseURL?: string;
    sessionId: string;
    apiKey: string;
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
 * // Initialize ZepMemory with session ID, base URL, and API key
 * const memory = new ZepMemory({
 *   sessionId,
 *   apiKey: "change_this_key",
 * });
 *
 * // Create a ChatOpenAI model instance with specific parameters
 * const model = new ChatOpenAI({
 *   modelName: "gpt-3.5-turbo",
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
export declare class ZepMemory extends BaseChatMemory implements ZepMemoryInput {
    humanPrefix: string;
    aiPrefix: string;
    memoryKey: string;
    apiKey: string;
    sessionId: string;
    zepClient: ZepClient;
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
