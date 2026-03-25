import { __export } from "../../_virtual/rolldown_runtime.js";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { promises } from "node:fs";
import { dirname } from "node:path";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/file_system.ts
var file_system_exports = {};
__export(file_system_exports, {
	FILE_HISTORY_DEFAULT_FILE_PATH: () => FILE_HISTORY_DEFAULT_FILE_PATH,
	FileSystemChatMessageHistory: () => FileSystemChatMessageHistory
});
const FILE_HISTORY_DEFAULT_FILE_PATH = ".history/history.json";
let store;
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
var FileSystemChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"file"
	];
	sessionId;
	userId;
	filePath;
	constructor(chatHistoryInput) {
		super();
		this.sessionId = chatHistoryInput.sessionId;
		this.userId = chatHistoryInput.userId ?? "";
		this.filePath = chatHistoryInput.filePath ?? FILE_HISTORY_DEFAULT_FILE_PATH;
	}
	async init() {
		if (store) return;
		try {
			store = await this.loadStore();
		} catch (error) {
			console.error("Error initializing FileSystemChatMessageHistory:", error);
			throw error;
		}
	}
	async loadStore() {
		try {
			const store$1 = await promises.readFile(this.filePath, "utf-8");
			return JSON.parse(store$1);
		} catch (_error) {
			const error = _error;
			if (error.code === "ENOENT") return {};
			throw new Error(`Error loading FileSystemChatMessageHistory store: ${error}`);
		}
	}
	async saveStore() {
		try {
			await promises.mkdir(dirname(this.filePath), { recursive: true });
			await promises.writeFile(this.filePath, JSON.stringify(store));
		} catch (error) {
			throw new Error(`Error saving FileSystemChatMessageHistory store: ${error}`);
		}
	}
	async getMessages() {
		await this.init();
		const messages = store[this.userId]?.[this.sessionId]?.messages ?? [];
		return mapStoredMessagesToChatMessages(messages);
	}
	async addMessage(message) {
		await this.init();
		const messages = await this.getMessages();
		messages.push(message);
		const storedMessages = mapChatMessagesToStoredMessages(messages);
		store[this.userId] ??= {};
		store[this.userId][this.sessionId] = {
			...store[this.userId][this.sessionId],
			messages: storedMessages
		};
		await this.saveStore();
	}
	async clear() {
		await this.init();
		if (store[this.userId]) delete store[this.userId][this.sessionId];
		await this.saveStore();
	}
	async getContext() {
		await this.init();
		return store[this.userId]?.[this.sessionId]?.context ?? {};
	}
	async setContext(context) {
		await this.init();
		store[this.userId] ??= {};
		store[this.userId][this.sessionId] = {
			...store[this.userId][this.sessionId],
			context
		};
		await this.saveStore();
	}
	async clearAllSessions() {
		await this.init();
		delete store[this.userId];
		await this.saveStore();
	}
	async getAllSessions() {
		await this.init();
		const userSessions = store[this.userId] ? Object.entries(store[this.userId]).map(([id, session]) => ({
			id,
			context: session.context
		})) : [];
		return userSessions;
	}
};

//#endregion
export { FILE_HISTORY_DEFAULT_FILE_PATH, FileSystemChatMessageHistory, file_system_exports };
//# sourceMappingURL=file_system.js.map