const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_base = require('./base.cjs');
const require_llm_chain = require('./llm_chain.cjs');
const require_load = require('./question_answering/load.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/chains/chat_vector_db_chain.ts
const question_generator_template = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;
const qa_template = `Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

{context}

Question: {question}
Helpful Answer:`;
/** @deprecated use `ConversationalRetrievalQAChain` instead. */
var ChatVectorDBQAChain = class ChatVectorDBQAChain extends require_base.BaseChain {
	k = 4;
	inputKey = "question";
	chatHistoryKey = "chat_history";
	get inputKeys() {
		return [this.inputKey, this.chatHistoryKey];
	}
	outputKey = "result";
	get outputKeys() {
		return [this.outputKey];
	}
	vectorstore;
	combineDocumentsChain;
	questionGeneratorChain;
	returnSourceDocuments = false;
	constructor(fields) {
		super(fields);
		this.vectorstore = fields.vectorstore;
		this.combineDocumentsChain = fields.combineDocumentsChain;
		this.questionGeneratorChain = fields.questionGeneratorChain;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.outputKey = fields.outputKey ?? this.outputKey;
		this.k = fields.k ?? this.k;
		this.returnSourceDocuments = fields.returnSourceDocuments ?? this.returnSourceDocuments;
	}
	/** @ignore */
	async _call(values, runManager) {
		if (!(this.inputKey in values)) throw new Error(`Question key ${this.inputKey} not found.`);
		if (!(this.chatHistoryKey in values)) throw new Error(`chat history key ${this.inputKey} not found.`);
		const question = values[this.inputKey];
		const chatHistory = values[this.chatHistoryKey];
		let newQuestion = question;
		if (chatHistory.length > 0) {
			const result$1 = await this.questionGeneratorChain.call({
				question,
				chat_history: chatHistory
			}, runManager?.getChild("question_generator"));
			const keys = Object.keys(result$1);
			console.log("_call", values, keys);
			if (keys.length === 1) newQuestion = result$1[keys[0]];
			else throw new Error("Return from llm chain has multiple values, only single values supported.");
		}
		const docs = await this.vectorstore.similaritySearch(newQuestion, this.k, void 0, runManager?.getChild("vectorstore"));
		const inputs = {
			question: newQuestion,
			input_documents: docs,
			chat_history: chatHistory
		};
		const result = await this.combineDocumentsChain.call(inputs, runManager?.getChild("combine_documents"));
		if (this.returnSourceDocuments) return {
			...result,
			sourceDocuments: docs
		};
		return result;
	}
	_chainType() {
		return "chat-vector-db";
	}
	static async deserialize(data, values) {
		if (!("vectorstore" in values)) throw new Error(`Need to pass in a vectorstore to deserialize VectorDBQAChain`);
		const { vectorstore } = values;
		return new ChatVectorDBQAChain({
			combineDocumentsChain: await require_base.BaseChain.deserialize(data.combine_documents_chain),
			questionGeneratorChain: await require_llm_chain.LLMChain.deserialize(data.question_generator),
			k: data.k,
			vectorstore
		});
	}
	serialize() {
		return {
			_type: this._chainType(),
			combine_documents_chain: this.combineDocumentsChain.serialize(),
			question_generator: this.questionGeneratorChain.serialize(),
			k: this.k
		};
	}
	/**
	* Creates an instance of ChatVectorDBQAChain using a BaseLanguageModel
	* and other options.
	* @param llm Instance of BaseLanguageModel used to generate a new question.
	* @param vectorstore Instance of VectorStore used for vector operations.
	* @param options (Optional) Additional options for creating the ChatVectorDBQAChain instance.
	* @returns New instance of ChatVectorDBQAChain.
	*/
	static fromLLM(llm, vectorstore, options = {}) {
		const { questionGeneratorTemplate, qaTemplate, verbose,...rest } = options;
		const question_generator_prompt = __langchain_core_prompts.PromptTemplate.fromTemplate(questionGeneratorTemplate || question_generator_template);
		const qa_prompt = __langchain_core_prompts.PromptTemplate.fromTemplate(qaTemplate || qa_template);
		const qaChain = require_load.loadQAStuffChain(llm, {
			prompt: qa_prompt,
			verbose
		});
		const questionGeneratorChain = new require_llm_chain.LLMChain({
			prompt: question_generator_prompt,
			llm,
			verbose
		});
		const instance = new this({
			vectorstore,
			combineDocumentsChain: qaChain,
			questionGeneratorChain,
			...rest
		});
		return instance;
	}
};

//#endregion
exports.ChatVectorDBQAChain = ChatVectorDBQAChain;
//# sourceMappingURL=chat_vector_db_chain.cjs.map