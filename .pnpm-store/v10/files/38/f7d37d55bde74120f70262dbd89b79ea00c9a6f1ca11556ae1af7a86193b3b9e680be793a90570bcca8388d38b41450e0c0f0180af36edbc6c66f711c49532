import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { DataSource, EntitySchema } from "typeorm";

//#region src/vectorstores/typeorm.ts
var typeorm_exports = {};
__export(typeorm_exports, {
	TypeORMVectorStore: () => TypeORMVectorStore,
	TypeORMVectorStoreDocument: () => TypeORMVectorStoreDocument
});
/**
* Class that extends the `Document` base class and adds an `embedding`
* property. It represents a document in the vector store.
*/
var TypeORMVectorStoreDocument = class extends Document {
	embedding;
};
const defaultDocumentTableName = "documents";
/**
* Class that provides an interface to a Postgres vector database. It
* extends the `VectorStore` base class and implements methods for adding
* documents and vectors, performing similarity searches, and ensuring the
* existence of a table in the database.
*/
var TypeORMVectorStore = class TypeORMVectorStore extends VectorStore {
	tableName;
	schemaName;
	documentEntity;
	filter;
	appDataSource;
	_verbose;
	_vectorstoreType() {
		return "typeorm";
	}
	constructor(embeddings, fields) {
		super(embeddings, fields);
		this.tableName = fields.tableName || defaultDocumentTableName;
		this.schemaName = fields.schemaName;
		this.filter = fields.filter;
		const TypeORMDocumentEntity = new EntitySchema({
			name: fields.tableName ?? defaultDocumentTableName,
			columns: {
				id: {
					generated: "uuid",
					type: "uuid",
					primary: true
				},
				pageContent: { type: String },
				metadata: { type: "jsonb" },
				embedding: { type: String }
			}
		});
		const appDataSource = new DataSource({
			entities: [TypeORMDocumentEntity],
			...fields.postgresConnectionOptions
		});
		this.appDataSource = appDataSource;
		this.documentEntity = TypeORMDocumentEntity;
		this._verbose = fields.verbose ?? getEnvironmentVariable("LANGCHAIN_VERBOSE") === "true";
	}
	/**
	* Static method to create a new `TypeORMVectorStore` instance from a
	* `DataSource`. It initializes the `DataSource` if it is not already
	* initialized.
	* @param embeddings Embeddings instance.
	* @param fields `TypeORMVectorStoreArgs` instance.
	* @returns A new instance of `TypeORMVectorStore`.
	*/
	static async fromDataSource(embeddings, fields) {
		const postgresqlVectorStore = new TypeORMVectorStore(embeddings, fields);
		if (!postgresqlVectorStore.appDataSource.isInitialized) await postgresqlVectorStore.appDataSource.initialize();
		return postgresqlVectorStore;
	}
	/**
	* Method to add documents to the vector store. It ensures the existence
	* of the table in the database, converts the documents into vectors, and
	* adds them to the store.
	* @param documents Array of `Document` instances.
	* @returns Promise that resolves when the documents have been added.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		await this.ensureTableInDatabase();
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	/**
	* Method to add vectors to the vector store. It converts the vectors into
	* rows and inserts them into the database.
	* @param vectors Array of vectors.
	* @param documents Array of `Document` instances.
	* @returns Promise that resolves when the vectors have been added.
	*/
	async addVectors(vectors, documents) {
		const rows = vectors.map((embedding, idx) => {
			const embeddingString = `[${embedding.join(",")}]`;
			const documentRow = {
				pageContent: documents[idx].pageContent,
				embedding: embeddingString,
				metadata: documents[idx].metadata
			};
			return documentRow;
		});
		const documentRepository = this.appDataSource.getRepository(this.documentEntity);
		const chunkSize = 500;
		for (let i = 0; i < rows.length; i += chunkSize) {
			const chunk = rows.slice(i, i + chunkSize);
			try {
				await documentRepository.save(chunk);
			} catch (e) {
				console.error(e);
				throw new Error(`Error inserting: ${chunk[0].pageContent}`);
			}
		}
	}
	/**
	* Method to perform a similarity search in the vector store. It returns
	* the `k` most similar documents to the query vector, along with their
	* similarity scores.
	* @param query Query vector.
	* @param k Number of most similar documents to return.
	* @param filter Optional filter to apply to the search.
	* @returns Promise that resolves with an array of tuples, each containing a `TypeORMVectorStoreDocument` and its similarity score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const embeddingString = `[${query.join(",")}]`;
		const _filter = filter ?? "{}";
		const queryString = `
      SELECT *, embedding <=> $1 as "_distance"
      FROM ${this.tableName}
      WHERE metadata @> $2
      ORDER BY "_distance" ASC
      LIMIT $3;`;
		const documents = await this.appDataSource.query(queryString, [
			embeddingString,
			_filter,
			k
		]);
		const results = [];
		for (const doc of documents) if (doc._distance != null && doc.pageContent != null) {
			const document = new Document(doc);
			document.id = doc.id;
			results.push([document, doc._distance]);
		}
		return results;
	}
	/**
	* Method to ensure the existence of the table in the database. It creates
	* the table if it does not already exist.
	* @returns Promise that resolves when the table has been ensured.
	*/
	async ensureTableInDatabase() {
		await this.appDataSource.query("CREATE EXTENSION IF NOT EXISTS vector;");
		await this.appDataSource.query(`
      CREATE TABLE IF NOT EXISTS ${this.getTablePath()} (
        "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        "pageContent" text,
        metadata jsonb,
        embedding vector
      );
    `);
	}
	getTablePath() {
		if (!this.schemaName) return this.tableName;
		return `"${this.schemaName}"."${this.tableName}"`;
	}
	/**
	* Static method to create a new `TypeORMVectorStore` instance from an
	* array of texts and their metadata. It converts the texts into
	* `Document` instances and adds them to the store.
	* @param texts Array of texts.
	* @param metadatas Array of metadata objects or a single metadata object.
	* @param embeddings Embeddings instance.
	* @param dbConfig `TypeORMVectorStoreArgs` instance.
	* @returns Promise that resolves with a new instance of `TypeORMVectorStore`.
	*/
	static async fromTexts(texts, metadatas, embeddings, dbConfig) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return TypeORMVectorStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create a new `TypeORMVectorStore` instance from an
	* array of `Document` instances. It adds the documents to the store.
	* @param docs Array of `Document` instances.
	* @param embeddings Embeddings instance.
	* @param dbConfig `TypeORMVectorStoreArgs` instance.
	* @returns Promise that resolves with a new instance of `TypeORMVectorStore`.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = await TypeORMVectorStore.fromDataSource(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Static method to create a new `TypeORMVectorStore` instance from an
	* existing index.
	* @param embeddings Embeddings instance.
	* @param dbConfig `TypeORMVectorStoreArgs` instance.
	* @returns Promise that resolves with a new instance of `TypeORMVectorStore`.
	*/
	static async fromExistingIndex(embeddings, dbConfig) {
		const instance = await TypeORMVectorStore.fromDataSource(embeddings, dbConfig);
		return instance;
	}
};

//#endregion
export { TypeORMVectorStore, TypeORMVectorStoreDocument, typeorm_exports };
//# sourceMappingURL=typeorm.js.map