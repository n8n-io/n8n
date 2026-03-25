import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { Collection } from "@datastax/astra-db-ts";

//#region src/stores/message/astradb.d.ts
interface AstraDBChatMessageHistoryInput {
  token: string;
  endpoint: string;
  collectionName: string;
  namespace?: string;
  sessionId: string;
}
interface AstraDBChatMessageHistoryProps {
  collection: Collection;
  sessionId: string;
}
/**
 * Class for storing chat message history with Astra DB. It extends the
 * BaseListChatMessageHistory class and provides methods to get, add, and
 * clear messages.
 * @example
 *
 * ```typescript
 * const client = new AstraDB(
 *   process.env.ASTRA_DB_APPLICATION_TOKEN,
 *   process.env.ASTRA_DB_ENDPOINT,
 *   process.env.ASTRA_DB_NAMESPACE
 * );
 *
 * const collection = await client.collection("test_chat");
 *
 * const chatHistory = new AstraDBChatMessageHistory({
 *   collection,
 *   sessionId: "YOUR_SESSION_ID",
 * });
 *
 * const messages = await chatHistory.getMessages();
 *
 * await chatHistory.clear();
 */
declare class AstraDBChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  private sessionId;
  private collection;
  constructor({
    collection,
    sessionId
  }: AstraDBChatMessageHistoryProps);
  /**
   * async initializer function to return a new instance of AstraDBChatMessageHistory in a single step
   * @param AstraDBChatMessageHistoryInput
   * @returns Promise<AstraDBChatMessageHistory>
   *
   * @example
   * const chatHistory = await AstraDBChatMessageHistory.initialize({
   *  token: process.env.ASTRA_DB_APPLICATION_TOKEN,
   *  endpoint: process.env.ASTRA_DB_ENDPOINT,
   *  namespace: process.env.ASTRA_DB_NAMESPACE,
   *  collectionName:"test_chat",
   *  sessionId: "YOUR_SESSION_ID"
   * });
   */
  static initialize({
    token,
    endpoint,
    collectionName,
    namespace,
    sessionId
  }: AstraDBChatMessageHistoryInput): Promise<AstraDBChatMessageHistory>;
  getMessages(): Promise<BaseMessage[]>;
  addMessage(message: BaseMessage): Promise<void>;
  clear(): Promise<void>;
}
//#endregion
export { AstraDBChatMessageHistory, AstraDBChatMessageHistoryInput, AstraDBChatMessageHistoryProps };
//# sourceMappingURL=astradb.d.cts.map