const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));
const ioredis = require_rolldown_runtime.__toESM(require("ioredis"));

//#region src/stores/message/ioredis.ts
var ioredis_exports = {};
require_rolldown_runtime.__export(ioredis_exports, { RedisChatMessageHistory: () => RedisChatMessageHistory });
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
var RedisChatMessageHistory = class extends __langchain_core_chat_history.BaseListChatMessageHistory {
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
		this.client = client ?? (url ? new ioredis.Redis(url) : new ioredis.Redis(config ?? {}));
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
		return (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(orderedMessages);
	}
	/**
	* Adds a message to the chat history.
	* @param message The message to add to the chat history.
	* @returns Promise that resolves when the message has been added.
	*/
	async addMessage(message) {
		const messageToAdd = (0, __langchain_core_messages.mapChatMessagesToStoredMessages)([message]);
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
exports.RedisChatMessageHistory = RedisChatMessageHistory;
Object.defineProperty(exports, 'ioredis_exports', {
  enumerable: true,
  get: function () {
    return ioredis_exports;
  }
});
//# sourceMappingURL=ioredis.cjs.map