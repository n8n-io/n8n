import { __export } from "../../_virtual/rolldown_runtime.js";
import { Redis } from "@upstash/redis";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/upstash_redis.ts
var upstash_redis_exports = {};
__export(upstash_redis_exports, { UpstashRedisChatMessageHistory: () => UpstashRedisChatMessageHistory });
/**
* Class used to store chat message history in Redis. It provides methods
* to add, get, and clear messages.
*/
var UpstashRedisChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"upstash_redis"
	];
	get lc_secrets() {
		return {
			"config.url": "UPSTASH_REDIS_REST_URL",
			"config.token": "UPSTASH_REDIS_REST_TOKEN"
		};
	}
	client;
	sessionId;
	sessionTTL;
	constructor(fields) {
		super(fields);
		const { sessionId, sessionTTL, config, client } = fields;
		if (client) this.client = client;
		else if (config) this.client = new Redis(config);
		else throw new Error(`Upstash Redis message stores require either a config object or a pre-configured client.`);
		this.sessionId = sessionId;
		this.sessionTTL = sessionTTL;
	}
	/**
	* Retrieves the chat messages from the Redis database.
	* @returns An array of BaseMessage instances representing the chat history.
	*/
	async getMessages() {
		const rawStoredMessages = await this.client.lrange(this.sessionId, 0, -1);
		const orderedMessages = rawStoredMessages.reverse();
		const previousMessages = orderedMessages.filter((x) => x.type !== void 0 && x.data.content !== void 0);
		return mapStoredMessagesToChatMessages(previousMessages);
	}
	/**
	* Adds a new message to the chat history in the Redis database.
	* @param message The message to be added to the chat history.
	* @returns Promise resolving to void.
	*/
	async addMessage(message) {
		const messageToAdd = mapChatMessagesToStoredMessages([message]);
		await this.client.lpush(this.sessionId, JSON.stringify(messageToAdd[0]));
		if (this.sessionTTL) await this.client.expire(this.sessionId, this.sessionTTL);
	}
	/**
	* Deletes all messages from the chat history in the Redis database.
	* @returns Promise resolving to void.
	*/
	async clear() {
		await this.client.del(this.sessionId);
	}
};

//#endregion
export { UpstashRedisChatMessageHistory, upstash_redis_exports };
//# sourceMappingURL=upstash_redis.js.map