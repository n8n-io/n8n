import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { BaseMessage } from "@langchain/core/messages";
import { Collection, Document } from "mongodb";

//#region src/chat_history.d.ts
interface MongoDBChatMessageHistoryInput {
  collection: Collection<Document>;
  sessionId: string;
}
/**
 * @example
 * ```typescript
 * const chatHistory = new MongoDBChatMessageHistory({
 *   collection: myCollection,
 *   sessionId: 'unique-session-id',
 * });
 * const messages = await chatHistory.getMessages();
 * await chatHistory.clear();
 * ```
 */
declare class MongoDBChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  private collection;
  private sessionId;
  private idKey;
  constructor({
    collection,
    sessionId
  }: MongoDBChatMessageHistoryInput);
  getMessages(): Promise<BaseMessage[]>;
  addMessage(message: BaseMessage): Promise<void>;
  clear(): Promise<void>;
}
//#endregion
export { MongoDBChatMessageHistory, MongoDBChatMessageHistoryInput };
//# sourceMappingURL=chat_history.d.ts.map