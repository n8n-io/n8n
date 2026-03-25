const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_memory_chat_memory = require('./chat_memory.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/memory/buffer_token_memory.ts
/**
* Class that represents a conversation chat memory with a token buffer.
* It extends the `BaseChatMemory` class and implements the
* `ConversationTokenBufferMemoryInput` interface.
* @example
* ```typescript
* const memory = new ConversationTokenBufferMemory({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   maxTokenLimit: 10,
* });
*
* // Save conversation context
* await memory.saveContext({ input: "hi" }, { output: "whats up" });
* await memory.saveContext({ input: "not much you" }, { output: "not much" });
*
* // Load memory variables
* const result = await memory.loadMemoryVariables({});
* console.log(result);
* ```
*/
var ConversationTokenBufferMemory = class extends require_memory_chat_memory.BaseChatMemory {
	humanPrefix = "Human";
	aiPrefix = "AI";
	memoryKey = "history";
	maxTokenLimit = 2e3;
	llm;
	constructor(fields) {
		super(fields);
		this.llm = fields.llm;
		this.humanPrefix = fields?.humanPrefix ?? this.humanPrefix;
		this.aiPrefix = fields?.aiPrefix ?? this.aiPrefix;
		this.memoryKey = fields?.memoryKey ?? this.memoryKey;
		this.maxTokenLimit = fields?.maxTokenLimit ?? this.maxTokenLimit;
	}
	get memoryKeys() {
		return [this.memoryKey];
	}
	/**
	* Loads the memory variables. It takes an `InputValues` object as a
	* parameter and returns a `Promise` that resolves with a
	* `MemoryVariables` object.
	* @param _values `InputValues` object.
	* @returns A `Promise` that resolves with a `MemoryVariables` object.
	*/
	async loadMemoryVariables(_values) {
		const messages = await this.chatHistory.getMessages();
		if (this.returnMessages) {
			const result$1 = { [this.memoryKey]: messages };
			return result$1;
		}
		const result = { [this.memoryKey]: (0, __langchain_core_messages.getBufferString)(messages, this.humanPrefix, this.aiPrefix) };
		return result;
	}
	/**
	* Saves the context from this conversation to buffer. If the amount
	* of tokens required to save the buffer exceeds MAX_TOKEN_LIMIT,
	* prune it.
	*/
	async saveContext(inputValues, outputValues) {
		await super.saveContext(inputValues, outputValues);
		const buffer = await this.chatHistory.getMessages();
		let currBufferLength = await this.llm.getNumTokens((0, __langchain_core_messages.getBufferString)(buffer, this.humanPrefix, this.aiPrefix));
		if (currBufferLength > this.maxTokenLimit) {
			const prunedMemory = [];
			while (currBufferLength > this.maxTokenLimit) {
				prunedMemory.push(buffer.shift());
				currBufferLength = await this.llm.getNumTokens((0, __langchain_core_messages.getBufferString)(buffer, this.humanPrefix, this.aiPrefix));
			}
		}
	}
};

//#endregion
exports.ConversationTokenBufferMemory = ConversationTokenBufferMemory;
//# sourceMappingURL=buffer_token_memory.cjs.map