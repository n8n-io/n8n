const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_memory_zep_cloud = require('../../memory/zep_cloud.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __getzep_zep_cloud_api = require_rolldown_runtime.__toESM(require("@getzep/zep-cloud/api"));
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));

//#region src/stores/message/zep_cloud.ts
var zep_cloud_exports = {};
require_rolldown_runtime.__export(zep_cloud_exports, {
	ZepCloudChatMessageHistory: () => ZepCloudChatMessageHistory,
	getZepMessageRoleType: () => getZepMessageRoleType
});
const getZepMessageRoleType = (role) => {
	switch (role) {
		case "human": return "user";
		case "ai": return "assistant";
		case "system": return "system";
		case "function": return "function";
		case "tool": return "tool";
		default: return "norole";
	}
};
/**
* Class used to manage the memory of a chat session, including loading
* and saving the chat history, and clearing the memory when needed. It
* uses the ZepClient to interact with the Zep service for managing the
* chat session's memory.
*
*/
var ZepCloudChatMessageHistory = class extends __langchain_core_chat_history.BaseChatMessageHistory {
	lc_namespace = [];
	sessionId;
	client;
	memoryType;
	humanPrefix = "human";
	aiPrefix = "ai";
	separateMessages = false;
	constructor(fields) {
		super();
		this.sessionId = fields.sessionId;
		this.memoryType = fields.memoryType;
		this.client = fields.client;
		if (fields.humanPrefix) this.humanPrefix = fields.humanPrefix;
		if (fields.aiPrefix) this.aiPrefix = fields.aiPrefix;
		if (fields.separateMessages) this.separateMessages = fields.separateMessages;
	}
	async getMemory() {
		try {
			return this.client.memory.get(this.sessionId, { memoryType: this.memoryType });
		} catch (error) {
			if (error instanceof __getzep_zep_cloud_api.NotFoundError) console.warn(`Session ${this.sessionId} not found in Zep. Returning None`);
			else console.error("Error getting memory: ", error);
			return null;
		}
	}
	async getMessages() {
		const memory = await this.getMemory();
		if (!memory) return [];
		return this.separateMessages ? require_memory_zep_cloud.zepMemoryToMessages(memory) : [require_memory_zep_cloud.condenseZepMemoryIntoHumanMessage(memory)];
	}
	async addAIChatMessage(message, metadata) {
		await this.addMessage(new __langchain_core_messages.AIMessage({ content: message }), metadata);
	}
	async addMessage(message, metadata) {
		const messageToSave = message;
		if (message._getType() === "ai") messageToSave.name = this.aiPrefix;
		else if (message._getType() === "human") messageToSave.name = this.humanPrefix;
		if (message.content === null) throw new Error("Message content cannot be null");
		if (Array.isArray(message.content)) throw new Error("Message content cannot be a list");
		await this.client.memory.add(this.sessionId, { messages: [{
			content: message.content,
			role: message.name ?? message._getType(),
			roleType: getZepMessageRoleType(message._getType()),
			metadata
		}] });
	}
	async addUserMessage(message, metadata) {
		await this.addMessage(new __langchain_core_messages.HumanMessage({ content: message }, metadata));
	}
	clear() {
		console.warn("Clearing memory", this.sessionId);
		return Promise.resolve(void 0);
	}
};

//#endregion
exports.ZepCloudChatMessageHistory = ZepCloudChatMessageHistory;
exports.getZepMessageRoleType = getZepMessageRoleType;
Object.defineProperty(exports, 'zep_cloud_exports', {
  enumerable: true,
  get: function () {
    return zep_cloud_exports;
  }
});
//# sourceMappingURL=zep_cloud.cjs.map