const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_memory_chat_memory = require('../../../memory/chat_memory.cjs');
const require_index = require('../../openai_functions/index.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_memory = require_rolldown_runtime.__toESM(require("@langchain/core/memory"));

//#region src/agents/toolkits/conversational_retrieval/token_buffer_memory.ts
/**
* Memory used to save agent output and intermediate steps.
*/
var OpenAIAgentTokenBufferMemory = class extends require_memory_chat_memory.BaseChatMemory {
	humanPrefix = "Human";
	aiPrefix = "AI";
	llm;
	memoryKey = "history";
	maxTokenLimit = 12e3;
	returnMessages = true;
	outputKey = "output";
	intermediateStepsKey = "intermediateSteps";
	constructor(fields) {
		super(fields);
		this.humanPrefix = fields.humanPrefix ?? this.humanPrefix;
		this.aiPrefix = fields.aiPrefix ?? this.aiPrefix;
		this.llm = fields.llm;
		this.memoryKey = fields.memoryKey ?? this.memoryKey;
		this.maxTokenLimit = fields.maxTokenLimit ?? this.maxTokenLimit;
		this.returnMessages = fields.returnMessages ?? this.returnMessages;
		this.outputKey = fields.outputKey ?? this.outputKey;
		this.intermediateStepsKey = fields.intermediateStepsKey ?? this.intermediateStepsKey;
	}
	get memoryKeys() {
		return [this.memoryKey];
	}
	/**
	* Retrieves the messages from the chat history.
	* @returns Promise that resolves with the messages from the chat history.
	*/
	async getMessages() {
		return this.chatHistory.getMessages();
	}
	/**
	* Loads memory variables from the input values.
	* @param _values Input values.
	* @returns Promise that resolves with the loaded memory variables.
	*/
	async loadMemoryVariables(_values) {
		const buffer = await this.getMessages();
		if (this.returnMessages) return { [this.memoryKey]: buffer };
		else {
			const bufferString = (0, __langchain_core_messages.getBufferString)(buffer, this.humanPrefix, this.aiPrefix);
			return { [this.memoryKey]: bufferString };
		}
	}
	/**
	* Saves the context of the chat, including user input, AI output, and
	* intermediate steps. Prunes the chat history if the total token count
	* exceeds the maximum limit.
	* @param inputValues Input values.
	* @param outputValues Output values.
	* @returns Promise that resolves when the context has been saved.
	*/
	async saveContext(inputValues, outputValues) {
		const inputValue = (0, __langchain_core_memory.getInputValue)(inputValues, this.inputKey);
		const outputValue = (0, __langchain_core_memory.getOutputValue)(outputValues, this.outputKey);
		await this.chatHistory.addUserMessage(inputValue);
		const intermediateStepMessages = require_index._formatIntermediateSteps(outputValues[this.intermediateStepsKey]);
		for (const message of intermediateStepMessages) await this.chatHistory.addMessage(message);
		await this.chatHistory.addAIMessage(outputValue);
		const currentMessages = await this.chatHistory.getMessages();
		let tokenInfo = await this.llm.getNumTokensFromMessages(currentMessages);
		if (tokenInfo.totalCount > this.maxTokenLimit) {
			const prunedMemory = [];
			while (tokenInfo.totalCount > this.maxTokenLimit) {
				const retainedMessage = currentMessages.pop();
				if (!retainedMessage) {
					console.warn(`Could not prune enough messages from chat history to stay under ${this.maxTokenLimit} tokens.`);
					break;
				}
				prunedMemory.push(retainedMessage);
				tokenInfo = await this.llm.getNumTokensFromMessages(currentMessages);
			}
			await this.chatHistory.clear();
			for (const message of prunedMemory) await this.chatHistory.addMessage(message);
		}
	}
};

//#endregion
exports.OpenAIAgentTokenBufferMemory = OpenAIAgentTokenBufferMemory;
//# sourceMappingURL=token_buffer_memory.cjs.map