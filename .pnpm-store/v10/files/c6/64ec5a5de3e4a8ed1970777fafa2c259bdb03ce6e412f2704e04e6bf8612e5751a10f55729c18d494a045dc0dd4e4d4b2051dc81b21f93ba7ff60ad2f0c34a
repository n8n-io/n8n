import { BaseChain } from "./base.js";
import { LLMChain } from "./llm_chain.js";
import { loadQAChain } from "./question_answering/load.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

//#region src/chains/conversational_retrieval_chain.ts
const question_generator_template = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;
/**
* Class for conducting conversational question-answering tasks with a
* retrieval component. Extends the BaseChain class and implements the
* ConversationalRetrievalQAChainInput interface.
* @example
* ```typescript
* import { ChatAnthropic } from "@langchain/anthropic";
* import {
*   ChatPromptTemplate,
*   MessagesPlaceholder,
* } from "@langchain/core/prompts";
* import { BaseMessage } from "@langchain/core/messages";
* import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
* import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever";
* import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
*
* const retriever = ...your retriever;
* const llm = new ChatAnthropic();
*
* // Contextualize question
* const contextualizeQSystemPrompt = `
* Given a chat history and the latest user question
* which might reference context in the chat history,
* formulate a standalone question which can be understood
* without the chat history. Do NOT answer the question, just
* reformulate it if needed and otherwise return it as is.`;
* const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
*   ["system", contextualizeQSystemPrompt],
*   new MessagesPlaceholder("chat_history"),
*   ["human", "{input}"],
* ]);
* const historyAwareRetriever = await createHistoryAwareRetriever({
*   llm,
*   retriever,
*   rephrasePrompt: contextualizeQPrompt,
* });
*
* // Answer question
* const qaSystemPrompt = `
* You are an assistant for question-answering tasks. Use
* the following pieces of retrieved context to answer the
* question. If you don't know the answer, just say that you
* don't know. Use three sentences maximum and keep the answer
* concise.
* \n\n
* {context}`;
* const qaPrompt = ChatPromptTemplate.fromMessages([
*   ["system", qaSystemPrompt],
*   new MessagesPlaceholder("chat_history"),
*   ["human", "{input}"],
* ]);
*
* // Below we use createStuffDocuments_chain to feed all retrieved context
* // into the LLM. Note that we can also use StuffDocumentsChain and other
* // instances of BaseCombineDocumentsChain.
* const questionAnswerChain = await createStuffDocumentsChain({
*   llm,
*   prompt: qaPrompt,
* });
*
* const ragChain = await createRetrievalChain({
*   retriever: historyAwareRetriever,
*   combineDocsChain: questionAnswerChain,
* });
*
* // Usage:
* const chat_history: BaseMessage[] = [];
* const response = await ragChain.invoke({
*   chat_history,
*   input: "...",
* });
* ```
*/
var ConversationalRetrievalQAChain = class ConversationalRetrievalQAChain extends BaseChain {
	static lc_name() {
		return "ConversationalRetrievalQAChain";
	}
	inputKey = "question";
	chatHistoryKey = "chat_history";
	get inputKeys() {
		return [this.inputKey, this.chatHistoryKey];
	}
	get outputKeys() {
		return this.combineDocumentsChain.outputKeys.concat(this.returnSourceDocuments ? ["sourceDocuments"] : []);
	}
	retriever;
	combineDocumentsChain;
	questionGeneratorChain;
	returnSourceDocuments = false;
	returnGeneratedQuestion = false;
	constructor(fields) {
		super(fields);
		this.retriever = fields.retriever;
		this.combineDocumentsChain = fields.combineDocumentsChain;
		this.questionGeneratorChain = fields.questionGeneratorChain;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.returnSourceDocuments = fields.returnSourceDocuments ?? this.returnSourceDocuments;
		this.returnGeneratedQuestion = fields.returnGeneratedQuestion ?? this.returnGeneratedQuestion;
	}
	/**
	* Static method to convert the chat history input into a formatted
	* string.
	* @param chatHistory Chat history input which can be a string, an array of BaseMessage instances, or an array of string arrays.
	* @returns A formatted string representing the chat history.
	*/
	static getChatHistoryString(chatHistory) {
		let historyMessages;
		if (Array.isArray(chatHistory)) {
			if (Array.isArray(chatHistory[0]) && typeof chatHistory[0][0] === "string") {
				console.warn("Passing chat history as an array of strings is deprecated.\nPlease see https://js.langchain.com/docs/modules/chains/popular/chat_vector_db#externally-managed-memory for more information.");
				historyMessages = chatHistory.flat().map((stringMessage, i) => {
					if (i % 2 === 0) return new HumanMessage(stringMessage);
					else return new AIMessage(stringMessage);
				});
			} else historyMessages = chatHistory;
			return historyMessages.map((chatMessage) => {
				if (chatMessage._getType() === "human") return `Human: ${chatMessage.content}`;
				else if (chatMessage._getType() === "ai") return `Assistant: ${chatMessage.content}`;
				else return `${chatMessage.content}`;
			}).join("\n");
		}
		return chatHistory;
	}
	/** @ignore */
	async _call(values, runManager) {
		if (!(this.inputKey in values)) throw new Error(`Question key ${this.inputKey} not found.`);
		if (!(this.chatHistoryKey in values)) throw new Error(`Chat history key ${this.chatHistoryKey} not found.`);
		const question = values[this.inputKey];
		const chatHistory = ConversationalRetrievalQAChain.getChatHistoryString(values[this.chatHistoryKey]);
		let newQuestion = question;
		if (chatHistory.length > 0) {
			const result$1 = await this.questionGeneratorChain.call({
				question,
				chat_history: chatHistory
			}, runManager?.getChild("question_generator"));
			const keys = Object.keys(result$1);
			if (keys.length === 1) newQuestion = result$1[keys[0]];
			else throw new Error("Return from llm chain has multiple values, only single values supported.");
		}
		const docs = await this.retriever.invoke(newQuestion, runManager?.getChild("retriever"));
		const inputs = {
			question: newQuestion,
			input_documents: docs,
			chat_history: chatHistory
		};
		let result = await this.combineDocumentsChain.call(inputs, runManager?.getChild("combine_documents"));
		if (this.returnSourceDocuments) result = {
			...result,
			sourceDocuments: docs
		};
		if (this.returnGeneratedQuestion) result = {
			...result,
			generatedQuestion: newQuestion
		};
		return result;
	}
	_chainType() {
		return "conversational_retrieval_chain";
	}
	static async deserialize(_data, _values) {
		throw new Error("Not implemented.");
	}
	serialize() {
		throw new Error("Not implemented.");
	}
	/**
	* Static method to create a new ConversationalRetrievalQAChain from a
	* BaseLanguageModel and a BaseRetriever.
	* @param llm {@link BaseLanguageModelInterface} instance used to generate a new question.
	* @param retriever {@link BaseRetrieverInterface} instance used to retrieve relevant documents.
	* @param options.returnSourceDocuments Whether to return source documents in the final output
	* @param options.questionGeneratorChainOptions Options to initialize the standalone question generation chain used as the first internal step
	* @param options.qaChainOptions {@link QAChainParams} used to initialize the QA chain used as the second internal step
	* @returns A new instance of ConversationalRetrievalQAChain.
	*/
	static fromLLM(llm, retriever, options = {}) {
		const { questionGeneratorTemplate, qaTemplate, qaChainOptions = {
			type: "stuff",
			prompt: qaTemplate ? PromptTemplate.fromTemplate(qaTemplate) : void 0
		}, questionGeneratorChainOptions, verbose,...rest } = options;
		const qaChain = loadQAChain(llm, qaChainOptions);
		const questionGeneratorChainPrompt = PromptTemplate.fromTemplate(questionGeneratorChainOptions?.template ?? questionGeneratorTemplate ?? question_generator_template);
		const questionGeneratorChain = new LLMChain({
			prompt: questionGeneratorChainPrompt,
			llm: questionGeneratorChainOptions?.llm ?? llm,
			verbose
		});
		const instance = new this({
			retriever,
			combineDocumentsChain: qaChain,
			questionGeneratorChain,
			verbose,
			...rest
		});
		return instance;
	}
};

//#endregion
export { ConversationalRetrievalQAChain };
//# sourceMappingURL=conversational_retrieval_chain.js.map