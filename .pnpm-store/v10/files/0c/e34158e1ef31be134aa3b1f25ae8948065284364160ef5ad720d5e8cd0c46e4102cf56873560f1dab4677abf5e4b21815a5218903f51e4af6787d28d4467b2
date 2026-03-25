import { EventStream } from "../lib/event-streams.js";
import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
export declare class Conversations extends ClientSDK {
    /**
     * Create a conversation and append entries to it.
     *
     * @remarks
     * Create a new conversation, using a base model or an agent and append entries. Completion and tool executions are run and the response is appended to the conversation.Use the returned conversation_id to continue the conversation.
     */
    start(request: components.ConversationRequest, options?: RequestOptions): Promise<components.ConversationResponse>;
    /**
     * List all created conversations.
     *
     * @remarks
     * Retrieve a list of conversation entities sorted by creation time.
     */
    list(request?: operations.AgentsApiV1ConversationsListRequest | undefined, options?: RequestOptions): Promise<Array<operations.ResponseBody>>;
    /**
     * Retrieve a conversation information.
     *
     * @remarks
     * Given a conversation_id retrieve a conversation entity with its attributes.
     */
    get(request: operations.AgentsApiV1ConversationsGetRequest, options?: RequestOptions): Promise<operations.AgentsApiV1ConversationsGetResponseV1ConversationsGet>;
    /**
     * Append new entries to an existing conversation.
     *
     * @remarks
     * Run completion on the history of the conversation and the user entries. Return the new created entries.
     */
    append(request: operations.AgentsApiV1ConversationsAppendRequest, options?: RequestOptions): Promise<components.ConversationResponse>;
    /**
     * Retrieve all entries in a conversation.
     *
     * @remarks
     * Given a conversation_id retrieve all the entries belonging to that conversation. The entries are sorted in the order they were appended, those can be messages, connectors or function_call.
     */
    getHistory(request: operations.AgentsApiV1ConversationsHistoryRequest, options?: RequestOptions): Promise<components.ConversationHistory>;
    /**
     * Retrieve all messages in a conversation.
     *
     * @remarks
     * Given a conversation_id retrieve all the messages belonging to that conversation. This is similar to retrieving all entries except we filter the messages only.
     */
    getMessages(request: operations.AgentsApiV1ConversationsMessagesRequest, options?: RequestOptions): Promise<components.ConversationMessages>;
    /**
     * Restart a conversation starting from a given entry.
     *
     * @remarks
     * Given a conversation_id and an id, recreate a conversation from this point and run completion. A new conversation is returned with the new entries returned.
     */
    restart(request: operations.AgentsApiV1ConversationsRestartRequest, options?: RequestOptions): Promise<components.ConversationResponse>;
    /**
     * Create a conversation and append entries to it.
     *
     * @remarks
     * Create a new conversation, using a base model or an agent and append entries. Completion and tool executions are run and the response is appended to the conversation.Use the returned conversation_id to continue the conversation.
     */
    startStream(request: components.ConversationStreamRequest, options?: RequestOptions): Promise<EventStream<components.ConversationEvents>>;
    /**
     * Append new entries to an existing conversation.
     *
     * @remarks
     * Run completion on the history of the conversation and the user entries. Return the new created entries.
     */
    appendStream(request: operations.AgentsApiV1ConversationsAppendStreamRequest, options?: RequestOptions): Promise<EventStream<components.ConversationEvents>>;
    /**
     * Restart a conversation starting from a given entry.
     *
     * @remarks
     * Given a conversation_id and an id, recreate a conversation from this point and run completion. A new conversation is returned with the new entries returned.
     */
    restartStream(request: operations.AgentsApiV1ConversationsRestartStreamRequest, options?: RequestOptions): Promise<EventStream<components.ConversationEvents>>;
}
//# sourceMappingURL=conversations.d.ts.map