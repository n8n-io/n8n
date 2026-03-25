const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../chains/llm_chain.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));
const __langchain_core_retrievers = require_rolldown_runtime.__toESM(require("@langchain/core/retrievers"));

//#region src/retrievers/multi_query.ts
var multi_query_exports = {};
require_rolldown_runtime.__export(multi_query_exports, { MultiQueryRetriever: () => MultiQueryRetriever });
var LineListOutputParser = class extends __langchain_core_output_parsers.BaseOutputParser {
	static lc_name() {
		return "LineListOutputParser";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"multiquery"
	];
	async parse(text) {
		const startKeyIndex = text.indexOf("<questions>");
		const endKeyIndex = text.indexOf("</questions>");
		const questionsStartIndex = startKeyIndex === -1 ? 0 : startKeyIndex + 11;
		const questionsEndIndex = endKeyIndex === -1 ? text.length : endKeyIndex;
		const lines = text.slice(questionsStartIndex, questionsEndIndex).trim().split("\n").filter((line) => line.trim() !== "");
		return { lines };
	}
	getFormatInstructions() {
		throw new Error("Not implemented.");
	}
};
const DEFAULT_QUERY_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	inputVariables: ["question", "queryCount"],
	template: `You are an AI language model assistant. Your task is
to generate {queryCount} different versions of the given user
question to retrieve relevant documents from a vector database.
By generating multiple perspectives on the user question,
your goal is to help the user overcome some of the limitations
of distance-based similarity search.

Provide these alternative questions separated by newlines between XML tags. For example:

<questions>
Question 1
Question 2
Question 3
</questions>

Original question: {question}`
});
/**
* @example
* ```typescript
* const retriever = new MultiQueryRetriever.fromLLM({
*   llm: new ChatAnthropic({}),
*   retriever: new MemoryVectorStore().asRetriever(),
*   verbose: true,
* });
* const retrievedDocs = await retriever.invoke(
*   "What are mitochondria made of?",
* );
* ```
*/
var MultiQueryRetriever = class extends __langchain_core_retrievers.BaseRetriever {
	static lc_name() {
		return "MultiQueryRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"multiquery"
	];
	retriever;
	llmChain;
	queryCount = 3;
	parserKey = "lines";
	documentCompressor;
	documentCompressorFilteringFn;
	constructor(fields) {
		super(fields);
		this.retriever = fields.retriever;
		this.llmChain = fields.llmChain;
		this.queryCount = fields.queryCount ?? this.queryCount;
		this.parserKey = fields.parserKey ?? this.parserKey;
		this.documentCompressor = fields.documentCompressor;
		this.documentCompressorFilteringFn = fields.documentCompressorFilteringFn;
	}
	static fromLLM(fields) {
		const { retriever, llm, prompt = DEFAULT_QUERY_PROMPT, queryCount, parserKey,...rest } = fields;
		const outputParser = new LineListOutputParser();
		const llmChain = new require_llm_chain.LLMChain({
			llm,
			prompt,
			outputParser
		});
		return new this({
			retriever,
			llmChain,
			queryCount,
			parserKey,
			...rest
		});
	}
	async _generateQueries(question, runManager) {
		const response = await this.llmChain.call({
			question,
			queryCount: this.queryCount
		}, runManager?.getChild());
		const lines = response.text[this.parserKey] || [];
		if (this.verbose) console.log(`Generated queries: ${lines}`);
		return lines;
	}
	async _retrieveDocuments(queries, runManager) {
		const documents = [];
		await Promise.all(queries.map(async (query) => {
			const docs = await this.retriever.invoke(query, runManager?.getChild());
			documents.push(...docs);
		}));
		return documents;
	}
	_uniqueUnion(documents) {
		const uniqueDocumentsDict = {};
		for (const doc of documents) {
			const key = `${doc.pageContent}:${JSON.stringify(Object.entries(doc.metadata).sort())}`;
			uniqueDocumentsDict[key] = doc;
		}
		const uniqueDocuments = Object.values(uniqueDocumentsDict);
		return uniqueDocuments;
	}
	async _getRelevantDocuments(question, runManager) {
		const queries = await this._generateQueries(question, runManager);
		const documents = await this._retrieveDocuments(queries, runManager);
		const uniqueDocuments = this._uniqueUnion(documents);
		let outputDocs = uniqueDocuments;
		if (this.documentCompressor && uniqueDocuments.length) {
			outputDocs = await this.documentCompressor.compressDocuments(uniqueDocuments, question, runManager?.getChild());
			if (this.documentCompressorFilteringFn) outputDocs = this.documentCompressorFilteringFn(outputDocs);
		}
		return outputDocs;
	}
};

//#endregion
exports.MultiQueryRetriever = MultiQueryRetriever;
Object.defineProperty(exports, 'multi_query_exports', {
  enumerable: true,
  get: function () {
    return multi_query_exports;
  }
});
//# sourceMappingURL=multi_query.cjs.map