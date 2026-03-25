import { pool } from "./connections.js";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";

//#region src/chat_histories.ts
/**
* Class for storing chat message history using Redis. Extends the
* `BaseListChatMessageHistory` class.
* @example
* ```typescript
* const chatHistory = new RedisChatMessageHistory({
*   sessionId: new Date().toISOString(),
*   sessionTTL: 300,
*   url: "redis:
* });
*
* const chain = new ConversationChain({
*   llm: new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 }),
*   memory: { chatHistory },
* });
*
* const response = await chain.invoke({
*   input: "What did I just say my name was?",
* });
* console.log({ response });
* ```
*/
var RedisChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"redis"
	];
	get lc_secrets() {
		return {
			"config.url": "REDIS_URL",
			"config.username": "REDIS_USERNAME",
			"config.password": "REDIS_PASSWORD"
		};
	}
	client;
	sessionId;
	sessionTTL;
	constructor(fields) {
		super(fields);
		const { sessionId, sessionTTL, config, client } = fields;
		this.client = client ?? pool.getClient(config);
		this.sessionId = sessionId;
		this.sessionTTL = sessionTTL;
	}
	/**
	* Ensures the Redis client is ready to perform operations. If the client
	* is not ready, it attempts to connect to the Redis database.
	* @returns Promise resolving to true when the client is ready.
	*/
	async ensureReadiness() {
		if (!this.client.isReady) await this.client.connect();
		return true;
	}
	/**
	* Retrieves all chat messages from the Redis database for the current
	* session.
	* @returns Promise resolving to an array of `BaseMessage` instances.
	*/
	async getMessages() {
		await this.ensureReadiness();
		const rawStoredMessages = await this.client.lRange(this.sessionId, 0, -1);
		const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message));
		return mapStoredMessagesToChatMessages(orderedMessages);
	}
	/**
	* Adds a new chat message to the Redis database for the current session.
	* @param message The `BaseMessage` instance to add.
	* @returns Promise resolving when the message has been added.
	*/
	async addMessage(message) {
		await this.ensureReadiness();
		const messageToAdd = mapChatMessagesToStoredMessages([message]);
		await this.client.lPush(this.sessionId, JSON.stringify(messageToAdd[0]));
		if (this.sessionTTL) await this.client.expire(this.sessionId, this.sessionTTL);
	}
	/**
	* Deletes all chat messages from the Redis database for the current
	* session.
	* @returns Promise resolving when the messages have been deleted.
	*/
	async clear() {
		await this.ensureReadiness();
		await this.client.del(this.sessionId);
	}
};

//#endregion
export { RedisChatMessageHistory };
//# sourceMappingURL=chat_histories.js.map