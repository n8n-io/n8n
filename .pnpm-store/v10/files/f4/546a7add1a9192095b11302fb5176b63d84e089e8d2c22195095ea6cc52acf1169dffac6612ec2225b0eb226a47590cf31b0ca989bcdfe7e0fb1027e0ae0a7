/**
 * Interface for Session data.
 */
export interface ISession {
    uuid?: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
    session_id: string;
    metadata: Record<string, any>;
    user_id?: string;
}
/**
 * Represents a session object with a unique identifier, metadata, and other attributes.
 */
export declare class Session {
    uuid?: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
    session_id: string;
    metadata: Record<string, any>;
    user_id?: string;
    /**
     * Constructs a new Session instance.
     * @param {ISession} data - The data to create a Session instance.
     */
    constructor(data: ISession);
    /**
     * Converts the Session instance to a dictionary.
     * @returns {ISession} A dictionary representation of Session instance.
     */
    toDict(): ISession;
}
/**
 * IMessage interface for providing input to create a Message instance.
 */
export interface IMessage {
    uuid?: string;
    created_at?: string;
    role: string;
    content: string;
    token_count?: number;
    metadata?: Record<string, any>;
}
/**
 * Represents a message in the memory.
 */
export declare class Message {
    uuid?: string;
    created_at?: string;
    role: string;
    content: string;
    token_count?: number;
    metadata?: Record<string, any>;
    /**
     * Constructs a new Message instance.
     * @param {IMessage} data - The data to create a message instance.
     */
    constructor(data: IMessage);
    /**
     * Converts the Message instance to a dictionary.
     * @returns {IMessage} A dictionary representation of Message instance.
     */
    toDict(): IMessage;
}
/**
 * ISummary interface for providing input to create a Summary instance.
 */
export interface ISummary {
    uuid: string;
    created_at: string;
    content: string;
    metadata?: Record<string, any>;
    recent_message_uuid: string;
    token_count: number;
}
/**
 * Represents a summary of a memory.
 */
export declare class Summary {
    uuid: string;
    created_at: string;
    content: string;
    metadata?: Record<string, any>;
    recent_message_uuid: string;
    token_count: number;
    /**
     * Constructs a new Summary instance.
     * @param {ISummary} data - The data to create a summary instance.
     */
    constructor(data: ISummary);
    /**
     * Converts the Summary instance to a dictionary.
     * @returns {ISummary} A dictionary representation of Summary instance.
     */
    toDict(): ISummary;
}
/**
 * IMemory interface for providing input to create a Memory instance.
 */
export interface IMemory {
    messages?: IMessage[];
    metadata?: Record<string, any>;
    summary?: ISummary;
    uuid?: string;
    created_at?: string;
    token_count?: number;
}
/**
 * Represents a memory containing messages, metadata, and a summary.
 */
export declare class Memory {
    messages: Message[];
    metadata: Record<string, any>;
    summary?: Summary;
    uuid?: string;
    created_at?: string;
    token_count?: number;
    /**
     * Constructs a new Memory instance.
     * @param {IMemory} data - The data to create a memory instance.
     */
    constructor(data?: IMemory);
    /**
     * Converts the Memory instance to a dictionary.
     * @returns {IMemory} A dictionary representation of the Memory instance.
     */
    toDict(): IMemory;
}
/**
 * SearchPayloadData interface for providing input to create SearchPayload.
 */
export interface IMemorySearchPayload {
    text?: string;
    metadata?: Record<string, any>;
    search_scope?: "messages" | "summary";
    search_type?: "similarity" | "mmr";
    mmr_lambda?: number;
}
/**
 * Represents the payload for a memory search.
 *
 * @property {string} text - The text to search for.
 * @property {Record<string, any>} metadata - The metadata to filter the search by.
 * @property {string} search_type - The type of search to perform. Either "similarity" or "mmr".
 * @property {number} mmr_lambda - The lambda value to use for MMR reranking.
 */
export declare class MemorySearchPayload {
    metadata?: Record<string, any>;
    text?: string;
    search_scope?: "messages" | "summary";
    search_type?: "similarity" | "mmr";
    mmr_lambda?: number;
    /**
     * Constructs a new SearchPayload instance.
     * @param {IMemorySearchPayload} data - The data to create a Search Payload.
     */
    constructor(data: IMemorySearchPayload);
}
/**
 * SearchResultData interface for providing input to create a SearchResult.
 */
export interface IMemorySearchResult {
    message?: IMessage;
    summary?: Summary;
    metadata?: Record<string, any>;
    dist?: number;
}
/**
 * Represents a search result from a memory search.
 */
export declare class MemorySearchResult {
    message?: Message;
    summary?: Summary;
    metadata: Record<string, any>;
    dist?: number;
    /**
     * Constructs a new SearchResult instance.
     * @param {IMemorySearchResult} data - The data to create a search result instance.
     *
     * @property {Message} message - The message that was found.
     * @property {Summary} summary - The summary that was found.
     * @property {Record<string, any>} metadata - The metadata of the result, if any.
     * @property {string} summary - The summary of the message.
     * @property {number} dist - The cosine distance of the message from the query.
     */
    constructor(data?: IMemorySearchResult);
}
