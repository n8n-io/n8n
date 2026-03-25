import { Redis, RedisConfigNodejs } from "@upstash/redis";
import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/upstash_redis.d.ts

/**
 * Type definition for the input parameters required to initialize an
 * instance of the UpstashRedisChatMessageHistory class.
 */
type UpstashRedisChatMessageHistoryInput = {
  sessionId: string;
  sessionTTL?: number;
  config?: RedisConfigNodejs;
  client?: Redis;
};
/**
 * Class used to store chat message history in Redis. It provides methods
 * to add, get, and clear messages.
 */
declare class UpstashRedisChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  get lc_secrets(): {
    "config.url": string;
    "config.token": string;
  };
  client: Redis;
  private sessionId;
  private sessionTTL?;
  constructor(fields: UpstashRedisChatMessageHistoryInput);
  /**
   * Retrieves the chat messages from the Redis database.
   * @returns An array of BaseMessage instances representing the chat history.
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Adds a new message to the chat history in the Redis database.
   * @param message The message to be added to the chat history.
   * @returns Promise resolving to void.
   */
  addMessage(message: BaseMessage): Promise<void>;
  /**
   * Deletes all messages from the chat history in the Redis database.
   * @returns Promise resolving to void.
   */
  clear(): Promise<void>;
}
//#endregion
export { UpstashRedisChatMessageHistory, UpstashRedisChatMessageHistoryInput };
//# sourceMappingURL=upstash_redis.d.ts.map