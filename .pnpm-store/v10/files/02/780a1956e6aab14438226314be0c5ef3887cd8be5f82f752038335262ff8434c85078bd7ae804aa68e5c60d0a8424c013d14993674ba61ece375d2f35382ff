import { __export } from "../_virtual/rolldown_runtime.js";
import { SqliteWhereBuilder } from "../utils/sqlite_where_builder.js";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/libsql.ts
var libsql_exports = {};
__export(libsql_exports, { LibSQLVectorStore: () => LibSQLVectorStore });
/**
* A vector store using LibSQL/Turso for storage and retrieval.
*/
var LibSQLVectorStore = class LibSQLVectorStore extends VectorStore {
	db;
	table;
	column;
	/**
	* Returns the type of vector store.
	* @returns {string} The string "libsql".
	*/
	_vectorstoreType() {
		return "libsql";
	}
	/**
	* Initializes a new instance of the LibSQLVectorStore.
	* @param {EmbeddingsInterface} embeddings - The embeddings interface to use.
	* @param {Client} db - The LibSQL client instance.
	* @param {LibSQLVectorStoreArgs} options - Configuration options for the vector store.
	*/
	constructor(embeddings, options) {
		super(embeddings, options);
		this.db = options.db;
		this.table = options.table || "vectors";
		this.column = options.column || "embedding";
	}
	/**
	* Adds documents to the vector store.
	* @param {Document<Metadata>[]} documents - The documents to add.
	* @returns {Promise<string[]>} The IDs of the added documents.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		const embeddings = await this.embeddings.embedDocuments(texts);
		return this.addVectors(embeddings, documents);
	}
	/**
	* Adds vectors to the vector store.
	* @param {number[][]} vectors - The vectors to add.
	* @param {Document<Metadata>[]} documents - The documents associated with the vectors.
	* @returns {Promise<string[]>} The IDs of the added vectors.
	*/
	async addVectors(vectors, documents) {
		const rows = vectors.map((embedding, idx) => ({
			content: documents[idx].pageContent,
			embedding: `[${embedding.join(",")}]`,
			metadata: JSON.stringify(documents[idx].metadata)
		}));
		const batchSize = 100;
		const ids = [];
		for (let i = 0; i < rows.length; i += batchSize) {
			const chunk = rows.slice(i, i + batchSize);
			const insertQueries = chunk.map((row) => ({
				sql: `INSERT INTO ${this.table} (content, metadata, ${this.column}) VALUES (:content, :metadata, vector(:embedding)) RETURNING ${this.table}.rowid AS id`,
				args: row
			}));
			const results = await this.db.batch(insertQueries);
			ids.push(...results.flatMap((result) => result.rows.map((row) => String(row.id))));
		}
		return ids;
	}
	/**
	* Performs a similarity search using a vector query and returns documents with their scores.
	* @param {number[]} query - The query vector.
	* @param {number} k - The number of results to return.
	* @returns {Promise<[Document<Metadata>, number][]>} An array of tuples containing the similar documents and their scores.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		if (!query.every((num) => typeof num === "number" && !Number.isNaN(num))) throw new Error("Invalid query vector: all elements must be numbers");
		const queryVector = `[${query.join(",")}]`;
		const sql = {
			sql: `SELECT ${this.table}.rowid as id, ${this.table}.content, ${this.table}.metadata, vector_distance_cos(${this.table}.${this.column}, vector(:queryVector)) AS distance
      FROM vector_top_k('idx_${this.table}_${this.column}', vector(:queryVector), CAST(:k AS INTEGER)) as top_k
      JOIN ${this.table} ON top_k.rowid = ${this.table}.rowid`,
			args: {
				queryVector,
				k
			}
		};
		if (typeof filter === "string") sql.sql += ` AND ${filter}`;
		else if (typeof filter === "object") if ("sql" in filter) {
			sql.sql += ` AND ${filter.sql}`;
			sql.args = {
				...filter.args,
				...sql.args
			};
		} else {
			const builder = new SqliteWhereBuilder(filter);
			const where = builder.buildWhereClause();
			sql.sql += ` AND ${where.sql}`;
			sql.args = {
				...where.args,
				...sql.args
			};
		}
		const results = await this.db.execute(sql);
		return results.rows.map((row) => {
			const metadata = JSON.parse(row.metadata);
			const doc = new Document({
				id: String(row.id),
				metadata,
				pageContent: row.content
			});
			return [doc, row.distance];
		});
	}
	/**
	* Deletes vectors from the store.
	* @param {Object} params - Delete parameters.
	* @param {string[] | number[]} [params.ids] - The ids of the vectors to delete.
	* @returns {Promise<void>}
	*/
	async delete(params) {
		if (params.deleteAll) await this.db.execute(`DELETE FROM ${this.table}`);
		else if (params.ids !== void 0) await this.db.batch(params.ids.map((id) => ({
			sql: `DELETE FROM ${this.table} WHERE rowid = :id`,
			args: { id }
		})));
		else throw new Error(`You must provide an "ids" parameter or a "deleteAll" parameter.`);
	}
	/**
	* Creates a new LibSQLVectorStore instance from texts.
	* @param {string[]} texts - The texts to add to the store.
	* @param {object[] | object} metadatas - The metadata for the texts.
	* @param {EmbeddingsInterface} embeddings - The embeddings interface to use.
	* @param {Client} dbClient - The LibSQL client instance.
	* @param {LibSQLVectorStoreArgs} [options] - Configuration options for the vector store.
	* @returns {Promise<LibSQLVectorStore>} A new LibSQLVectorStore instance.
	*/
	static async fromTexts(texts, metadatas, embeddings, options) {
		const docs = texts.map((text, i) => {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			return new Document({
				pageContent: text,
				metadata
			});
		});
		return LibSQLVectorStore.fromDocuments(docs, embeddings, options);
	}
	/**
	* Creates a new LibSQLVectorStore instance from documents.
	* @param {Document[]} docs - The documents to add to the store.
	* @param {EmbeddingsInterface} embeddings - The embeddings interface to use.
	* @param {Client} dbClient - The LibSQL client instance.
	* @param {LibSQLVectorStoreArgs} [options] - Configuration options for the vector store.
	* @returns {Promise<LibSQLVectorStore>} A new LibSQLVectorStore instance.
	*/
	static async fromDocuments(docs, embeddings, options) {
		const instance = new this(embeddings, options);
		await instance.addDocuments(docs);
		return instance;
	}
};

//#endregion
export { LibSQLVectorStore, libsql_exports };
//# sourceMappingURL=libsql.js.map