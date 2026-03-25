const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_chains_query_constructor_index = require('../../chains/query_constructor/index.cjs');
const __langchain_core_retrievers = require_rolldown_runtime.__toESM(require("@langchain/core/retrievers"));
const __langchain_core_structured_query = require_rolldown_runtime.__toESM(require("@langchain/core/structured_query"));

//#region src/retrievers/self_query/index.ts
var self_query_exports = {};
require_rolldown_runtime.__export(self_query_exports, {
	BaseTranslator: () => __langchain_core_structured_query.BaseTranslator,
	BasicTranslator: () => __langchain_core_structured_query.BasicTranslator,
	FunctionalTranslator: () => __langchain_core_structured_query.FunctionalTranslator,
	SelfQueryRetriever: () => SelfQueryRetriever
});
/**
* Class for question answering over an index. It retrieves relevant
* documents based on a query. It extends the BaseRetriever class and
* implements the SelfQueryRetrieverArgs interface.
* @example
* ```typescript
* const selfQueryRetriever = SelfQueryRetriever.fromLLM({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   vectorStore: await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings()),
*   documentContents: "Brief summary of a movie",
*   attributeInfo: attributeInfo,
*   structuredQueryTranslator: new FunctionalTranslator(),
* });
* const relevantDocuments = await selfQueryRetriever.invoke(
*   "Which movies are directed by Greta Gerwig?",
* );
* ```
*/
var SelfQueryRetriever = class SelfQueryRetriever extends __langchain_core_retrievers.BaseRetriever {
	static lc_name() {
		return "SelfQueryRetriever";
	}
	get lc_namespace() {
		return [
			"langchain",
			"retrievers",
			"self_query"
		];
	}
	vectorStore;
	queryConstructor;
	verbose;
	structuredQueryTranslator;
	useOriginalQuery = false;
	searchParams = {
		k: 4,
		forceDefaultFilter: false
	};
	constructor(options) {
		super(options);
		this.vectorStore = options.vectorStore;
		this.queryConstructor = options.queryConstructor;
		this.verbose = options.verbose ?? false;
		this.searchParams = options.searchParams ?? this.searchParams;
		this.useOriginalQuery = options.useOriginalQuery ?? this.useOriginalQuery;
		this.structuredQueryTranslator = options.structuredQueryTranslator;
	}
	async _getRelevantDocuments(query, runManager) {
		const generatedStructuredQuery = await this.queryConstructor.invoke({ query }, {
			callbacks: runManager?.getChild("query_constructor"),
			runName: "query_constructor"
		});
		const nextArg = this.structuredQueryTranslator.visitStructuredQuery(generatedStructuredQuery);
		const filter = this.structuredQueryTranslator.mergeFilters(this.searchParams?.filter, nextArg.filter, this.searchParams?.mergeFiltersOperator, this.searchParams?.forceDefaultFilter);
		const generatedQuery = generatedStructuredQuery.query;
		let myQuery = query;
		if (!this.useOriginalQuery && generatedQuery && generatedQuery.length > 0) myQuery = generatedQuery;
		return this.vectorStore.asRetriever({
			k: this.searchParams?.k,
			filter
		}).invoke(myQuery, { callbacks: runManager?.getChild("retriever") });
	}
	/**
	* Static method to create a new SelfQueryRetriever instance from a
	* BaseLanguageModel and a VectorStore. It first loads a query constructor
	* chain using the loadQueryConstructorChain function, then creates a new
	* SelfQueryRetriever instance with the loaded chain and the provided
	* options.
	* @param options The options used to create the SelfQueryRetriever instance. It includes the QueryConstructorChainOptions and all the SelfQueryRetrieverArgs except 'llmChain'.
	* @returns A new instance of SelfQueryRetriever.
	*/
	static fromLLM(options) {
		const { structuredQueryTranslator, allowedComparators, allowedOperators, llm, documentContents, attributeInfo, examples, vectorStore,...rest } = options;
		const queryConstructor = require_chains_query_constructor_index.loadQueryConstructorRunnable({
			llm,
			documentContents,
			attributeInfo,
			examples,
			allowedComparators: allowedComparators ?? structuredQueryTranslator.allowedComparators,
			allowedOperators: allowedOperators ?? structuredQueryTranslator.allowedOperators
		});
		return new SelfQueryRetriever({
			...rest,
			queryConstructor,
			vectorStore,
			structuredQueryTranslator
		});
	}
};

//#endregion
Object.defineProperty(exports, 'BaseTranslator', {
  enumerable: true,
  get: function () {
    return __langchain_core_structured_query.BaseTranslator;
  }
});
Object.defineProperty(exports, 'BasicTranslator', {
  enumerable: true,
  get: function () {
    return __langchain_core_structured_query.BasicTranslator;
  }
});
Object.defineProperty(exports, 'FunctionalTranslator', {
  enumerable: true,
  get: function () {
    return __langchain_core_structured_query.FunctionalTranslator;
  }
});
exports.SelfQueryRetriever = SelfQueryRetriever;
Object.defineProperty(exports, 'self_query_exports', {
  enumerable: true,
  get: function () {
    return self_query_exports;
  }
});
//# sourceMappingURL=index.cjs.map