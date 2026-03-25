import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { Client, Config } from "@planetscale/database";

//#region src/stores/message/planetscale.d.ts

/**
 * Type definition for the input parameters required when instantiating a
 * PlanetScaleChatMessageHistory object.
 */
type PlanetScaleChatMessageHistoryInput = {
  tableName?: string;
  sessionId: string;
  config?: Config;
  client?: Client;
};
/**
 * Class for storing and retrieving chat message history from a
 * PlanetScale database. Extends the BaseListChatMessageHistory class.
 * @example
 * ```typescript
 * const chatHistory = new PlanetScaleChatMessageHistory({
 *   tableName: "stored_message",
 *   sessionId: "lc-example",
 *   config: {
 *     url: "ADD_YOURS_HERE",
 *   },
 * });
 * const chain = new ConversationChain({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   memory: chatHistory,
 * });
 * const response = await chain.invoke({
 *   input: "What did I just say my name was?",
 * });
 * console.log({ response });
 * ```
 */
declare class PlanetScaleChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  get lc_secrets(): {
    "config.host": string;
    "config.username": string;
    "config.password": string;
    "config.url": string;
  };
  client: Client;
  private connection;
  private tableName;
  private sessionId;
  private tableInitialized;
  constructor(fields: PlanetScaleChatMessageHistoryInput);
  private ensureTable;
  /**
   * Method to retrieve all messages from the PlanetScale database for the
   * current session.
   * @returns Promise that resolves to an array of BaseMessage objects.
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Method to add a new message to the PlanetScale database for the current
   * session.
   * @param message The BaseMessage object to be added to the database.
   * @returns Promise that resolves to void.
   */
  addMessage(message: BaseMessage): Promise<void>;
  /**
   * Method to delete all messages from the PlanetScale database for the
   * current session.
   * @returns Promise that resolves to void.
   */
  clear(): Promise<void>;
}
//#endregion
export { PlanetScaleChatMessageHistory, PlanetScaleChatMessageHistoryInput };
//# sourceMappingURL=planetscale.d.ts.map