const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../../chains/llm_chain.cjs');
const require_retrievers_document_compressors_index = require('./index.cjs');
const require_chain_extract_prompt = require('./chain_extract_prompt.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/retrievers/document_compressors/chain_extract.ts
var chain_extract_exports = {};
require_rolldown_runtime.__export(chain_extract_exports, { LLMChainExtractor: () => LLMChainExtractor });
function defaultGetInput(query, doc) {
	return {
		question: query,
		context: doc.pageContent
	};
}
var NoOutputParser = class extends __langchain_core_output_parsers.BaseOutputParser {
	lc_namespace = [
		"langchain",
		"retrievers",
		"document_compressors",
		"chain_extract"
	];
	noOutputStr = "NO_OUTPUT";
	parse(text) {
		const cleanedText = text.trim();
		if (cleanedText === this.noOutputStr) return Promise.resolve("");
		return Promise.resolve(cleanedText);
	}
	getFormatInstructions() {
		throw new Error("Method not implemented.");
	}
};
function getDefaultChainPrompt() {
	const outputParser = new NoOutputParser();
	const template = require_chain_extract_prompt.PROMPT_TEMPLATE(outputParser.noOutputStr);
	return new __langchain_core_prompts.PromptTemplate({
		template,
		inputVariables: ["question", "context"],
		outputParser
	});
}
/**
* A class that uses an LLM chain to extract relevant parts of documents.
* It extends the BaseDocumentCompressor class.
*/
var LLMChainExtractor = class LLMChainExtractor extends require_retrievers_document_compressors_index.BaseDocumentCompressor {
	llmChain;
	getInput = defaultGetInput;
	constructor({ llmChain, getInput }) {
		super();
		this.llmChain = llmChain;
		this.getInput = getInput;
	}
	/**
	* Compresses a list of documents based on the output of an LLM chain.
	* @param documents The list of documents to be compressed.
	* @param query The query to be used for document compression.
	* @returns A list of compressed documents.
	*/
	async compressDocuments(documents, query) {
		const compressedDocs = await Promise.all(documents.map(async (doc) => {
			const input = this.getInput(query, doc);
			const output = await this.llmChain.predict(input);
			return output.length > 0 ? new __langchain_core_documents.Document({
				pageContent: output,
				metadata: doc.metadata
			}) : void 0;
		}));
		return compressedDocs.filter((doc) => doc !== void 0);
	}
	/**
	* Creates a new instance of LLMChainExtractor from a given LLM, prompt
	* template, and getInput function.
	* @param llm The BaseLanguageModel instance used for document extraction.
	* @param prompt The PromptTemplate instance used for document extraction.
	* @param getInput A function used for constructing the chain input from the query and a Document.
	* @returns A new instance of LLMChainExtractor.
	*/
	static fromLLM(llm, prompt, getInput) {
		const _prompt = prompt || getDefaultChainPrompt();
		const _getInput = getInput || defaultGetInput;
		const llmChain = new require_llm_chain.LLMChain({
			llm,
			prompt: _prompt
		});
		return new LLMChainExtractor({
			llmChain,
			getInput: _getInput
		});
	}
};

//#endregion
exports.LLMChainExtractor = LLMChainExtractor;
Object.defineProperty(exports, 'chain_extract_exports', {
  enumerable: true,
  get: function () {
    return chain_extract_exports;
  }
});
//# sourceMappingURL=chain_extract.cjs.map