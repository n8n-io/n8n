const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../chains/llm_chain.cjs');
const require_prompt = require('./prompt.cjs');
const require_memory_chat_memory = require('./chat_memory.cjs');
const require_in_memory = require('./stores/entity/in_memory.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_memory = require_rolldown_runtime.__toESM(require("@langchain/core/memory"));

//#region src/memory/entity_memory.ts
/**
* Class for managing entity extraction and summarization to memory in
* chatbot applications. Extends the BaseChatMemory class and implements
* the EntityMemoryInput interface.
* @example
* ```typescript
* const memory = new EntityMemory({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
*   chatHistoryKey: "history",
*   entitiesKey: "entities",
* });
* const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 });
* const chain = new LLMChain({
*   llm: model,
*   prompt: ENTITY_MEMORY_CONVERSATION_TEMPLATE,
*   memory,
* });
*
* const res1 = await chain.call({ input: "Hi! I'm Jim." });
* console.log({
*   res1,
*   memory: await memory.loadMemoryVariables({ input: "Who is Jim?" }),
* });
*
* const res2 = await chain.call({
*   input: "I work in construction. What about you?",
* });
* console.log({
*   res2,
*   memory: await memory.loadMemoryVariables({ input: "Who is Jim?" }),
* });
*
* ```
*/
var EntityMemory = class extends require_memory_chat_memory.BaseChatMemory {
	entityExtractionChain;
	entitySummarizationChain;
	entityStore;
	entityCache = [];
	k = 3;
	chatHistoryKey = "history";
	llm;
	entitiesKey = "entities";
	humanPrefix;
	aiPrefix;
	constructor(fields) {
		super({
			chatHistory: fields.chatHistory,
			returnMessages: fields.returnMessages ?? false,
			inputKey: fields.inputKey,
			outputKey: fields.outputKey
		});
		this.llm = fields.llm;
		this.humanPrefix = fields.humanPrefix;
		this.aiPrefix = fields.aiPrefix;
		this.chatHistoryKey = fields.chatHistoryKey ?? this.chatHistoryKey;
		this.entitiesKey = fields.entitiesKey ?? this.entitiesKey;
		this.entityExtractionChain = new require_llm_chain.LLMChain({
			llm: this.llm,
			prompt: fields.entityExtractionPrompt ?? require_prompt.ENTITY_EXTRACTION_PROMPT
		});
		this.entitySummarizationChain = new require_llm_chain.LLMChain({
			llm: this.llm,
			prompt: fields.entitySummarizationPrompt ?? require_prompt.ENTITY_SUMMARIZATION_PROMPT
		});
		this.entityStore = fields.entityStore ?? new require_in_memory.InMemoryEntityStore();
		this.entityCache = fields.entityCache ?? this.entityCache;
		this.k = fields.k ?? this.k;
	}
	get memoryKeys() {
		return [this.chatHistoryKey];
	}
	get memoryVariables() {
		return [this.entitiesKey, this.chatHistoryKey];
	}
	/**
	* Method to load memory variables and perform entity extraction.
	* @param inputs Input values for the method.
	* @returns Promise resolving to an object containing memory variables.
	*/
	async loadMemoryVariables(inputs) {
		const promptInputKey = this.inputKey ?? (0, __langchain_core_memory.getPromptInputKey)(inputs, this.memoryVariables);
		const messages = await this.chatHistory.getMessages();
		const serializedMessages = (0, __langchain_core_messages.getBufferString)(messages.slice(-this.k * 2), this.humanPrefix, this.aiPrefix);
		const output = await this.entityExtractionChain.predict({
			history: serializedMessages,
			input: inputs[promptInputKey]
		});
		const entities = output.trim() === "NONE" ? [] : output.split(",").map((w) => w.trim());
		const entitySummaries = {};
		for (const entity of entities) entitySummaries[entity] = await this.entityStore.get(entity, "No current information known.");
		this.entityCache = [...entities];
		const buffer = this.returnMessages ? messages.slice(-this.k * 2) : serializedMessages;
		return {
			[this.chatHistoryKey]: buffer,
			[this.entitiesKey]: entitySummaries
		};
	}
	/**
	* Method to save the context from a conversation to a buffer and perform
	* entity summarization.
	* @param inputs Input values for the method.
	* @param outputs Output values from the method.
	* @returns Promise resolving to void.
	*/
	async saveContext(inputs, outputs) {
		await super.saveContext(inputs, outputs);
		const promptInputKey = this.inputKey ?? (0, __langchain_core_memory.getPromptInputKey)(inputs, this.memoryVariables);
		const messages = await this.chatHistory.getMessages();
		const serializedMessages = (0, __langchain_core_messages.getBufferString)(messages.slice(-this.k * 2), this.humanPrefix, this.aiPrefix);
		const inputData = inputs[promptInputKey];
		for (const entity of this.entityCache) {
			const existingSummary = await this.entityStore.get(entity, "No current information known.");
			const output = await this.entitySummarizationChain.predict({
				summary: existingSummary,
				entity,
				history: serializedMessages,
				input: inputData
			});
			if (output.trim() !== "UNCHANGED") await this.entityStore.set(entity, output.trim());
		}
	}
	/**
	* Method to clear the memory contents.
	* @returns Promise resolving to void.
	*/
	async clear() {
		await super.clear();
		await this.entityStore.clear();
	}
};

//#endregion
exports.EntityMemory = EntityMemory;
//# sourceMappingURL=entity_memory.cjs.map