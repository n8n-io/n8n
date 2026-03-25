const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const node_fs = require_rolldown_runtime.__toESM(require("node:fs"));
const node_path = require_rolldown_runtime.__toESM(require("node:path"));
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));

//#region src/stores/message/file_system.ts
var file_system_exports = {};
require_rolldown_runtime.__export(file_system_exports, {
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
var FileSystemChatMessageHistory = class extends __langchain_core_chat_history.BaseListChatMessageHistory {
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
			const store$1 = await node_fs.promises.readFile(this.filePath, "utf-8");
			return JSON.parse(store$1);
		} catch (_error) {
			const error = _error;
			if (error.code === "ENOENT") return {};
			throw new Error(`Error loading FileSystemChatMessageHistory store: ${error}`);
		}
	}
	async saveStore() {
		try {
			await node_fs.promises.mkdir((0, node_path.dirname)(this.filePath), { recursive: true });
			await node_fs.promises.writeFile(this.filePath, JSON.stringify(store));
		} catch (error) {
			throw new Error(`Error saving FileSystemChatMessageHistory store: ${error}`);
		}
	}
	async getMessages() {
		await this.init();
		const messages = store[this.userId]?.[this.sessionId]?.messages ?? [];
		return (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(messages);
	}
	async addMessage(message) {
		await this.init();
		const messages = await this.getMessages();
		messages.push(message);
		const storedMessages = (0, __langchain_core_messages.mapChatMessagesToStoredMessages)(messages);
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
exports.FILE_HISTORY_DEFAULT_FILE_PATH = FILE_HISTORY_DEFAULT_FILE_PATH;
exports.FileSystemChatMessageHistory = FileSystemChatMessageHistory;
Object.defineProperty(exports, 'file_system_exports', {
  enumerable: true,
  get: function () {
    return file_system_exports;
  }
});
//# sourceMappingURL=file_system.cjs.map