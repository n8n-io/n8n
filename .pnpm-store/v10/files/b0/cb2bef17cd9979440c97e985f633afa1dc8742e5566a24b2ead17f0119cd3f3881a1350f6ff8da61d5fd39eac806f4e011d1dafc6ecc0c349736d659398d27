const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../chains/llm_chain.cjs');
const require_prompt = require('./prompt.cjs');
const require_memory_chat_memory = require('./chat_memory.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/memory/summary.ts
/**
* Abstract class that provides a structure for storing and managing the
* memory of a conversation. It includes methods for predicting a new
* summary for the conversation given the existing messages and summary.
*/
var BaseConversationSummaryMemory = class extends require_memory_chat_memory.BaseChatMemory {
	memoryKey = "history";
	humanPrefix = "Human";
	aiPrefix = "AI";
	llm;
	prompt = require_prompt.SUMMARY_PROMPT;
	summaryChatMessageClass = __langchain_core_messages.SystemMessage;
	constructor(fields) {
		const { returnMessages, inputKey, outputKey, chatHistory, humanPrefix, aiPrefix, llm, prompt, summaryChatMessageClass } = fields;
		super({
			returnMessages,
			inputKey,
			outputKey,
			chatHistory
		});
		this.memoryKey = fields?.memoryKey ?? this.memoryKey;
		this.humanPrefix = humanPrefix ?? this.humanPrefix;
		this.aiPrefix = aiPrefix ?? this.aiPrefix;
		this.llm = llm;
		this.prompt = prompt ?? this.prompt;
		this.summaryChatMessageClass = summaryChatMessageClass ?? this.summaryChatMessageClass;
	}
	/**
	* Predicts a new summary for the conversation given the existing messages
	* and summary.
	* @param messages Existing messages in the conversation.
	* @param existingSummary Current summary of the conversation.
	* @returns A promise that resolves to a new summary string.
	*/
	async predictNewSummary(messages, existingSummary) {
		const newLines = (0, __langchain_core_messages.getBufferString)(messages, this.humanPrefix, this.aiPrefix);
		const chain = new require_llm_chain.LLMChain({
			llm: this.llm,
			prompt: this.prompt
		});
		return await chain.predict({
			summary: existingSummary,
			new_lines: newLines
		});
	}
};
/**
* Class that provides a concrete implementation of the conversation
* memory. It includes methods for loading memory variables, saving
* context, and clearing the memory.
* @example
* ```typescript
* const memory = new ConversationSummaryMemory({
*   memoryKey: "chat_history",
*   llm: new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 }),
* });
*
* const model = new ChatOpenAI({ model: "gpt-4o-mini" });
* const prompt =
*   PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.
*
* Current conversation:
* {chat_history}
* Human: {input}
* AI:`);
* const chain = new LLMChain({ llm: model, prompt, memory });
*
* const res1 = await chain.call({ input: "Hi! I'm Jim." });
* console.log({ res1, memory: await memory.loadMemoryVariables({}) });
*
* const res2 = await chain.call({ input: "What's my name?" });
* console.log({ res2, memory: await memory.loadMemoryVariables({}) });
*
* ```
*/
var ConversationSummaryMemory = class extends BaseConversationSummaryMemory {
	buffer = "";
	constructor(fields) {
		super(fields);
	}
	get memoryKeys() {
		return [this.memoryKey];
	}
	/**
	* Loads the memory variables for the conversation memory.
	* @returns A promise that resolves to an object containing the memory variables.
	*/
	async loadMemoryVariables(_) {
		if (this.returnMessages) {
			const result$1 = { [this.memoryKey]: [new this.summaryChatMessageClass(this.buffer)] };
			return result$1;
		}
		const result = { [this.memoryKey]: this.buffer };
		return result;
	}
	/**
	* Saves the context of the conversation memory.
	* @param inputValues Input values for the conversation.
	* @param outputValues Output values from the conversation.
	* @returns A promise that resolves when the context has been saved.
	*/
	async saveContext(inputValues, outputValues) {
		await super.saveContext(inputValues, outputValues);
		const messages = await this.chatHistory.getMessages();
		this.buffer = await this.predictNewSummary(messages.slice(-2), this.buffer);
	}
	/**
	* Clears the conversation memory.
	* @returns A promise that resolves when the memory has been cleared.
	*/
	async clear() {
		await super.clear();
		this.buffer = "";
	}
};

//#endregion
exports.BaseConversationSummaryMemory = BaseConversationSummaryMemory;
exports.ConversationSummaryMemory = ConversationSummaryMemory;
//# sourceMappingURL=summary.cjs.map