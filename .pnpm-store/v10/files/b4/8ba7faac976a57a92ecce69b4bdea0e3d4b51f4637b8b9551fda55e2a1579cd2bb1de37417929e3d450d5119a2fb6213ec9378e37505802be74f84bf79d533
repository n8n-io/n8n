import { __export } from "../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";

//#region src/retrievers/metal.ts
var metal_exports = {};
__export(metal_exports, { MetalRetriever: () => MetalRetriever });
/**
* Class used to interact with the Metal service, a managed retrieval &
* memory platform. It allows you to index your data into Metal and run
* semantic search and retrieval on it. It extends the `BaseRetriever`
* class and requires a `Metal` instance and a dictionary of parameters to
* pass to the Metal API during its initialization.
* @example
* ```typescript
* const retriever = new MetalRetriever({
*   client: new Metal(
*     process.env.METAL_API_KEY,
*     process.env.METAL_CLIENT_ID,
*     process.env.METAL_INDEX_ID,
*   ),
* });
* const docs = await retriever.getRelevantDocuments("hello");
* ```
*/
var MetalRetriever = class extends BaseRetriever {
	static lc_name() {
		return "MetalRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"metal"
	];
	client;
	constructor(fields) {
		super(fields);
		this.client = fields.client;
	}
	async _getRelevantDocuments(query) {
		const res = await this.client.search({ text: query });
		const items = "data" in res ? res.data : res;
		return items.map(({ text, metadata }) => new Document({
			pageContent: text,
			metadata
		}));
	}
};

//#endregion
export { MetalRetriever, metal_exports };
//# sourceMappingURL=metal.js.map