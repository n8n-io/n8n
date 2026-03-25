const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_BM25 = require('../utils/@furkantoprak/bm25/BM25.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_retrievers = require_rolldown_runtime.__toESM(require("@langchain/core/retrievers"));

//#region src/retrievers/bm25.ts
var bm25_exports = {};
require_rolldown_runtime.__export(bm25_exports, { BM25Retriever: () => BM25Retriever });
/**
* A retriever that uses the BM25 algorithm to rank documents based on their
* similarity to a query. It uses the "okapibm25" package for BM25 scoring.
* The k parameter determines the number of documents to return for each query.
*/
var BM25Retriever = class extends __langchain_core_retrievers.BaseRetriever {
	includeScore = false;
	static lc_name() {
		return "BM25Retriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"bm25_retriever"
	];
	static fromDocuments(documents, options) {
		return new this({
			...options,
			docs: documents
		});
	}
	docs;
	k;
	constructor(options) {
		super(options);
		this.docs = options.docs;
		this.k = options.k;
		this.includeScore = options.includeScore ?? this.includeScore;
	}
	preprocessFunc(text) {
		return text.toLowerCase().split(/\s+/);
	}
	async _getRelevantDocuments(query) {
		const processedQuery = this.preprocessFunc(query);
		const scoredDocs = require_BM25.BM25(this.docs.map((d) => ({
			text: d.pageContent,
			document: d
		})), processedQuery, void 0, (a, b) => b.score - a.score);
		return scoredDocs.slice(0, this.k).map((item) => {
			if (this.includeScore) return new __langchain_core_documents.Document({
				...item.document.id && { id: item.document.id },
				pageContent: item.document.pageContent,
				metadata: {
					bm25Score: item.score,
					...item.document.metadata
				}
			});
			else return item.document;
		});
	}
};

//#endregion
exports.BM25Retriever = BM25Retriever;
Object.defineProperty(exports, 'bm25_exports', {
  enumerable: true,
  get: function () {
    return bm25_exports;
  }
});
//# sourceMappingURL=bm25.cjs.map