const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/chat_history.ts
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
var MongoDBChatMessageHistory = class extends __langchain_core_chat_history.BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"mongodb"
	];
	collection;
	sessionId;
	idKey = "sessionId";
	constructor({ collection, sessionId }) {
		super();
		this.collection = collection;
		this.sessionId = sessionId;
		this.collection.db.client.appendMetadata({ name: "langchainjs_chat_history" });
	}
	async getMessages() {
		const document = await this.collection.findOne({ [this.idKey]: this.sessionId });
		const messages = document?.messages || [];
		return (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(messages);
	}
	async addMessage(message) {
		const messages = (0, __langchain_core_messages.mapChatMessagesToStoredMessages)([message]);
		await this.collection.updateOne({ [this.idKey]: this.sessionId }, { $push: { messages: { $each: messages } } }, { upsert: true });
	}
	async clear() {
		await this.collection.deleteOne({ [this.idKey]: this.sessionId });
	}
};

//#endregion
exports.MongoDBChatMessageHistory = MongoDBChatMessageHistory;
//# sourceMappingURL=chat_history.cjs.map