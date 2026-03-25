import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";

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
var MongoDBChatMessageHistory = class extends BaseListChatMessageHistory {
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
		return mapStoredMessagesToChatMessages(messages);
	}
	async addMessage(message) {
		const messages = mapChatMessagesToStoredMessages([message]);
		await this.collection.updateOne({ [this.idKey]: this.sessionId }, { $push: { messages: { $each: messages } } }, { upsert: true });
	}
	async clear() {
		await this.collection.deleteOne({ [this.idKey]: this.sessionId });
	}
};

//#endregion
export { MongoDBChatMessageHistory };
//# sourceMappingURL=chat_history.js.map