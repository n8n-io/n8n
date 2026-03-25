import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { AppOptions } from "firebase-admin";

//#region src/stores/message/firestore.d.ts

/**
 * Interface for FirestoreDBChatMessageHistory. It includes the collection
 * name, session ID, user ID, and optionally, the app index and
 * configuration for the Firebase app.
 */
interface FirestoreDBChatMessageHistory {
  /**
   * An array of collection names, should match the length of `docs` field.
   * @TODO make required variable in 0.2
   */
  collections?: string[];
  /**
   * An array of doc names, should match the length of `collections` field,
   * or undefined if the collections field has a length of 1. In this case,
   * it will default to use `sessionId` as the doc name.
   * @TODO make required variable in 0.2
   */
  docs?: string[];
  sessionId: string;
  userId: string;
  appIdx?: number;
  config?: AppOptions;
}
/**
 * Class for managing chat message history using Google's Firestore as a
 * storage backend. Extends the BaseListChatMessageHistory class.
 * @example
 * ```typescript
 * const chatHistory = new FirestoreChatMessageHistory({
 *   collectionName: "langchain",
 *   sessionId: "lc-example",
 *   userId: "a@example.com",
 *   config: { projectId: "your-project-id" },
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
declare class FirestoreChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  private collections;
  private docs;
  private sessionId;
  private userId;
  private appIdx;
  private config;
  private firestoreClient;
  private document;
  constructor({
    collections,
    docs,
    sessionId,
    userId,
    appIdx,
    config
  }: FirestoreDBChatMessageHistory);
  private ensureFirestore;
  /**
   * Method to retrieve all messages from the Firestore collection
   * associated with the current session. Returns an array of BaseMessage
   * objects.
   * @returns Array of stored messages
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Method to add a new message to the Firestore collection. The message is
   * passed as a BaseMessage object.
   * @param message The message to be added as a BaseMessage object.
   */
  addMessage(message: BaseMessage): Promise<void>;
  private upsertMessage;
  /**
   * Method to delete all messages from the Firestore collection associated
   * with the current session.
   */
  clear(): Promise<void>;
}
//#endregion
export { FirestoreChatMessageHistory, FirestoreDBChatMessageHistory };
//# sourceMappingURL=firestore.d.ts.map