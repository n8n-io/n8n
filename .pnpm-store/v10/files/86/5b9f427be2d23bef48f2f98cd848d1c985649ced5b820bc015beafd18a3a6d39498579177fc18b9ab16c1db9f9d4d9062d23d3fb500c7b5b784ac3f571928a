const require_base = require('./base.cjs');
const require_load = require('./question_answering/load.cjs');

//#region src/chains/retrieval_qa.ts
/**
* Class representing a chain for performing question-answering tasks with
* a retrieval component.
* @example
* ```typescript
* import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
* import { ChatPromptTemplate } from "@langchain/core/prompts";
* import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
* import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
*
* const documents = [...your documents here];
* const embeddings = ...your embeddings model;
* const llm = ...your LLM model;
*
* const vectorstore = await MemoryVectorStore.fromDocuments(
*   documents,
*   embeddings
* );
* const prompt = ChatPromptTemplate.fromTemplate(`Answer the user's question: {input} based on the following context {context}`);
*
* const combineDocsChain = await createStuffDocumentsChain({
*   llm,
*   prompt,
* });
* const retriever = vectorstore.asRetriever();
*
* const retrievalChain = await createRetrievalChain({
*   combineDocsChain,
*   retriever,
* });
* ```
*/
var RetrievalQAChain = class extends require_base.BaseChain {
	static lc_name() {
		return "RetrievalQAChain";
	}
	inputKey = "query";
	get inputKeys() {
		return [this.inputKey];
	}
	get outputKeys() {
		return this.combineDocumentsChain.outputKeys.concat(this.returnSourceDocuments ? ["sourceDocuments"] : []);
	}
	retriever;
	combineDocumentsChain;
	returnSourceDocuments = false;
	constructor(fields) {
		super(fields);
		this.retriever = fields.retriever;
		this.combineDocumentsChain = fields.combineDocumentsChain;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.returnSourceDocuments = fields.returnSourceDocuments ?? this.returnSourceDocuments;
	}
	/** @ignore */
	async _call(values, runManager) {
		if (!(this.inputKey in values)) throw new Error(`Question key "${this.inputKey}" not found.`);
		const question = values[this.inputKey];
		const docs = await this.retriever.invoke(question, runManager?.getChild("retriever"));
		const inputs = {
			question,
			input_documents: docs,
			...values
		};
		const result = await this.combineDocumentsChain.call(inputs, runManager?.getChild("combine_documents"));
		if (this.returnSourceDocuments) return {
			...result,
			sourceDocuments: docs
		};
		return result;
	}
	_chainType() {
		return "retrieval_qa";
	}
	static async deserialize(_data, _values) {
		throw new Error("Not implemented");
	}
	serialize() {
		throw new Error("Not implemented");
	}
	/**
	* Creates a new instance of RetrievalQAChain using a BaseLanguageModel
	* and a BaseRetriever.
	* @param llm The BaseLanguageModel used to generate a new question.
	* @param retriever The BaseRetriever used to retrieve relevant documents.
	* @param options Optional parameters for the RetrievalQAChain.
	* @returns A new instance of RetrievalQAChain.
	*/
	static fromLLM(llm, retriever, options) {
		const qaChain = require_load.loadQAStuffChain(llm, { prompt: options?.prompt });
		return new this({
			...options,
			retriever,
			combineDocumentsChain: qaChain
		});
	}
};

//#endregion
exports.RetrievalQAChain = RetrievalQAChain;
//# sourceMappingURL=retrieval_qa.cjs.map