import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { BaseClient, BaseClientOptions } from "@xata.io/client";

//#region src/stores/message/xata.d.ts

/**
 * An object type that represents the input for the XataChatMessageHistory
 * class.
 */
type XataChatMessageHistoryInput<XataClient> = {
  sessionId: string;
  config?: BaseClientOptions;
  client?: XataClient;
  table?: string;
  createTable?: boolean;
  apiKey?: string;
};
/**
 * A class for managing chat message history using Xata.io client. It
 * extends the BaseListChatMessageHistory class and provides methods to
 * get, add, and clear messages. It also ensures the existence of a table
 * where the chat messages are stored.
 * @example
 * ```typescript
 * const chatHistory = new XataChatMessageHistory({
 *   table: "messages",
 *   sessionId: new Date().toISOString(),
 *   client: new BaseClient({
 *     databaseURL: process.env.XATA_DB_URL,
 *     apiKey: process.env.XATA_API_KEY,
 *     branch: "main",
 *   }),
 *   apiKey: process.env.XATA_API_KEY,
 * });
 *
 * const chain = new ConversationChain({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   memory: new BufferMemory({ chatHistory }),
 * });
 *
 * const response = await chain.invoke({
 *   input: "What did I just say my name was?",
 * });
 * console.log({ response });
 * ```
 */
declare class XataChatMessageHistory<XataClient extends BaseClient> extends BaseListChatMessageHistory {
  lc_namespace: string[];
  client: XataClient;
  private sessionId;
  private table;
  private tableInitialized;
  private createTable;
  private apiClient;
  constructor(fields: XataChatMessageHistoryInput<XataClient>);
  /**
   * Retrieves all messages associated with the session ID, ordered by
   * creation time.
   * @returns A promise that resolves to an array of BaseMessage instances.
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Adds a new message to the database.
   * @param message The BaseMessage instance to be added.
   * @returns A promise that resolves when the message has been added.
   */
  addMessage(message: BaseMessage): Promise<void>;
  /**
   * Deletes all messages associated with the session ID.
   * @returns A promise that resolves when the messages have been deleted.
   */
  clear(): Promise<void>;
  private ensureTable;
}
//#endregion
export { XataChatMessageHistory, XataChatMessageHistoryInput };
//# sourceMappingURL=xata.d.ts.map