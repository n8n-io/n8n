import { __export } from "../../_virtual/rolldown_runtime.js";

//#region src/retrievers/document_compressors/index.ts
var document_compressors_exports = {};
__export(document_compressors_exports, {
	BaseDocumentCompressor: () => BaseDocumentCompressor,
	DocumentCompressorPipeline: () => DocumentCompressorPipeline
});
/**
* Base Document Compression class. All compressors should extend this class.
*/
var BaseDocumentCompressor = class {
	static isBaseDocumentCompressor(x) {
		return x?.compressDocuments !== void 0;
	}
};
/**
* Document compressor that uses a pipeline of Transformers.
* @example
* ```typescript
* const compressorPipeline = new DocumentCompressorPipeline({
*   transformers: [
*     new RecursiveCharacterTextSplitter({
*       chunkSize: 200,
*       chunkOverlap: 0,
*     }),
*     new EmbeddingsFilter({
*       embeddings: new OpenAIEmbeddings(),
*       similarityThreshold: 0.8,
*       k: 5,
*     }),
*   ],
* });
* const retriever = new ContextualCompressionRetriever({
*   baseCompressor: compressorPipeline,
*   baseRetriever: new TavilySearchAPIRetriever({
*     includeRawContent: true,
*   }),
* });
* const retrievedDocs = await retriever.invoke(
*   "What did the speaker say about Justice Breyer in the 2022 State of the Union?",
* );
* console.log({ retrievedDocs });
* ```
*/
var DocumentCompressorPipeline = class extends BaseDocumentCompressor {
	transformers;
	constructor(fields) {
		super();
		this.transformers = fields.transformers;
	}
	async compressDocuments(documents, query, callbacks) {
		let transformedDocuments = documents;
		for (const transformer of this.transformers) if (BaseDocumentCompressor.isBaseDocumentCompressor(transformer)) transformedDocuments = await transformer.compressDocuments(transformedDocuments, query, callbacks);
		else transformedDocuments = await transformer.transformDocuments(transformedDocuments);
		return transformedDocuments;
	}
};

//#endregion
export { BaseDocumentCompressor, DocumentCompressorPipeline, document_compressors_exports };
//# sourceMappingURL=index.js.map