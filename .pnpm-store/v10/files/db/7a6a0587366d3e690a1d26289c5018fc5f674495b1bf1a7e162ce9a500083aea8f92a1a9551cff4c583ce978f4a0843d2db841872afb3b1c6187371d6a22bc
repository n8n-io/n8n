const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_retrievers = require_rolldown_runtime.__toESM(require("@langchain/core/retrievers"));

//#region src/retrievers/metal.ts
var metal_exports = {};
require_rolldown_runtime.__export(metal_exports, { MetalRetriever: () => MetalRetriever });
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
var MetalRetriever = class extends __langchain_core_retrievers.BaseRetriever {
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
		return items.map(({ text, metadata }) => new __langchain_core_documents.Document({
			pageContent: text,
			metadata
		}));
	}
};

//#endregion
exports.MetalRetriever = MetalRetriever;
Object.defineProperty(exports, 'metal_exports', {
  enumerable: true,
  get: function () {
    return metal_exports;
  }
});
//# sourceMappingURL=metal.cjs.map