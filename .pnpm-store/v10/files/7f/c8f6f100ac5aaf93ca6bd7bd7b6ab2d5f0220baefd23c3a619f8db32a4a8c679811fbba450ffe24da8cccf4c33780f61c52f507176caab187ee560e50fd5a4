import { __export } from "../../_virtual/rolldown_runtime.js";
import { condenseZepMemoryIntoHumanMessage, zepMemoryToMessages } from "../../memory/zep_cloud.js";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { NotFoundError } from "@getzep/zep-cloud/api";
import { BaseChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/zep_cloud.ts
var zep_cloud_exports = {};
__export(zep_cloud_exports, {
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
var ZepCloudChatMessageHistory = class extends BaseChatMessageHistory {
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
			if (error instanceof NotFoundError) console.warn(`Session ${this.sessionId} not found in Zep. Returning None`);
			else console.error("Error getting memory: ", error);
			return null;
		}
	}
	async getMessages() {
		const memory = await this.getMemory();
		if (!memory) return [];
		return this.separateMessages ? zepMemoryToMessages(memory) : [condenseZepMemoryIntoHumanMessage(memory)];
	}
	async addAIChatMessage(message, metadata) {
		await this.addMessage(new AIMessage({ content: message }), metadata);
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
		await this.addMessage(new HumanMessage({ content: message }, metadata));
	}
	clear() {
		console.warn("Clearing memory", this.sessionId);
		return Promise.resolve(void 0);
	}
};

//#endregion
export { ZepCloudChatMessageHistory, getZepMessageRoleType, zep_cloud_exports };
//# sourceMappingURL=zep_cloud.js.map