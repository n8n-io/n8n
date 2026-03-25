const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_memory_chat_memory = require('./chat_memory.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_memory = require_rolldown_runtime.__toESM(require("@langchain/core/memory"));
const __getzep_zep_cloud = require_rolldown_runtime.__toESM(require("@getzep/zep-cloud"));
const __getzep_zep_cloud_api = require_rolldown_runtime.__toESM(require("@getzep/zep-cloud/api"));

//#region src/memory/zep_cloud.ts
var zep_cloud_exports = {};
require_rolldown_runtime.__export(zep_cloud_exports, {
	ZepCloudMemory: () => ZepCloudMemory,
	condenseZepMemoryIntoHumanMessage: () => condenseZepMemoryIntoHumanMessage,
	zepMemoryContextToSystemPrompt: () => zepMemoryContextToSystemPrompt,
	zepMemoryToMessages: () => zepMemoryToMessages
});
const zepMemoryContextToSystemPrompt = (memory) => {
	let systemPrompt = "";
	if (memory.facts) systemPrompt += memory.facts.join("\n");
	if (memory.summary && memory.summary?.content) systemPrompt += memory.summary.content;
	return systemPrompt;
};
const condenseZepMemoryIntoHumanMessage = (memory) => {
	const systemPrompt = zepMemoryContextToSystemPrompt(memory);
	let concatMessages = "";
	if (memory.messages) concatMessages = memory.messages.map((msg) => `${msg.role ?? msg.roleType}: ${msg.content}`).join("\n");
	return new __langchain_core_messages.HumanMessage(`${systemPrompt}\n${concatMessages}`);
};
const zepMemoryToMessages = (memory) => {
	const systemPrompt = zepMemoryContextToSystemPrompt(memory);
	let messages = systemPrompt ? [new __langchain_core_messages.SystemMessage(systemPrompt)] : [];
	if (memory && memory.messages) messages = messages.concat(memory.messages.filter((m) => m.content).map((message) => {
		const { content, role, roleType } = message;
		const messageContent = content;
		if (roleType === "user") return new __langchain_core_messages.HumanMessage(messageContent);
		else if (role === "assistant") return new __langchain_core_messages.AIMessage(messageContent);
		else return new __langchain_core_messages.ChatMessage(messageContent, roleType ?? role);
	}));
	return messages;
};
/**
* Class used to manage the memory of a chat session, including loading
* and saving the chat history, and clearing the memory when needed. It
* uses the ZepClient to interact with the Zep service for managing the
* chat session's memory.
* @example
* ```typescript
* const sessionId = randomUUID();
*
* // Initialize ZepCloudMemory with session ID and API key
* const memory = new ZepCloudMemory({
*   sessionId,
*   apiKey: "<zep api key>",
* });
*
* // Create a ChatOpenAI model instance with specific parameters
* const model = new ChatOpenAI({
*   model: "gpt-3.5-turbo",
*   temperature: 0,
* });
*
* // Create a ConversationChain with the model and memory
* const chain = new ConversationChain({ llm: model, memory });
*
* // Example of calling the chain with an input
* const res1 = await chain.call({ input: "Hi! I'm Jim." });
* console.log({ res1 });
*
* // Follow-up call to the chain to demonstrate memory usage
* const res2 = await chain.call({ input: "What did I just say my name was?" });
* console.log({ res2 });
*
* // Output the session ID and the current state of memory
* console.log("Session ID: ", sessionId);
* console.log("Memory: ", await memory.loadMemoryVariables({}));
*
* ```
*/
var ZepCloudMemory = class extends require_memory_chat_memory.chat_memory_exports.BaseChatMemory {
	humanPrefix = "Human";
	aiPrefix = "AI";
	memoryKey = "history";
	apiKey;
	sessionId;
	zepClient;
	memoryType;
	separateMessages;
	constructor(fields) {
		super({
			returnMessages: fields?.returnMessages ?? false,
			inputKey: fields?.inputKey,
			outputKey: fields?.outputKey
		});
		this.humanPrefix = fields.humanPrefix ?? this.humanPrefix;
		this.aiPrefix = fields.aiPrefix ?? this.aiPrefix;
		this.memoryKey = fields.memoryKey ?? this.memoryKey;
		this.apiKey = fields.apiKey;
		this.sessionId = fields.sessionId;
		this.memoryType = fields.memoryType ?? "perpetual";
		this.separateMessages = fields.separateMessages ?? false;
		this.zepClient = new __getzep_zep_cloud.ZepClient({ apiKey: this.apiKey });
	}
	get memoryKeys() {
		return [this.memoryKey];
	}
	/**
	* Method that retrieves the chat history from the Zep service and formats
	* it into a list of messages.
	* @param values Input values for the method.
	* @returns Promise that resolves with the chat history formatted into a list of messages.
	*/
	async loadMemoryVariables(values) {
		const memoryType = values.memoryType ?? "perpetual";
		let memory = null;
		try {
			memory = await this.zepClient.memory.get(this.sessionId, { memoryType });
		} catch (error) {
			if (error instanceof __getzep_zep_cloud_api.NotFoundError) return this.returnMessages ? { [this.memoryKey]: [] } : { [this.memoryKey]: "" };
			throw error;
		}
		if (this.returnMessages) return { [this.memoryKey]: this.separateMessages ? zepMemoryToMessages(memory) : [condenseZepMemoryIntoHumanMessage(memory)] };
		return { [this.memoryKey]: this.separateMessages ? (0, __langchain_core_messages.getBufferString)(zepMemoryToMessages(memory), this.humanPrefix, this.aiPrefix) : condenseZepMemoryIntoHumanMessage(memory).content };
	}
	/**
	* Method that saves the input and output messages to the Zep service.
	* @param inputValues Input messages to be saved.
	* @param outputValues Output messages to be saved.
	* @returns Promise that resolves when the messages have been saved.
	*/
	async saveContext(inputValues, outputValues) {
		const input = (0, __langchain_core_memory.getInputValue)(inputValues, this.inputKey);
		const output = (0, __langchain_core_memory.getOutputValue)(outputValues, this.outputKey);
		if (this.sessionId) try {
			await this.zepClient.memory.add(this.sessionId, { messages: [{
				role: this.humanPrefix,
				roleType: "user",
				content: `${input}`
			}, {
				role: this.aiPrefix,
				roleType: "assistant",
				content: `${output}`
			}] });
		} catch (error) {
			console.error("Error adding memory: ", error);
		}
		await super.saveContext(inputValues, outputValues);
	}
	/**
	* Method that deletes the chat history from the Zep service.
	* @returns Promise that resolves when the chat history has been deleted.
	*/
	async clear() {
		try {
			await this.zepClient.memory.delete(this.sessionId);
		} catch (error) {
			console.error("Error deleting session: ", error);
		}
		await super.clear();
	}
};

//#endregion
exports.ZepCloudMemory = ZepCloudMemory;
exports.condenseZepMemoryIntoHumanMessage = condenseZepMemoryIntoHumanMessage;
exports.zepMemoryContextToSystemPrompt = zepMemoryContextToSystemPrompt;
exports.zepMemoryToMessages = zepMemoryToMessages;
Object.defineProperty(exports, 'zep_cloud_exports', {
  enumerable: true,
  get: function () {
    return zep_cloud_exports;
  }
});
//# sourceMappingURL=zep_cloud.cjs.map