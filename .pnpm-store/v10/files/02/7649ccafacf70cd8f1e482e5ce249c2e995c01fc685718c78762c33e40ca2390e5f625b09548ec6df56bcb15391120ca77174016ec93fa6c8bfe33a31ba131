import { LLMChain } from "../chains/llm_chain.js";
import { ENTITY_EXTRACTION_PROMPT, ENTITY_SUMMARIZATION_PROMPT } from "./prompt.js";
import { BaseChatMemory } from "./chat_memory.js";
import { InMemoryEntityStore } from "./stores/entity/in_memory.js";
import { getBufferString } from "@langchain/core/messages";
import { getPromptInputKey } from "@langchain/core/memory";

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
var EntityMemory = class extends BaseChatMemory {
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
		this.entityExtractionChain = new LLMChain({
			llm: this.llm,
			prompt: fields.entityExtractionPrompt ?? ENTITY_EXTRACTION_PROMPT
		});
		this.entitySummarizationChain = new LLMChain({
			llm: this.llm,
			prompt: fields.entitySummarizationPrompt ?? ENTITY_SUMMARIZATION_PROMPT
		});
		this.entityStore = fields.entityStore ?? new InMemoryEntityStore();
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
		const promptInputKey = this.inputKey ?? getPromptInputKey(inputs, this.memoryVariables);
		const messages = await this.chatHistory.getMessages();
		const serializedMessages = getBufferString(messages.slice(-this.k * 2), this.humanPrefix, this.aiPrefix);
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
		const promptInputKey = this.inputKey ?? getPromptInputKey(inputs, this.memoryVariables);
		const messages = await this.chatHistory.getMessages();
		const serializedMessages = getBufferString(messages.slice(-this.k * 2), this.humanPrefix, this.aiPrefix);
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
export { EntityMemory };
//# sourceMappingURL=entity_memory.js.map