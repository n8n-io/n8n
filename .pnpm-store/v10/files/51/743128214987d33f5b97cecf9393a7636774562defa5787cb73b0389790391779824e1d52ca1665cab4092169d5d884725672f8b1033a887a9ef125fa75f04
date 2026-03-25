const require_base = require('./base.cjs');
const require_load = require('./question_answering/load.cjs');

//#region src/chains/vector_db_qa.ts
/**
* Class that represents a VectorDBQAChain. It extends the `BaseChain`
* class and implements the `VectorDBQAChainInput` interface. It performs
* a similarity search using a vector store and combines the search
* results using a specified combine documents chain.
*/
var VectorDBQAChain = class VectorDBQAChain extends require_base.BaseChain {
	static lc_name() {
		return "VectorDBQAChain";
	}
	k = 4;
	inputKey = "query";
	get inputKeys() {
		return [this.inputKey];
	}
	get outputKeys() {
		return this.combineDocumentsChain.outputKeys.concat(this.returnSourceDocuments ? ["sourceDocuments"] : []);
	}
	vectorstore;
	combineDocumentsChain;
	returnSourceDocuments = false;
	constructor(fields) {
		super(fields);
		this.vectorstore = fields.vectorstore;
		this.combineDocumentsChain = fields.combineDocumentsChain;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.k = fields.k ?? this.k;
		this.returnSourceDocuments = fields.returnSourceDocuments ?? this.returnSourceDocuments;
	}
	/** @ignore */
	async _call(values, runManager) {
		if (!(this.inputKey in values)) throw new Error(`Question key ${this.inputKey} not found.`);
		const question = values[this.inputKey];
		const docs = await this.vectorstore.similaritySearch(question, this.k, values.filter, runManager?.getChild("vectorstore"));
		const inputs = {
			question,
			input_documents: docs
		};
		const result = await this.combineDocumentsChain.call(inputs, runManager?.getChild("combine_documents"));
		if (this.returnSourceDocuments) return {
			...result,
			sourceDocuments: docs
		};
		return result;
	}
	_chainType() {
		return "vector_db_qa";
	}
	static async deserialize(data, values) {
		if (!("vectorstore" in values)) throw new Error(`Need to pass in a vectorstore to deserialize VectorDBQAChain`);
		const { vectorstore } = values;
		if (!data.combine_documents_chain) throw new Error(`VectorDBQAChain must have combine_documents_chain in serialized data`);
		return new VectorDBQAChain({
			combineDocumentsChain: await require_base.BaseChain.deserialize(data.combine_documents_chain),
			k: data.k,
			vectorstore
		});
	}
	serialize() {
		return {
			_type: this._chainType(),
			combine_documents_chain: this.combineDocumentsChain.serialize(),
			k: this.k
		};
	}
	/**
	* Static method that creates a VectorDBQAChain instance from a
	* BaseLanguageModel and a vector store. It also accepts optional options
	* to customize the chain.
	* @param llm The BaseLanguageModel instance.
	* @param vectorstore The vector store used for similarity search.
	* @param options Optional options to customize the chain.
	* @returns A new instance of VectorDBQAChain.
	*/
	static fromLLM(llm, vectorstore, options) {
		const qaChain = require_load.loadQAStuffChain(llm);
		return new this({
			vectorstore,
			combineDocumentsChain: qaChain,
			...options
		});
	}
};

//#endregion
exports.VectorDBQAChain = VectorDBQAChain;
//# sourceMappingURL=vector_db_qa.cjs.map