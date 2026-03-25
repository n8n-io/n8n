/**
 * Represents a session object with a unique identifier, metadata, and other attributes.
 */
export class Session {
    /**
     * Constructs a new Session instance.
     * @param {ISession} data - The data to create a Session instance.
     */
    constructor(data) {
        this.uuid = data.uuid;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.deleted_at = data.deleted_at;
        this.session_id = data.session_id;
        this.metadata = data.metadata;
        this.user_id = data.user_id;
    }
    /**
     * Converts the Session instance to a dictionary.
     * @returns {ISession} A dictionary representation of Session instance.
     */
    toDict() {
        return {
            uuid: this.uuid,
            created_at: this.created_at,
            updated_at: this.updated_at,
            deleted_at: this.deleted_at,
            session_id: this.session_id,
            metadata: this.metadata,
            user_id: this.user_id,
        };
    }
}
/**
 * Represents a message in the memory.
 */
export class Message {
    /**
     * Constructs a new Message instance.
     * @param {IMessage} data - The data to create a message instance.
     */
    constructor(data) {
        this.uuid = data.uuid;
        this.created_at = data.created_at;
        this.role = data.role;
        this.content = data.content;
        this.token_count = data.token_count;
        this.metadata = data.metadata;
    }
    /**
     * Converts the Message instance to a dictionary.
     * @returns {IMessage} A dictionary representation of Message instance.
     */
    toDict() {
        return {
            uuid: this.uuid,
            created_at: this.created_at,
            role: this.role,
            content: this.content,
            token_count: this.token_count,
            metadata: this.metadata,
        };
    }
}
/**
 * Represents a summary of a memory.
 */
export class Summary {
    /**
     * Constructs a new Summary instance.
     * @param {ISummary} data - The data to create a summary instance.
     */
    constructor(data) {
        this.uuid = data.uuid;
        this.created_at = data.created_at;
        this.content = data.content;
        this.metadata = data.metadata;
        this.recent_message_uuid = data.recent_message_uuid;
        this.token_count = data.token_count;
    }
    /**
     * Converts the Summary instance to a dictionary.
     * @returns {ISummary} A dictionary representation of Summary instance.
     */
    toDict() {
        return {
            uuid: this.uuid,
            created_at: this.created_at,
            content: this.content,
            metadata: this.metadata,
            recent_message_uuid: this.recent_message_uuid,
            token_count: this.token_count,
        };
    }
}
/**
 * Represents a memory containing messages, metadata, and a summary.
 */
export class Memory {
    /**
     * Constructs a new Memory instance.
     * @param {IMemory} data - The data to create a memory instance.
     */
    constructor(data = {}) {
        this.messages = (data.messages || []).map((messageData) => new Message(messageData));
        this.metadata = data.metadata || {};
        this.summary = data.summary ? new Summary(data.summary) : undefined;
        this.uuid = data.uuid;
        this.created_at = data.created_at;
        this.token_count = data.token_count;
    }
    /**
     * Converts the Memory instance to a dictionary.
     * @returns {IMemory} A dictionary representation of the Memory instance.
     */
    toDict() {
        var _a;
        return {
            messages: this.messages.map((message) => message.toDict()),
            metadata: this.metadata,
            summary: (_a = this.summary) === null || _a === void 0 ? void 0 : _a.toDict(),
            uuid: this.uuid,
            created_at: this.created_at,
            token_count: this.token_count,
        };
    }
}
/**
 * Represents the payload for a memory search.
 *
 * @property {string} text - The text to search for.
 * @property {Record<string, any>} metadata - The metadata to filter the search by.
 * @property {string} search_type - The type of search to perform. Either "similarity" or "mmr".
 * @property {number} mmr_lambda - The lambda value to use for MMR reranking.
 */
export class MemorySearchPayload {
    /**
     * Constructs a new SearchPayload instance.
     * @param {IMemorySearchPayload} data - The data to create a Search Payload.
     */
    constructor(data) {
        this.metadata = data.metadata;
        this.text = data.text;
        this.search_scope = data.search_scope || "messages";
        this.search_type = data.search_type || "similarity";
        this.mmr_lambda = data.mmr_lambda || 0.5;
    }
}
/**
 * Represents a search result from a memory search.
 */
export class MemorySearchResult {
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
    constructor(data = {}) {
        this.message = data.message ? new Message(data.message) : undefined;
        this.summary = data.summary ? new Summary(data.summary) : undefined;
        this.metadata = data.metadata || {};
        this.dist = data.dist;
    }
}
