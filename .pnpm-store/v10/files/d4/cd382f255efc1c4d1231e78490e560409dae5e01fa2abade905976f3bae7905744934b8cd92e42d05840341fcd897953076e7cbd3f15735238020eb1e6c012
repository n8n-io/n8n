import { BaseMessage, StoredMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/file_system.d.ts
declare const FILE_HISTORY_DEFAULT_FILE_PATH = ".history/history.json";
/**
 * Represents a lightweight file chat session.
 */
type FileChatSession = {
  id: string;
  context: Record<string, unknown>;
};
/**
 * Represents a stored chat session.
 */
type StoredFileChatSession = FileChatSession & {
  messages: StoredMessage[];
};
/**
 * Type for the store of chat sessions.
 */
type FileChatStore = {
  [userId: string]: Record<string, StoredFileChatSession>;
};
/**
 * Type for the input to the `FileSystemChatMessageHistory` constructor.
 */
interface FileSystemChatMessageHistoryInput {
  sessionId: string;
  userId?: string;
  filePath?: string;
}
/**
 * Store chat message history using a local JSON file.
 * For demo and development purposes only.
 *
 * @example
 * ```typescript
 *  const model = new ChatOpenAI({
 *   model: "gpt-3.5-turbo",
 *   temperature: 0,
 * });
 * const prompt = ChatPromptTemplate.fromMessages([
 *   [
 *     "system",
 *     "You are a helpful assistant. Answer all questions to the best of your ability.",
 *   ],
 *   ["placeholder", "chat_history"],
 *   ["human", "{input}"],
 * ]);
 *
 * const chain = prompt.pipe(model).pipe(new StringOutputParser());
 * const chainWithHistory = new RunnableWithMessageHistory({
 *   runnable: chain,
 *  inputMessagesKey: "input",
 *  historyMessagesKey: "chat_history",
 *   getMessageHistory: async (sessionId) => {
 *     const chatHistory = new FileSystemChatMessageHistory({
 *       sessionId: sessionId,
 *       userId: "userId",  // Optional
 *     })
 *     return chatHistory;
 *   },
 * });
 * await chainWithHistory.invoke(
 *   { input: "What did I just say my name was?" },
 *   { configurable: { sessionId: "session-id" } }
 * );
 * ```
 */
declare class FileSystemChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  private sessionId;
  private userId;
  private filePath;
  constructor(chatHistoryInput: FileSystemChatMessageHistoryInput);
  private init;
  protected loadStore(): Promise<FileChatStore>;
  protected saveStore(): Promise<void>;
  getMessages(): Promise<BaseMessage[]>;
  addMessage(message: BaseMessage): Promise<void>;
  clear(): Promise<void>;
  getContext(): Promise<Record<string, unknown>>;
  setContext(context: Record<string, unknown>): Promise<void>;
  clearAllSessions(): Promise<void>;
  getAllSessions(): Promise<FileChatSession[]>;
}
//#endregion
export { FILE_HISTORY_DEFAULT_FILE_PATH, FileChatSession, FileChatStore, FileSystemChatMessageHistory, FileSystemChatMessageHistoryInput, StoredFileChatSession };
//# sourceMappingURL=file_system.d.ts.map