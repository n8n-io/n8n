import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseRetriever } from "@langchain/core/retrievers";

//#region src/retrievers/contextual_compression.ts
var contextual_compression_exports = {};
__export(contextual_compression_exports, { ContextualCompressionRetriever: () => ContextualCompressionRetriever });
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
var ContextualCompressionRetriever = class extends BaseRetriever {
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
export { ContextualCompressionRetriever, contextual_compression_exports };
//# sourceMappingURL=contextual_compression.js.map