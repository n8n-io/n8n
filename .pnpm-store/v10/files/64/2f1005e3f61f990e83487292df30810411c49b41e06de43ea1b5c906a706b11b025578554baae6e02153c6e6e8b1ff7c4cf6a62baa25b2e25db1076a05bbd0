import { __export } from "../../_virtual/rolldown_runtime.js";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { Redis } from "ioredis";

//#region src/stores/message/ioredis.ts
var ioredis_exports = {};
__export(ioredis_exports, { RedisChatMessageHistory: () => RedisChatMessageHistory });
/**
* Class used to store chat message history in Redis. It provides methods
* to add, retrieve, and clear messages from the chat history.
* @example
* ```typescript
* const chatHistory = new RedisChatMessageHistory({
*   sessionId: new Date().toISOString(),
*   sessionTTL: 300,
*   url: "redis:
* });
*
* const chain = new ConversationChain({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
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
		"ioredis"
	];
	get lc_secrets() {
		return {
			url: "REDIS_URL",
			"config.username": "REDIS_USERNAME",
			"config.password": "REDIS_PASSWORD"
		};
	}
	client;
	sessionId;
	sessionTTL;
	constructor(fields) {
		super(fields);
		const { sessionId, sessionTTL, url, config, client } = fields;
		this.client = client ?? (url ? new Redis(url) : new Redis(config ?? {}));
		this.sessionId = sessionId;
		this.sessionTTL = sessionTTL;
	}
	/**
	* Retrieves all messages from the chat history.
	* @returns Promise that resolves with an array of BaseMessage instances.
	*/
	async getMessages() {
		const rawStoredMessages = await this.client.lrange(this.sessionId, 0, -1);
		const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message));
		return mapStoredMessagesToChatMessages(orderedMessages);
	}
	/**
	* Adds a message to the chat history.
	* @param message The message to add to the chat history.
	* @returns Promise that resolves when the message has been added.
	*/
	async addMessage(message) {
		const messageToAdd = mapChatMessagesToStoredMessages([message]);
		await this.client.lpush(this.sessionId, JSON.stringify(messageToAdd[0]));
		if (this.sessionTTL) await this.client.expire(this.sessionId, this.sessionTTL);
	}
	/**
	* Clears all messages from the chat history.
	* @returns Promise that resolves when the chat history has been cleared.
	*/
	async clear() {
		await this.client.del(this.sessionId);
	}
};

//#endregion
export { RedisChatMessageHistory, ioredis_exports };
//# sourceMappingURL=ioredis.js.map