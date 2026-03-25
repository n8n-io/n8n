const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_retrievers_multi_vector = require('./multi_vector.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));

//#region src/retrievers/parent_document.ts
var parent_document_exports = {};
require_rolldown_runtime.__export(parent_document_exports, { ParentDocumentRetriever: () => ParentDocumentRetriever });
/**
* A type of document retriever that splits input documents into smaller chunks
* while separately storing and preserving the original documents.
* The small chunks are embedded, then on retrieval, the original
* "parent" documents are retrieved.
*
* This strikes a balance between better targeted retrieval with small documents
* and the more context-rich larger documents.
* @example
* ```typescript
* const retriever = new ParentDocumentRetriever({
*   vectorstore: new MemoryVectorStore(new OpenAIEmbeddings()),
*   byteStore: new InMemoryStore<Uint8Array>(),
*   parentSplitter: new RecursiveCharacterTextSplitter({
*     chunkOverlap: 0,
*     chunkSize: 500,
*   }),
*   childSplitter: new RecursiveCharacterTextSplitter({
*     chunkOverlap: 0,
*     chunkSize: 50,
*   }),
*   childK: 20,
*   parentK: 5,
* });
*
* const parentDocuments = await getDocuments();
* await retriever.addDocuments(parentDocuments);
* const retrievedDocs = await retriever.invoke("justice breyer");
* ```
*/
var ParentDocumentRetriever = class extends require_retrievers_multi_vector.MultiVectorRetriever {
	static lc_name() {
		return "ParentDocumentRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"parent_document"
	];
	vectorstore;
	childSplitter;
	parentSplitter;
	idKey = "doc_id";
	childK;
	parentK;
	childDocumentRetriever;
	documentCompressor;
	documentCompressorFilteringFn;
	constructor(fields) {
		super(fields);
		this.vectorstore = fields.vectorstore;
		this.childSplitter = fields.childSplitter;
		this.parentSplitter = fields.parentSplitter;
		this.idKey = fields.idKey ?? this.idKey;
		this.childK = fields.childK;
		this.parentK = fields.parentK;
		this.childDocumentRetriever = fields.childDocumentRetriever;
		this.documentCompressor = fields.documentCompressor;
		this.documentCompressorFilteringFn = fields.documentCompressorFilteringFn;
	}
	async _getRelevantDocuments(query) {
		let subDocs = [];
		if (this.childDocumentRetriever) subDocs = await this.childDocumentRetriever.invoke(query);
		else subDocs = await this.vectorstore.similaritySearch(query, this.childK);
		if (this.documentCompressor && subDocs.length) {
			subDocs = await this.documentCompressor.compressDocuments(subDocs, query);
			if (this.documentCompressorFilteringFn) subDocs = this.documentCompressorFilteringFn(subDocs);
		}
		const parentDocIds = [];
		for (const doc of subDocs) if (!parentDocIds.includes(doc.metadata[this.idKey])) parentDocIds.push(doc.metadata[this.idKey]);
		const parentDocs = [];
		const storedParentDocs = await this.docstore.mget(parentDocIds);
		const retrievedDocs = storedParentDocs.filter((doc) => doc !== void 0);
		parentDocs.push(...retrievedDocs);
		return parentDocs.slice(0, this.parentK);
	}
	async _storeDocuments(parentDoc, childDocs, addToDocstore) {
		if (this.childDocumentRetriever) await this.childDocumentRetriever.addDocuments(childDocs);
		else await this.vectorstore.addDocuments(childDocs);
		if (addToDocstore) await this.docstore.mset(Object.entries(parentDoc));
	}
	/**
	* Adds documents to the docstore and vectorstores.
	* If a retriever is provided, it will be used to add documents instead of the vectorstore.
	* @param docs The documents to add
	* @param config.ids Optional list of ids for documents. If provided should be the same
	*   length as the list of documents. Can provided if parent documents
	*   are already in the document store and you don't want to re-add
	*   to the docstore. If not provided, random UUIDs will be used as ids.
	* @param config.addToDocstore Boolean of whether to add documents to docstore.
	* This can be false if and only if `ids` are provided. You may want
	*   to set this to False if the documents are already in the docstore
	*   and you don't want to re-add them.
	* @param config.chunkHeaderOptions Object with options for adding Contextual chunk headers
	*/
	async addDocuments(docs, config) {
		const { ids, addToDocstore = true, childDocChunkHeaderOptions = {} } = config ?? {};
		const parentDocs = this.parentSplitter ? await this.parentSplitter.splitDocuments(docs) : docs;
		let parentDocIds;
		if (ids === void 0) {
			if (!addToDocstore) throw new Error(`If ids are not passed in, "config.addToDocstore" MUST be true`);
			parentDocIds = parentDocs.map((_doc) => uuid.v4());
		} else parentDocIds = ids;
		if (parentDocs.length !== parentDocIds.length) throw new Error(`Got uneven list of documents and ids.\nIf "ids" is provided, should be same length as "documents".`);
		for (let i = 0; i < parentDocs.length; i += 1) {
			const parentDoc = parentDocs[i];
			const parentDocId = parentDocIds[i];
			const subDocs = await this.childSplitter.splitDocuments([parentDoc], childDocChunkHeaderOptions);
			const taggedSubDocs = subDocs.map((subDoc) => new __langchain_core_documents.Document({
				pageContent: subDoc.pageContent,
				metadata: {
					...subDoc.metadata,
					[this.idKey]: parentDocId
				}
			}));
			await this._storeDocuments({ [parentDocId]: parentDoc }, taggedSubDocs, addToDocstore);
		}
	}
};

//#endregion
exports.ParentDocumentRetriever = ParentDocumentRetriever;
Object.defineProperty(exports, 'parent_document_exports', {
  enumerable: true,
  get: function () {
    return parent_document_exports;
  }
});
//# sourceMappingURL=parent_document.cjs.map