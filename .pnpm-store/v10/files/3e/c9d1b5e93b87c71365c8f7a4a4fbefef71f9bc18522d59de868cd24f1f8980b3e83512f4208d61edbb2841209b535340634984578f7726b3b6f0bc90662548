const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_summary = require('./summary.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/memory/summary_buffer.ts
/**
* Class that extends BaseConversationSummaryMemory and implements
* ConversationSummaryBufferMemoryInput. It manages the conversation
* history in a LangChain application by maintaining a buffer of chat
* messages and providing methods to load, save, prune, and clear the
* memory.
* @example
* ```typescript
* // Initialize the memory with a specific model and token limit
* const memory = new ConversationSummaryBufferMemory({
*   llm: new ChatOpenAI({ model: "gpt-3.5-turbo-instruct", temperature: 0 }),
*   maxTokenLimit: 10,
* });
*
* // Save conversation context to memory
* await memory.saveContext({ input: "hi" }, { output: "whats up" });
* await memory.saveContext({ input: "not much you" }, { output: "not much" });
*
* // Load the conversation history from memory
* const history = await memory.loadMemoryVariables({});
* console.log({ history });
*
* // Create a chat prompt using the conversation history
* const chatPrompt = ChatPromptTemplate.fromMessages([
*   SystemMessagePromptTemplate.fromTemplate(
*     "The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.",
*   ),
*   new MessagesPlaceholder("history"),
*   HumanMessagePromptTemplate.fromTemplate("{input}"),
* ]);
*
* // Initialize the conversation chain with the model, memory, and prompt
* const chain = new ConversationChain({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9, verbose: true }),
*   memory: memory,
*   prompt: chatPrompt,
* });
* ```
*/
var ConversationSummaryBufferMemory = class extends require_summary.BaseConversationSummaryMemory {
	movingSummaryBuffer = "";
	maxTokenLimit = 2e3;
	constructor(fields) {
		super(fields);
		this.maxTokenLimit = fields?.maxTokenLimit ?? this.maxTokenLimit;
	}
	get memoryKeys() {
		return [this.memoryKey];
	}
	/**
	* Method that loads the chat messages from the memory and returns them as
	* a string or as a list of messages, depending on the returnMessages
	* property.
	* @param _ InputValues object, not used in this method.
	* @returns Promise that resolves with MemoryVariables object containing the loaded chat messages.
	*/
	async loadMemoryVariables(_) {
		let buffer = await this.chatHistory.getMessages();
		if (this.movingSummaryBuffer) buffer = [new this.summaryChatMessageClass(this.movingSummaryBuffer), ...buffer];
		let finalBuffer;
		if (this.returnMessages) finalBuffer = buffer;
		else finalBuffer = (0, __langchain_core_messages.getBufferString)(buffer, this.humanPrefix, this.aiPrefix);
		return { [this.memoryKey]: finalBuffer };
	}
	/**
	* Method that saves the context of the conversation, including the input
	* and output values, and prunes the memory if it exceeds the maximum
	* token limit.
	* @param inputValues InputValues object containing the input values of the conversation.
	* @param outputValues OutputValues object containing the output values of the conversation.
	* @returns Promise that resolves when the context is saved and the memory is pruned.
	*/
	async saveContext(inputValues, outputValues) {
		await super.saveContext(inputValues, outputValues);
		await this.prune();
	}
	/**
	* Method that prunes the memory if the total number of tokens in the
	* buffer exceeds the maxTokenLimit. It removes messages from the
	* beginning of the buffer until the total number of tokens is within the
	* limit.
	* @returns Promise that resolves when the memory is pruned.
	*/
	async prune() {
		let buffer = await this.chatHistory.getMessages();
		if (this.movingSummaryBuffer) buffer = [new this.summaryChatMessageClass(this.movingSummaryBuffer), ...buffer];
		let currBufferLength = await this.llm.getNumTokens((0, __langchain_core_messages.getBufferString)(buffer, this.humanPrefix, this.aiPrefix));
		if (currBufferLength > this.maxTokenLimit) {
			const prunedMemory = [];
			while (currBufferLength > this.maxTokenLimit) {
				const poppedMessage = buffer.shift();
				if (poppedMessage) {
					prunedMemory.push(poppedMessage);
					currBufferLength = await this.llm.getNumTokens((0, __langchain_core_messages.getBufferString)(buffer, this.humanPrefix, this.aiPrefix));
				}
			}
			this.movingSummaryBuffer = await this.predictNewSummary(prunedMemory, this.movingSummaryBuffer);
		}
	}
	/**
	* Method that clears the memory and resets the movingSummaryBuffer.
	* @returns Promise that resolves when the memory is cleared.
	*/
	async clear() {
		await super.clear();
		this.movingSummaryBuffer = "";
	}
};

//#endregion
exports.ConversationSummaryBufferMemory = ConversationSummaryBufferMemory;
//# sourceMappingURL=summary_buffer.cjs.map