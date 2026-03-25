const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_memory_chat_memory = require('./chat_memory.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const mem0ai = require_rolldown_runtime.__toESM(require("mem0ai"));
const __langchain_core_memory = require_rolldown_runtime.__toESM(require("@langchain/core/memory"));

//#region src/memory/mem0.ts
var mem0_exports = {};
require_rolldown_runtime.__export(mem0_exports, {
	Mem0Memory: () => Mem0Memory,
	condenseMem0MemoryIntoHumanMessage: () => condenseMem0MemoryIntoHumanMessage,
	mem0MemoryContextToSystemPrompt: () => mem0MemoryContextToSystemPrompt,
	mem0MemoryToMessages: () => mem0MemoryToMessages
});
/**
* Extracts and formats memory content into a system prompt
* @param memory Array of Memory objects from mem0ai
* @returns Formatted system prompt string
*/
const mem0MemoryContextToSystemPrompt = (memory) => {
	if (!memory || !Array.isArray(memory)) return "";
	return memory.filter((m) => m?.memory).map((m) => m.memory).join("\n");
};
/**
* Condenses memory content into a single HumanMessage with context
* @param memory Array of Memory objects from mem0ai
* @returns HumanMessage containing formatted memory context
*/
const condenseMem0MemoryIntoHumanMessage = (memory) => {
	const basePrompt = "These are the memories I have stored. Give more weightage to the question by users and try to answer that first. You have to modify your answer based on the memories I have provided. If the memories are irrelevant you can ignore them. Also don't reply to this section of the prompt, or the memories, they are only for your reference. The MEMORIES of the USER are: \n\n";
	const systemPrompt = mem0MemoryContextToSystemPrompt(memory);
	return new __langchain_core_messages.HumanMessage(`${basePrompt}\n${systemPrompt}`);
};
/**
* Converts Mem0 memories to a list of BaseMessages
* @param memories Array of Memory objects from mem0ai
* @returns Array of BaseMessage objects
*/
const mem0MemoryToMessages = (memories) => {
	if (!memories || !Array.isArray(memories)) return [];
	const messages = [];
	const memoryContent = memories.filter((m) => m?.memory).map((m) => m.memory).join("\n");
	if (memoryContent) messages.push(new __langchain_core_messages.SystemMessage(memoryContent));
	memories.forEach((memory) => {
		if (memory.messages) memory.messages.forEach((msg) => {
			const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
			if (msg.role === "user") messages.push(new __langchain_core_messages.HumanMessage(content));
			else if (msg.role === "assistant") messages.push(new __langchain_core_messages.AIMessage(content));
			else if (content) messages.push(new __langchain_core_messages.ChatMessage(content, msg.role));
		});
	});
	return messages;
};
/**
* Class used to manage the memory of a chat session using the Mem0 service.
* It handles loading and saving chat history, and provides methods to format
* the memory content for use in chat models.
*
* @example
* ```typescript
* const memory = new Mem0Memory({
*   sessionId: "user123" // or use user_id inside of memoryOptions (recommended),
*   apiKey: "your-api-key",
*   memoryOptions: {
*     user_id: "user123",
*     run_id: "run123"
*   },
* });
*
* // Use with a chat model
* const model = new ChatOpenAI({
*   model: "gpt-3.5-turbo",
*   temperature: 0,
* });
*
* const chain = new ConversationChain({ llm: model, memory });
* ```
*/
var Mem0Memory = class extends require_memory_chat_memory.chat_memory_exports.BaseChatMemory {
	memoryKey = "history";
	apiKey;
	sessionId;
	humanPrefix = "Human";
	aiPrefix = "AI";
	mem0Client;
	memoryOptions;
	mem0Options;
	separateMessages;
	constructor(fields) {
		if (!fields.apiKey) throw new Error("apiKey is required for Mem0Memory");
		if (!fields.sessionId) throw new Error("sessionId is required for Mem0Memory");
		super({
			returnMessages: fields?.returnMessages ?? false,
			inputKey: fields?.inputKey,
			outputKey: fields?.outputKey
		});
		this.apiKey = fields.apiKey;
		this.sessionId = fields.sessionId;
		this.humanPrefix = fields.humanPrefix ?? this.humanPrefix;
		this.aiPrefix = fields.aiPrefix ?? this.aiPrefix;
		this.memoryOptions = fields.memoryOptions ?? {};
		this.mem0Options = fields.mem0Options ?? { apiKey: this.apiKey };
		this.separateMessages = fields.separateMessages ?? false;
		try {
			this.mem0Client = new mem0ai.MemoryClient({
				...this.mem0Options,
				apiKey: this.apiKey
			});
		} catch (error) {
			console.error("Failed to initialize Mem0Client:", error);
			throw new Error("Failed to initialize Mem0Client. Please check your configuration.");
		}
	}
	get memoryKeys() {
		return [this.memoryKey];
	}
	/**
	* Retrieves memories from the Mem0 service and formats them for use
	* @param values Input values containing optional search query
	* @returns Promise resolving to formatted memory variables
	*/
	async loadMemoryVariables(values) {
		const searchType = values.input ? "search" : "get_all";
		let memories = [];
		try {
			if (searchType === "get_all") memories = await this.mem0Client.getAll({
				user_id: this.sessionId,
				...this.memoryOptions
			});
			else memories = await this.mem0Client.search(values.input, {
				user_id: this.sessionId,
				...this.memoryOptions
			});
		} catch (error) {
			console.error("Error loading memories:", error);
			return this.returnMessages ? { [this.memoryKey]: [] } : { [this.memoryKey]: "" };
		}
		if (this.returnMessages) return { [this.memoryKey]: this.separateMessages ? mem0MemoryToMessages(memories) : [condenseMem0MemoryIntoHumanMessage(memories)] };
		return { [this.memoryKey]: this.separateMessages ? (0, __langchain_core_messages.getBufferString)(mem0MemoryToMessages(memories), this.humanPrefix, this.aiPrefix) : condenseMem0MemoryIntoHumanMessage(memories).content ?? "" };
	}
	/**
	* Saves the current conversation context to the Mem0 service
	* @param inputValues Input messages to be saved
	* @param outputValues Output messages to be saved
	* @returns Promise resolving when the context has been saved
	*/
	async saveContext(inputValues, outputValues) {
		const input = (0, __langchain_core_memory.getInputValue)(inputValues, this.inputKey);
		const output = (0, __langchain_core_memory.getOutputValue)(outputValues, this.outputKey);
		if (!input || !output) {
			console.warn("Missing input or output values, skipping memory save");
			return;
		}
		try {
			const messages = [{
				role: "user",
				content: `${input}`
			}, {
				role: "assistant",
				content: `${output}`
			}];
			await this.mem0Client.add(messages, {
				user_id: this.sessionId,
				...this.memoryOptions
			});
		} catch (error) {
			console.error("Error saving memory context:", error);
		}
		await super.saveContext(inputValues, outputValues);
	}
	/**
	* Clears all memories for the current session
	* @returns Promise resolving when memories have been cleared
	*/
	async clear() {
		await super.clear();
	}
};

//#endregion
exports.Mem0Memory = Mem0Memory;
exports.condenseMem0MemoryIntoHumanMessage = condenseMem0MemoryIntoHumanMessage;
exports.mem0MemoryContextToSystemPrompt = mem0MemoryContextToSystemPrompt;
exports.mem0MemoryToMessages = mem0MemoryToMessages;
Object.defineProperty(exports, 'mem0_exports', {
  enumerable: true,
  get: function () {
    return mem0_exports;
  }
});
//# sourceMappingURL=mem0.cjs.map