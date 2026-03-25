import { __export } from "../_virtual/rolldown_runtime.js";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";

//#region src/retrievers/chaindesk.ts
var chaindesk_exports = {};
__export(chaindesk_exports, { ChaindeskRetriever: () => ChaindeskRetriever });
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
var ChaindeskRetriever = class extends BaseRetriever {
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
		this.caller = new AsyncCaller(rest);
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
		return results.map(({ text, score, source,...rest }) => new Document({
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
export { ChaindeskRetriever, chaindesk_exports };
//# sourceMappingURL=chaindesk.js.map