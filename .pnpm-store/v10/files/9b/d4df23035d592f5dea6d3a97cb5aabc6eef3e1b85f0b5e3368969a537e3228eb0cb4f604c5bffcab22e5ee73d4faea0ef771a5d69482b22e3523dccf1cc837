import { __export } from "../_virtual/rolldown_runtime.js";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/typesense.ts
var typesense_exports = {};
__export(typesense_exports, { Typesense: () => Typesense });
/**
* Typesense vector store.
*/
var Typesense = class Typesense extends VectorStore {
	client;
	schemaName;
	searchParams;
	vectorColumnName;
	pageContentColumnName;
	metadataColumnNames;
	caller;
	import;
	_vectorstoreType() {
		return "typesense";
	}
	constructor(embeddings, config) {
		super(embeddings, config);
		this.client = config.typesenseClient;
		this.schemaName = config.schemaName;
		this.searchParams = config.searchParams || {
			q: "*",
			per_page: 5,
			query_by: ""
		};
		this.vectorColumnName = config.columnNames?.vector || "vec";
		this.pageContentColumnName = config.columnNames?.pageContent || "text";
		this.metadataColumnNames = config.columnNames?.metadataColumnNames || [];
		this.import = config.import || this.importToTypesense.bind(this);
		this.caller = new AsyncCaller(config);
	}
	/**
	* Default function to import data to typesense
	* @param data
	* @param collectionName
	*/
	async importToTypesense(data, collectionName) {
		const chunkSize = 2e3;
		for (let i = 0; i < data.length; i += chunkSize) {
			const chunk = data.slice(i, i + chunkSize);
			await this.caller.call(async () => {
				await this.client.collections(collectionName).documents().import(chunk, {
					action: "emplace",
					dirty_values: "drop"
				});
			});
		}
	}
	/**
	* Transform documents to Typesense records.
	* @param documents
	* @returns Typesense records.
	*/
	_documentsToTypesenseRecords(documents, vectors) {
		const metadatas = documents.map((doc) => doc.metadata);
		const typesenseDocuments = documents.map((doc, index) => {
			const metadata = metadatas[index];
			const objectWithMetadatas = {};
			this.metadataColumnNames.forEach((metadataColumnName) => {
				objectWithMetadatas[metadataColumnName] = metadata[metadataColumnName];
			});
			return {
				[this.pageContentColumnName]: doc.pageContent,
				[this.vectorColumnName]: vectors[index],
				...objectWithMetadatas
			};
		});
		return typesenseDocuments;
	}
	/**
	* Transform the Typesense records to documents.
	* @param typesenseRecords
	* @returns documents
	*/
	_typesenseRecordsToDocuments(typesenseRecords) {
		const documents = typesenseRecords?.map((hit) => {
			const objectWithMetadatas = {};
			const hitDoc = hit.document || {};
			this.metadataColumnNames.forEach((metadataColumnName) => {
				objectWithMetadatas[metadataColumnName] = hitDoc[metadataColumnName];
			});
			const document = {
				pageContent: hitDoc[this.pageContentColumnName] || "",
				metadata: objectWithMetadatas
			};
			return [document, hit.vector_distance];
		}) || [];
		return documents;
	}
	/**
	* Add documents to the vector store.
	* Will be updated if in the metadata there is a document with the same id if is using the default import function.
	* Metadata will be added in the columns of the schema based on metadataColumnNames.
	* @param documents Documents to add.
	*/
	async addDocuments(documents) {
		const typesenseDocuments = this._documentsToTypesenseRecords(documents, await this.embeddings.embedDocuments(documents.map((doc) => doc.pageContent)));
		await this.import(typesenseDocuments, this.schemaName);
	}
	/**
	* Adds vectors to the vector store.
	* @param vectors Vectors to add.
	* @param documents Documents associated with the vectors.
	*/
	async addVectors(vectors, documents) {
		const typesenseDocuments = this._documentsToTypesenseRecords(documents, vectors);
		await this.import(typesenseDocuments, this.schemaName);
	}
	/**
	* Search for similar documents with their similarity score.
	* @param vectorPrompt vector to search for
	* @param k amount of results to return
	* @returns similar documents with their similarity score
	*/
	async similaritySearchVectorWithScore(vectorPrompt, k, filter = {}) {
		const amount = k || this.searchParams.per_page || 5;
		const vector_query = `${this.vectorColumnName}:([${vectorPrompt}], k:${amount})`;
		const typesenseResponse = await this.client.multiSearch.perform({ searches: [{
			...this.searchParams,
			...filter,
			per_page: amount,
			vector_query,
			collection: this.schemaName
		}] }, {});
		const results = typesenseResponse.results[0].hits;
		const hits = results?.map((hit) => ({
			document: hit?.document || {},
			vector_distance: hit?.vector_distance || 2
		}));
		return this._typesenseRecordsToDocuments(hits);
	}
	/**
	* Delete documents from the vector store.
	* @param documentIds ids of the documents to delete
	*/
	async deleteDocuments(documentIds) {
		await this.client.collections(this.schemaName).documents().delete({ filter_by: `id:=${documentIds.join(",")}` });
	}
	/**
	* Create a vector store from documents.
	* @param docs documents
	* @param embeddings embeddings
	* @param config Typesense configuration
	* @returns Typesense vector store
	* @warning You can omit this method, and only use the constructor and addDocuments.
	*/
	static async fromDocuments(docs, embeddings, config) {
		const instance = new Typesense(embeddings, config);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Create a vector store from texts.
	* @param texts
	* @param metadatas
	* @param embeddings
	* @param config
	* @returns Typesense vector store
	*/
	static async fromTexts(texts, metadatas, embeddings, config) {
		const instance = new Typesense(embeddings, config);
		const documents = texts.map((text, i) => ({
			pageContent: text,
			metadata: metadatas[i] || {}
		}));
		await instance.addDocuments(documents);
		return instance;
	}
};

//#endregion
export { Typesense, typesense_exports };
//# sourceMappingURL=typesense.js.map