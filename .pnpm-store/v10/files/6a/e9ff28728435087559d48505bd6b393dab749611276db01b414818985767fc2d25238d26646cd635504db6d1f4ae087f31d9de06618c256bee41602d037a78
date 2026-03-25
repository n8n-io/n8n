Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_document_loaders_base = require("./base.cjs");
let langsmith = require("langsmith");
//#region src/document_loaders/langsmith.ts
var langsmith_exports = /* @__PURE__ */ require_runtime.__exportAll({ LangSmithLoader: () => LangSmithLoader });
/**
* Document loader integration with LangSmith.
*
* ## [Constructor args](https://api.js.langchain.com/interfaces/_langchain_core.document_loaders_langsmith.LangSmithLoaderFields.html)
*
* <details open>
* <summary><strong>Load</strong></summary>
*
* ```typescript
* import { LangSmithLoader } from '@langchain/core/document_loaders/langsmith';
* import { Client } from 'langsmith';
*
* const langSmithClient = new Client({
*   apiKey: process.env.LANGSMITH_API_KEY,
* })
*
* const loader = new LangSmithLoader({
*   datasetId: "9a3b36f7-b308-40a5-9b46-6613853b6330",
*   limit: 1,
* });
*
* const docs = await loader.load();
* ```
*
* ```txt
* [
*   {
*     pageContent: '{\n  "input_key_str": "string",\n  "input_key_bool": true\n}',
*     metadata: {
*       id: '8523d9e9-c123-4b23-9b46-21021nds289e',
*       created_at: '2024-08-19T17:09:14.806441+00:00',
*       modified_at: '2024-08-19T17:09:14.806441+00:00',
*       name: '#8517 @ brace-test-dataset',
*       dataset_id: '9a3b36f7-b308-40a5-9b46-6613853b6330',
*       source_run_id: null,
*       metadata: [Object],
*       inputs: [Object],
*       outputs: [Object]
*     }
*   }
* ]
* ```
* </details>
*/
var LangSmithLoader = class extends require_document_loaders_base.BaseDocumentLoader {
	datasetId;
	datasetName;
	exampleIds;
	asOf;
	splits;
	inlineS3Urls;
	offset;
	limit;
	metadata;
	filter;
	contentKey;
	formatContent;
	client;
	constructor(fields) {
		super();
		if (fields.client && fields.clientConfig) throw new Error("client and clientConfig cannot both be provided.");
		this.client = fields.client ?? new langsmith.Client(fields?.clientConfig);
		this.contentKey = fields.contentKey ? fields.contentKey.split(".") : [];
		this.formatContent = fields.formatContent ?? _stringify;
		this.datasetId = fields.datasetId;
		this.datasetName = fields.datasetName;
		this.exampleIds = fields.exampleIds;
		this.asOf = fields.asOf;
		this.splits = fields.splits;
		this.inlineS3Urls = fields.inlineS3Urls;
		this.offset = fields.offset;
		this.limit = fields.limit;
		this.metadata = fields.metadata;
		this.filter = fields.filter;
	}
	async load() {
		const documents = [];
		for await (const example of this.client.listExamples({
			datasetId: this.datasetId,
			datasetName: this.datasetName,
			exampleIds: this.exampleIds,
			asOf: this.asOf,
			splits: this.splits,
			inlineS3Urls: this.inlineS3Urls,
			offset: this.offset,
			limit: this.limit,
			metadata: this.metadata,
			filter: this.filter
		})) {
			let content = example.inputs;
			for (const key of this.contentKey) content = content[key];
			const contentStr = this.formatContent(content);
			const metadata = example;
			["created_at", "modified_at"].forEach((k) => {
				if (k in metadata) {
					if (typeof metadata[k] === "object") metadata[k] = metadata[k].toString();
				}
			});
			documents.push({
				pageContent: contentStr,
				metadata
			});
		}
		return documents;
	}
};
function _stringify(x) {
	if (typeof x === "string") return x;
	else try {
		return JSON.stringify(x, null, 2);
	} catch {
		return String(x);
	}
}
//#endregion
exports.LangSmithLoader = LangSmithLoader;
Object.defineProperty(exports, "langsmith_exports", {
	enumerable: true,
	get: function() {
		return langsmith_exports;
	}
});

//# sourceMappingURL=langsmith.cjs.map