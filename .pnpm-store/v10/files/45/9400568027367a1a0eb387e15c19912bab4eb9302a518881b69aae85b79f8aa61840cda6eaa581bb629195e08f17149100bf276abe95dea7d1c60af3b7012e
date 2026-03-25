import { ICacheClient } from "@gomomento/sdk-core";
import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/momento.d.ts

/**
 * The settings to instantiate the Momento chat message history.
 */
interface MomentoChatMessageHistoryProps {
  /**
   * The session ID to use to store the data.
   */
  sessionId: string;
  /**
   * The Momento cache client.
   */
  client: ICacheClient;
  /**
   * The name of the cache to use to store the data.
   */
  cacheName: string;
  /**
   * The time to live for the cache items in seconds.
   * If not specified, the cache client default is used.
   */
  sessionTtl?: number;
  /**
   * If true, ensure that the cache exists before returning.
   * If false, the cache is not checked for existence.
   * Defaults to true.
   */
  ensureCacheExists?: true;
}
/**
 * A class that stores chat message history using Momento Cache. It
 * interacts with a Momento cache client to perform operations like
 * fetching, adding, and deleting messages.
 * @example
 * ```typescript
 * const chatHistory = await MomentoChatMessageHistory.fromProps({
 *   client: new CacheClient({
 *     configuration: Configurations.Laptop.v1(),
 *     credentialProvider: CredentialProvider.fromEnvironmentVariable({
 *       environmentVariableName: "MOMENTO_API_KEY",
 *     }),
 *     defaultTtlSeconds: 60 * 60 * 24,
 *   }),
 *   cacheName: "langchain",
 *   sessionId: new Date().toISOString(),
 *   sessionTtl: 300,
 * });
 *
 * const messages = await chatHistory.getMessages();
 * console.log({ messages });
 * ```
 */
declare class MomentoChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  private readonly sessionId;
  private readonly client;
  private readonly cacheName;
  private readonly sessionTtl;
  private constructor();
  /**
   * Create a new chat message history backed by Momento.
   *
   * @param {MomentoCacheProps} props The settings to instantiate the Momento chat message history.
   * @param {string} props.sessionId The session ID to use to store the data.
   * @param {ICacheClient} props.client The Momento cache client.
   * @param {string} props.cacheName The name of the cache to use to store the data.
   * @param {number} props.sessionTtl The time to live for the cache items in seconds.
   * If not specified, the cache client default is used.
   * @param {boolean} props.ensureCacheExists If true, ensure that the cache exists before returning.
   * If false, the cache is not checked for existence.
   * @throws {InvalidArgumentError} If {@link props.sessionTtl} is not strictly positive.
   * @returns A new chat message history backed by Momento.
   */
  static fromProps(props: MomentoChatMessageHistoryProps): Promise<MomentoChatMessageHistory>;
  /**
   * Validate the user-specified TTL, if provided, is strictly positive.
   * @param ttlSeconds The TTL to validate.
   */
  private validateTtlSeconds;
  /**
   * Fetches messages from the cache.
   * @returns A Promise that resolves to an array of BaseMessage instances.
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Adds a message to the cache.
   * @param message The BaseMessage instance to add to the cache.
   * @returns A Promise that resolves when the message has been added.
   */
  addMessage(message: BaseMessage): Promise<void>;
  /**
   * Deletes all messages from the cache.
   * @returns A Promise that resolves when all messages have been deleted.
   */
  clear(): Promise<void>;
}
//#endregion
export { MomentoChatMessageHistory, MomentoChatMessageHistoryProps };
//# sourceMappingURL=momento.d.cts.map