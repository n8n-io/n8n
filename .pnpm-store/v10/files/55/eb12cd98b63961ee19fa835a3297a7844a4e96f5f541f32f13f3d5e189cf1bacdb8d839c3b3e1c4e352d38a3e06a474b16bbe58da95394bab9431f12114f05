import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { BaseRetriever } from "@langchain/core/retrievers";

//#region src/retrievers/remote/base.ts
/**
* Abstract class for interacting with a remote server to retrieve
* relevant documents based on a given query.
*/
var RemoteRetriever = class extends BaseRetriever {
	get lc_secrets() {
		return { "auth.bearer": "REMOTE_RETRIEVER_AUTH_BEARER" };
	}
	url;
	auth;
	headers;
	asyncCaller;
	constructor(fields) {
		super(fields);
		const { url, auth,...rest } = fields;
		this.url = url;
		this.auth = auth;
		this.headers = {
			Accept: "application/json",
			"Content-Type": "application/json",
			...this.auth && this.auth.bearer ? { Authorization: `Bearer ${this.auth.bearer}` } : {}
		};
		this.asyncCaller = new AsyncCaller(rest);
	}
	async _getRelevantDocuments(query) {
		const body = this.createJsonBody(query);
		const response = await this.asyncCaller.call(() => fetch(this.url, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(body)
		}));
		if (!response.ok) throw new Error(`Failed to retrieve documents from ${this.url}: ${response.status} ${response.statusText}`);
		const json = await response.json();
		return this.processJsonResponse(json);
	}
};

//#endregion
export { RemoteRetriever };
//# sourceMappingURL=base.js.map