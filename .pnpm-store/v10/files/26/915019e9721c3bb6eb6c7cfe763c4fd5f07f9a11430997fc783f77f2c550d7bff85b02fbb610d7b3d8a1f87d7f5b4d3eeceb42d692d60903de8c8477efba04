const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_retrievers = require_rolldown_runtime.__toESM(require("@langchain/core/retrievers"));

//#region src/retrievers/chaindesk.ts
var chaindesk_exports = {};
require_rolldown_runtime.__export(chaindesk_exports, { ChaindeskRetriever: () => ChaindeskRetriever });
/**
* @example
* ```typescript
* const retriever = new ChaindeskRetriever({
*   datastoreId: "DATASTORE_ID",
*   apiKey: "CHAINDESK_API_KEY",
*   topK: 8,
* });
* const docs = await retriever.getRelevantDocuments("hello");
* ```
*/
var ChaindeskRetriever = class extends __langchain_core_retrievers.BaseRetriever {
	static lc_name() {
		return "ChaindeskRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"chaindesk"
	];
	caller;
	datastoreId;
	topK;
	filter;
	apiKey;
	constructor({ datastoreId, apiKey, topK, filter,...rest }) {
		super();
		this.caller = new __langchain_core_utils_async_caller.AsyncCaller(rest);
		this.datastoreId = datastoreId;
		this.apiKey = apiKey;
		this.topK = topK;
		this.filter = filter;
	}
	async getRelevantDocuments(query) {
		const r = await this.caller.call(fetch, `https://app.chaindesk.ai/api/datastores/${this.datastoreId}/query`, {
			method: "POST",
			body: JSON.stringify({
				query,
				...this.topK ? { topK: this.topK } : {},
				...this.filter ? { filters: this.filter } : {}
			}),
			headers: {
				"Content-Type": "application/json",
				...this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
			}
		});
		const { results } = await r.json();
		return results.map(({ text, score, source,...rest }) => new __langchain_core_documents.Document({
			pageContent: text,
			metadata: {
				score,
				source,
				...rest
			}
		}));
	}
};

//#endregion
exports.ChaindeskRetriever = ChaindeskRetriever;
Object.defineProperty(exports, 'chaindesk_exports', {
  enumerable: true,
  get: function () {
    return chaindesk_exports;
  }
});
//# sourceMappingURL=chaindesk.cjs.map