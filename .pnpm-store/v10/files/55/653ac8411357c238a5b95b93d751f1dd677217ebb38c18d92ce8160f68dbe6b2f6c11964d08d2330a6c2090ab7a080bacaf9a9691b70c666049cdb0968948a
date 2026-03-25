const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __vercel_postgres = require_rolldown_runtime.__toESM(require("@vercel/postgres"));

//#region src/vectorstores/vercel_postgres.ts
var vercel_postgres_exports = {};
require_rolldown_runtime.__export(vercel_postgres_exports, { VercelPostgres: () => VercelPostgres });
/**
* Class that provides an interface to a Vercel Postgres vector database. It
* extends the `VectorStore` base class and implements methods for adding
* documents and vectors and performing similarity searches.
*/
var VercelPostgres = class VercelPostgres extends __langchain_core_vectorstores.VectorStore {
	tableName;
	idColumnName;
	vectorColumnName;
	contentColumnName;
	metadataColumnName;
	filter;
	_verbose;
	pool;
	client;
	_vectorstoreType() {
		return "vercel";
	}
	constructor(embeddings, config) {
		super(embeddings, config);
		this.tableName = config.tableName ?? "langchain_vectors";
		this.filter = config.filter;
		this.vectorColumnName = config.columns?.vectorColumnName ?? "embedding";
		this.contentColumnName = config.columns?.contentColumnName ?? "text";
		this.idColumnName = config.columns?.idColumnName ?? "id";
		this.metadataColumnName = config.columns?.metadataColumnName ?? "metadata";
		this.pool = config.pool;
		this.client = config.client;
		this._verbose = config.verbose ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("LANGCHAIN_VERBOSE") === "true";
	}
	/**
	* Static method to create a new `VercelPostgres` instance from a
	* connection. It creates a table if one does not exist, and calls
	* `connect` to return a new instance of `VercelPostgres`.
	*
	* @param embeddings - Embeddings instance.
	* @param fields - `VercelPostgres` configuration options.
	* @returns A new instance of `VercelPostgres`.
	*/
	static async initialize(embeddings, config) {
		const pool = config?.pool ?? (0, __vercel_postgres.createPool)({
			maxUses: 1,
			...config?.postgresConnectionOptions
		});
		const client = config?.client ?? await pool.connect();
		const postgresqlVectorStore = new VercelPostgres(embeddings, {
			...config,
			pool,
			client
		});
		await postgresqlVectorStore.ensureTableInDatabase();
		return postgresqlVectorStore;
	}
	/**
	* Method to add documents to the vector store. It converts the documents into
	* vectors, and adds them to the store.
	*
	* @param documents - Array of `Document` instances.
	* @returns Promise that resolves when the documents have been added.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Generates the SQL placeholders for a specific row at the provided index.
	*
	* @param index - The index of the row for which placeholders need to be generated.
	* @returns The SQL placeholders for the row values.
	*/
	generatePlaceholderForRowAt(row, index) {
		const base = index * row.length;
		return `(${row.map((_, j) => `$${base + 1 + j}`)})`;
	}
	/**
	* Constructs the SQL query for inserting rows into the specified table.
	*
	* @param rows - The rows of data to be inserted, consisting of values and records.
	* @param chunkIndex - The starting index for generating query placeholders based on chunk positioning.
	* @returns The complete SQL INSERT INTO query string.
	*/
	async runInsertQuery(rows, useIdColumn) {
		const values = rows.map((row, j) => this.generatePlaceholderForRowAt(row, j));
		const flatValues = rows.flat();
		return this.client.query(`
    INSERT INTO ${this.tableName} (
      ${useIdColumn ? `${this.idColumnName},` : ""}
      ${this.contentColumnName}, 
      ${this.vectorColumnName}, 
      ${this.metadataColumnName}
    ) VALUES ${values.join(", ")}
    ON CONFLICT (${this.idColumnName}) 
    DO UPDATE 
    SET 
    ${this.contentColumnName} = EXCLUDED.${this.contentColumnName},
    ${this.vectorColumnName} = EXCLUDED.${this.vectorColumnName},
    ${this.metadataColumnName} = EXCLUDED.${this.metadataColumnName}
    RETURNING ${this.idColumnName}`, flatValues);
	}
	/**
	* Method to add vectors to the vector store. It converts the vectors into
	* rows and inserts them into the database.
	*
	* @param vectors - Array of vectors.
	* @param documents - Array of `Document` instances.
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
				ids.push(...result.rows.map((row) => row[this.idColumnName]));
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
		const values = [embeddingString, k];
		let paramCount = values.length;
		for (const [key, value] of Object.entries(_filter)) if (typeof value === "object" && value !== null) {
			const currentParamCount = paramCount;
			const placeholders = value.in.map((_, index) => `$${currentParamCount + index + 1}`).join(",");
			whereClauses.push(`${this.metadataColumnName}->>'${key}' IN (${placeholders})`);
			values.push(...value.in);
			paramCount += value.in.length;
		} else {
			paramCount += 1;
			whereClauses.push(`${this.metadataColumnName}->>'${key}' = $${paramCount}`);
			values.push(value);
		}
		const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
		const queryString = `
            SELECT *, ${this.vectorColumnName} <=> $1 as "_distance"
            FROM ${this.tableName}
            ${whereClause}
            ORDER BY "_distance" ASC
            LIMIT $2;`;
		const documents = (await this.client.query(queryString, values)).rows;
		const results = [];
		for (const doc of documents) if (doc._distance != null && doc[this.contentColumnName] != null) {
			const document = new __langchain_core_documents.Document({
				pageContent: doc[this.contentColumnName],
				metadata: doc[this.metadataColumnName]
			});
			results.push([document, doc._distance]);
		}
		return results;
	}
	async delete(params) {
		if (params.ids !== void 0) await this.client.query(`DELETE FROM ${this.tableName} WHERE ${this.idColumnName} IN (${params.ids.map((_, idx) => `$${idx + 1}`)})`, params.ids);
		else if (params.deleteAll) await this.client.query(`TRUNCATE TABLE ${this.tableName}`);
	}
	/**
	* Method to ensure the existence of the table in the database. It creates
	* the table if it does not already exist.
	*
	* @returns Promise that resolves when the table has been ensured.
	*/
	async ensureTableInDatabase() {
		await this.client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
		await this.client.query(`CREATE TABLE IF NOT EXISTS "${this.tableName}" (
      "${this.idColumnName}" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      "${this.contentColumnName}" text,
      "${this.metadataColumnName}" jsonb,
      "${this.vectorColumnName}" vector
    );`);
	}
	/**
	* Static method to create a new `VercelPostgres` instance from an
	* array of texts and their metadata. It converts the texts into
	* `Document` instances and adds them to the store.
	*
	* @param texts - Array of texts.
	* @param metadatas - Array of metadata objects or a single metadata object.
	* @param embeddings - Embeddings instance.
	* @param fields - `VercelPostgres` configuration options.
	* @returns Promise that resolves with a new instance of `VercelPostgres`.
	*/
	static async fromTexts(texts, metadatas, embeddings, dbConfig) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new __langchain_core_documents.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return this.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create a new `VercelPostgres` instance from an
	* array of `Document` instances. It adds the documents to the store.
	*
	* @param docs - Array of `Document` instances.
	* @param embeddings - Embeddings instance.
	* @param fields - `VercelPostgres` configuration options.
	* @returns Promise that resolves with a new instance of `VercelPostgres`.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = await this.initialize(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Closes all the clients in the pool and terminates the pool.
	*
	* @returns Promise that resolves when all clients are closed and the pool is terminated.
	*/
	async end() {
		await this.client?.release();
		return this.pool.end();
	}
};

//#endregion
exports.VercelPostgres = VercelPostgres;
Object.defineProperty(exports, 'vercel_postgres_exports', {
  enumerable: true,
  get: function () {
    return vercel_postgres_exports;
  }
});
//# sourceMappingURL=vercel_postgres.cjs.map