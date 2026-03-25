import { __export } from "../_virtual/rolldown_runtime.js";
import { getDocsFromSummaries, loadDocsFromResults, searchArxiv } from "../utils/arxiv.js";
import { BaseRetriever } from "@langchain/core/retrievers";

//#region src/retrievers/arxiv.ts
var arxiv_exports = {};
__export(arxiv_exports, { ArxivRetriever: () => ArxivRetriever });
/**
* A retriever that searches arXiv for relevant articles based on a query.
* It can retrieve either full documents (PDFs) or just summaries.
*/
var ArxivRetriever = class extends BaseRetriever {
	static lc_name() {
		return "ArxivRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"arxiv_retriever"
	];
	getFullDocuments = false;
	maxSearchResults = 10;
	constructor(options = {}) {
		super(options);
		this.getFullDocuments = options.getFullDocuments ?? this.getFullDocuments;
		this.maxSearchResults = options.maxSearchResults ?? this.maxSearchResults;
	}
	async _getRelevantDocuments(query) {
		try {
			const results = await searchArxiv(query, this.maxSearchResults);
			if (this.getFullDocuments) return await loadDocsFromResults(results);
			else return getDocsFromSummaries(results);
		} catch {
			throw new Error(`Error retrieving documents from arXiv.`);
		}
	}
};

//#endregion
export { ArxivRetriever, arxiv_exports };
//# sourceMappingURL=arxiv.js.map