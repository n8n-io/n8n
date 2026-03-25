import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { neon } from "@neondatabase/serverless";

//#region src/vectorstores/neon.ts
var neon_exports = {};
__export(neon_exports, { NeonPostgres: () => NeonPostgres });
/**
* Class that provides an interface to a Neon Postgres database. It
* extends the `VectorStore` base class and implements methods for adding
* documents and vectors, performing similarity searches, and ensuring the
* existence of a table in the database.
*/
var NeonPostgres = class NeonPostgres extends VectorStore {
	tableName;
	schemaName;
	idColumnName;
	vectorColumnName;
	contentColumnName;
	metadataColumnName;
	filter;
	_verbose;
	neonConnectionString;
	_vectorstoreType() {
		return "neon-postgres";
	}
	constructor(embeddings, config) {
		super(embeddings, config);
		this._verbose = config.verbose ?? getEnvironmentVariable("LANGCHAIN_VERBOSE") === "true";
		this.neonConnectionString = config.connectionString;
		this.tableName = config.tableName ?? "vectorstore_documents";
		this.schemaName = config.schemaName;
		this.filter = config.filter;
		this.vectorColumnName = config.columns?.vectorColumnName ?? "embedding";
		this.contentColumnName = config.columns?.contentColumnName ?? "text";
		this.idColumnName = config.columns?.idColumnName ?? "id";
		this.metadataColumnName = config.columns?.metadataColumnName ?? "metadata";
	}
	get computedTableName() {
		return typeof this.schemaName !== "string" ? `${this.tableName}` : `"${this.schemaName}"."${this.tableName}"`;
	}
	/**
	* Static method to create a new `NeonPostgres` instance from a
	* connection. It creates a table if one does not exist.
	*
	* @param embeddings - Embeddings instance.
	* @param fields - `NeonPostgresArgs` instance.
	* @returns A new instance of `NeonPostgres`.
	*/
	static async initialize(embeddings, config) {
		const neonVectorStore = new NeonPostgres(embeddings, config);
		await neonVectorStore.ensureTableInDatabase();
		return neonVectorStore;
	}
	/**
	* Constructs the SQL query for inserting rows into the specified table.
	*
	* @param rows - The rows of data to be inserted, consisting of values and records.
	* @param chunkIndex - The starting index for generating query placeholders based on chunk positioning.
	* @returns The complete SQL INSERT INTO query string.
	*/
	async runInsertQuery(rows, useIdColumn) {
		const placeholders = rows.map((row, index) => {
			const base = index * row.length;
			return `(${row.map((_, j) => `$${base + 1 + j}`)})`;
		});
		const queryString = `
    INSERT INTO ${this.computedTableName} (
        ${useIdColumn ? `${this.idColumnName},` : ""}
        ${this.contentColumnName}, 
        ${this.vectorColumnName}, 
        ${this.metadataColumnName}
    ) VALUES ${placeholders.join(", ")}
    ON CONFLICT (${this.idColumnName}) 
    DO UPDATE 
    SET 
        ${this.contentColumnName} = EXCLUDED.${this.contentColumnName},
        ${this.vectorColumnName} = EXCLUDED.${this.vectorColumnName},
        ${this.metadataColumnName} = EXCLUDED.${this.metadataColumnName}
    RETURNING ${this.idColumnName}
    `;
		const flatValues = rows.flat();
		const sql = neon(this.neonConnectionString);
		return await sql.query(queryString, flatValues);
	}
	/**
	* Method to add vectors to the vector store. It converts the vectors into
	* rows and inserts them into the database.
	*
	* @param vectors - Array of vectors.
	* @param documents - Array of `Document` instances.
	* @param options - Optional arguments for adding documents
	* @returns Promise that resolves when the vectors have been added.
	*/
	async addVectors(vectors, documents, options) {
		if (options?.ids !== void 0 && options?.ids.length !== vectors.length) throw new Error(`If provided, the length of "ids" must be the same as the number of vectors.`);
		const rows = vectors.map((embedding, idx) => {
			const embeddingString = `[${embedding.join(",")}]`;
			const row = [
				documents[idx].pageContent,
				embeddingString,
				documents[idx].metadata
			];
			if (options?.ids) return [options.ids[idx], ...row];
			return row;
		});
		const chunkSize = 500;
		const ids = [];
		for (let i = 0; i < rows.length; i += chunkSize) {
			const chunk = rows.slice(i, i + chunkSize);
			try {
				const result = await this.runInsertQuery(chunk, options?.ids !== void 0);
				ids.push(...result.map((row) => row[this.idColumnName]));
			} catch (e) {
				console.error(e);
				throw new Error(`Error inserting: ${e.message}`);
			}
		}
		return ids;
	}
	/**
	* Method to perform a similarity search in the vector store. It returns
	* the `k` most similar documents to the query vector, along with their
	* similarity scores.
	*
	* @param query - Query vector.
	* @param k - Number of most similar documents to return.
	* @param filter - Optional filter to apply to the search.
	* @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const embeddingString = `[${query.join(",")}]`;
		const _filter = filter ?? {};
		const whereClauses = [];
		const parameters = [embeddingString, k];
		let paramCount = parameters.length;
		for (const [key, value] of Object.entries(_filter)) if (typeof value === "object" && value !== null) {
			const currentParamCount = paramCount;
			const placeholders = value.in.map((_, index) => `$${currentParamCount + index + 1}`).join(",");
			whereClauses.push(`${this.metadataColumnName}->>'${key}' IN (${placeholders})`);
			parameters.push(...value.in);
			paramCount += value.in.length;
		} else {
			paramCount += 1;
			whereClauses.push(`${this.metadataColumnName}->>'${key}' = $${paramCount}`);
			parameters.push(value);
		}
		const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
		const queryString = `
      SELECT *, ${this.vectorColumnName} <=> $1 as "_distance"
      FROM ${this.computedTableName}
      ${whereClause}
      ORDER BY "_distance" ASC
      LIMIT $2;`;
		const sql = neon(this.neonConnectionString);
		const documents = await sql.query(queryString, parameters);
		const results = [];
		for (const doc of documents) if (doc._distance != null && doc[this.contentColumnName] != null) {
			const document = new Document({
				pageContent: doc[this.contentColumnName],
				metadata: doc[this.metadataColumnName]
			});
			results.push([document, doc._distance]);
		}
		return results;
	}
	/**
	* Method to add documents to the vector store. It converts the documents into
	* vectors, and adds them to the store.
	*
	* @param documents - Array of `Document` instances.
	* @param options - Optional arguments for adding documents
	* @returns Promise that resolves when the documents have been added.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Method to delete documents from the vector store. It deletes the
	* documents that match the provided ids.
	*
	* @param ids - Array of document ids.
	* @param deleteAll - Boolean to delete all documents.
	* @returns Promise that resolves when the documents have been deleted.
	*/
	async delete(params) {
		const sql = neon(this.neonConnectionString);
		if (params.ids !== void 0) await sql.query(`DELETE FROM ${this.computedTableName} 
        WHERE ${this.idColumnName} 
        IN (${params.ids.map((_, idx) => `$${idx + 1}`)})`, params.ids);
		else if (params.deleteAll) await sql.query(`TRUNCATE TABLE ${this.tableName}`);
	}
	/**
	* Method to ensure the existence of the table to store vectors in
	* the database. It creates the table if it does not already exist.
	*
	* @returns Promise that resolves when the table has been ensured.
	*/
	async ensureTableInDatabase() {
		const sql = neon(this.neonConnectionString);
		await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
		await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
		await sql.query(`
      CREATE TABLE IF NOT EXISTS ${this.computedTableName} (
        ${this.idColumnName} uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        ${this.contentColumnName} text,
        ${this.metadataColumnName} jsonb,
        ${this.vectorColumnName} vector
      );
    `);
	}
	/**
	* Static method to create a new `NeonPostgres` instance from an
	* array of texts and their metadata. It converts the texts into
	* `Document` instances and adds them to the store.
	*
	* @param texts - Array of texts.
	* @param metadatas - Array of metadata objects or a single metadata object.
	* @param embeddings - Embeddings instance.
	* @param dbConfig - `NeonPostgresArgs` instance.
	* @returns Promise that resolves with a new instance of `NeonPostgresArgs`.
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
		return this.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create a new `NeonPostgres` instance from an
	* array of `Document` instances. It adds the documents to the store.
	*
	* @param docs - Array of `Document` instances.
	* @param embeddings - Embeddings instance.
	* @param dbConfig - `NeonPostgreseArgs` instance.
	* @returns Promise that resolves with a new instance of `NeonPostgres`.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = await this.initialize(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
};

//#endregion
export { NeonPostgres, neon_exports };
//# sourceMappingURL=neon.js.map