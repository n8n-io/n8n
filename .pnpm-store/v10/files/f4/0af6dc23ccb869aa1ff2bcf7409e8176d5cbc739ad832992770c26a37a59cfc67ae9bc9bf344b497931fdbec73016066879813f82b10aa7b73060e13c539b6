const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_retrievers = require_rolldown_runtime.__toESM(require("@langchain/core/retrievers"));

//#region src/retrievers/contextual_compression.ts
var contextual_compression_exports = {};
require_rolldown_runtime.__export(contextual_compression_exports, { ContextualCompressionRetriever: () => ContextualCompressionRetriever });
/**
* A retriever that wraps a base retriever and compresses the results. It
* retrieves relevant documents based on a given query and then compresses
* these documents using a specified document compressor.
* @example
* ```typescript
* const retriever = new ContextualCompressionRetriever({
*   baseCompressor: new LLMChainExtractor(),
*   baseRetriever: new HNSWLib().asRetriever(),
* });
* const retrievedDocs = await retriever.invoke(
*   "What did the speaker say about Justice Breyer?",
* );
* ```
*/
var ContextualCompressionRetriever = class extends __langchain_core_retrievers.BaseRetriever {
	static lc_name() {
		return "ContextualCompressionRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"contextual_compression"
	];
	baseCompressor;
	baseRetriever;
	constructor(fields) {
		super(fields);
		this.baseCompressor = fields.baseCompressor;
		this.baseRetriever = fields.baseRetriever;
	}
	async _getRelevantDocuments(query, runManager) {
		const docs = await this.baseRetriever.invoke(query, runManager?.getChild("base_retriever"));
		const compressedDocs = await this.baseCompressor.compressDocuments(docs, query, runManager?.getChild("base_compressor"));
		return compressedDocs;
	}
};

//#endregion
exports.ContextualCompressionRetriever = ContextualCompressionRetriever;
Object.defineProperty(exports, 'contextual_compression_exports', {
  enumerable: true,
  get: function () {
    return contextual_compression_exports;
  }
});
//# sourceMappingURL=contextual_compression.cjs.map