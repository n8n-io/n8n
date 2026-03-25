import { __export } from "../../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/couchbase.ts
var couchbase_exports = {};
__export(couchbase_exports, { CouchbaseDocumentLoader: () => CouchbaseDocumentLoader });
/**
* loader for couchbase document
*/
var CouchbaseDocumentLoader = class extends BaseDocumentLoader {
	cluster;
	query;
	pageContentFields;
	metadataFields;
	/**
	* construct Couchbase document loader with a requirement for couchbase cluster client
	* @param client { Cluster } [ couchbase connected client to connect to database ]
	* @param query { string } [ query to get results from while loading the data ]
	* @param pageContentFields { Array<string> } [ filters fields of the document and shows these only ]
	* @param metadataFields { Array<string> } [ metadata fields required ]
	*/
	constructor(client, query, pageContentFields, metadataFields) {
		super();
		if (!client) throw new Error("Couchbase client cluster must be provided.");
		this.cluster = client;
		this.query = query;
		this.pageContentFields = pageContentFields;
		this.metadataFields = metadataFields;
	}
	/**
	* Function to load document based on query from couchbase
	* @returns {Promise<Document[]>} [ Returns a promise of all the documents as array ]
	*/
	async load() {
		const documents = [];
		for await (const doc of this.lazyLoad()) documents.push(doc);
		return documents;
	}
	/**
	* Function to load documents based on iterator rather than full load
	* @returns {AsyncIterable<Document>} [ Returns an iterator to fetch documents ]
	*/
	async *lazyLoad() {
		const result = await this.cluster.query(this.query);
		for await (const row of result.rows) {
			let { metadataFields, pageContentFields } = this;
			if (!pageContentFields) pageContentFields = Object.keys(row);
			if (!metadataFields) metadataFields = [];
			const metadata = metadataFields.reduce((obj, field) => ({
				...obj,
				[field]: row[field]
			}), {});
			const document = pageContentFields.map((k) => `${k}: ${JSON.stringify(row[k])}`).join("\n");
			yield new Document({
				pageContent: document,
				metadata
			});
		}
	}
};

//#endregion
export { CouchbaseDocumentLoader, couchbase_exports };
//# sourceMappingURL=couchbase.js.map