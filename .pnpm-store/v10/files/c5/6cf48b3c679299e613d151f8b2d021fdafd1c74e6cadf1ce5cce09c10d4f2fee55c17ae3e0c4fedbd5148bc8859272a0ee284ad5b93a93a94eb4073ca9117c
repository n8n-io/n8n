import { Redis, RedisOptions } from "ioredis";
import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/ioredis.d.ts

/**
 * Type for the input parameter of the RedisChatMessageHistory
 * constructor. It includes fields for the session ID, session TTL, Redis
 * URL, Redis configuration, and Redis client.
 */
type RedisChatMessageHistoryInput = {
  sessionId: string;
  sessionTTL?: number;
  url?: string;
  config?: RedisOptions;
  client?: Redis;
};
/**
 * Class used to store chat message history in Redis. It provides methods
 * to add, retrieve, and clear messages from the chat history.
 * @example
 * ```typescript
 * const chatHistory = new RedisChatMessageHistory({
 *   sessionId: new Date().toISOString(),
 *   sessionTTL: 300,
 *   url: "redis:
 * });
 *
 * const chain = new ConversationChain({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *   memory: { chatHistory },
 * });
 *
 * const response = await chain.invoke({
 *   input: "What did I just say my name was?",
 * });
 * console.log({ response });
 * ```
 */
declare class RedisChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  get lc_secrets(): {
    url: string;
    "config.username": string;
    "config.password": string;
  };
  client: Redis;
  private sessionId;
  private sessionTTL?;
  constructor(fields: RedisChatMessageHistoryInput);
  /**
   * Retrieves all messages from the chat history.
   * @returns Promise that resolves with an array of BaseMessage instances.
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Adds a message to the chat history.
   * @param message The message to add to the chat history.
   * @returns Promise that resolves when the message has been added.
   */
  addMessage(message: BaseMessage): Promise<void>;
  /**
   * Clears all messages from the chat history.
   * @returns Promise that resolves when the chat history has been cleared.
   */
  clear(): Promise<void>;
}
//#endregion
export { RedisChatMessageHistory, RedisChatMessageHistoryInput };
//# sourceMappingURL=ioredis.d.cts.map