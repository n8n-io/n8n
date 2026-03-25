import { BaseMessage } from "@langchain/core/messages";
import { BaseChatMessageHistory } from "@langchain/core/chat_history";
import { ZepClient } from "../";
import { Zep } from "../";
/**
 * Interface defining the structure of the input data for the ZepMemory
 * class. It includes properties like humanPrefix, aiPrefix, memoryKey,
 * baseURL, sessionId, and apiKey.
 */
interface ZepMemoryInput {
    sessionId: string;
    client: ZepClient;
    memoryType: Zep.MemoryType;
    humanPrefix?: string;
    aiPrefix?: string;
}
/**
 * Class used to manage the memory of a chat session, including loading
 * and saving the chat history, and clearing the memory when needed. It
 * uses the ZepClient to interact with the Zep service for managing the
 * chat session's memory.
 *
 */
export declare class ZepChatMessageHistory extends BaseChatMessageHistory implements ZepMemoryInput {
    lc_namespace: string[];
    sessionId: string;
    client: ZepClient;
    memoryType: Zep.MemoryType;
    humanPrefix: string;
    aiPrefix: string;
    constructor(fields: ZepMemoryInput);
    private getMemory;
    getMessages(): Promise<BaseMessage[]>;
    addAIChatMessage(message: string, metadata?: any): Promise<void>;
    addMessage(message: BaseMessage, metadata?: any): Promise<void>;
    addUserMessage(message: string, metadata?: any): Promise<void>;
    clear(): Promise<void>;
}
export {};
