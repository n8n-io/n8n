import { CassandraClientArgs } from "../../utils/cassandra.js";
import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/cassandra.d.ts
interface CassandraChatMessageHistoryOptions extends CassandraClientArgs {
  keyspace: string;
  table: string;
  sessionId: string;
}
/**
 * Class for storing chat message history within Cassandra. It extends the
 * BaseListChatMessageHistory class and provides methods to get, add, and
 * clear messages.
 * @example
 * ```typescript
 * const chatHistory = new CassandraChatMessageHistory({
 *   cloud: {
 *     secureConnectBundle: "<path to your secure bundle>",
 *   },
 *   credentials: {
 *     username: "token",
 *     password: "<your Cassandra access token>",
 *   },
 *   keyspace: "langchain",
 *   table: "message_history",
 *   sessionId: "<some unique session identifier>",
 * });
 *
 * const chain = new ConversationChain({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   memory: chatHistory,
 * });
 *
 * const response = await chain.invoke({
 *   input: "What did I just say my name was?",
 * });
 * console.log({ response });
 * ```
 */
declare class CassandraChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  private cassandraTable;
  private sessionId;
  private options;
  private colSessionId;
  private colMessageTs;
  private colMessageType;
  private colData;
  constructor(options: CassandraChatMessageHistoryOptions);
  /**
   * Method to get all the messages stored in the Cassandra database.
   * @returns Array of stored BaseMessage instances.
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Method to add a new message to the Cassandra database.
   * @param message The BaseMessage instance to add.
   * @returns A promise that resolves when the message has been added.
   */
  addMessage(message: BaseMessage): Promise<void>;
  /**
   * Method to clear all the messages from the Cassandra database.
   * @returns A promise that resolves when all messages have been cleared.
   */
  clear(): Promise<void>;
  private ensureTable;
}
//#endregion
export { CassandraChatMessageHistory, CassandraChatMessageHistoryOptions };
//# sourceMappingURL=cassandra.d.ts.map