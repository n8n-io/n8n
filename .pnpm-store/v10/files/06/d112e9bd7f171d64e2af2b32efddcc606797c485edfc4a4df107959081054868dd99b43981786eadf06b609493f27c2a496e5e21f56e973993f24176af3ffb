import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Document } from "@langchain/core/documents";
import pg from "pg";
import { VectorStore } from "@langchain/core/vectorstores";
import { maximalMarginalRelevance } from "@langchain/core/utils/math";

//#region src/vectorstores/pgvector.ts
var pgvector_exports = {};
__export(pgvector_exports, { PGVectorStore: () => PGVectorStore });
/**
* PGVector vector store integration.
*
* Setup:
* Install `@langchain/community` and `pg`.
*
* If you wish to generate ids, you should also install the `uuid` package.
*
* ```bash
* npm install @langchain/community pg uuid
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/_langchain_community.vectorstores_pgvector.PGVectorStore.html#constructor)
*
* <details open>
* <summary><strong>Instantiate</strong></summary>
*
* ```typescript
* import {
*   PGVectorStore,
*   DistanceStrategy,
* } from "@langchain/community/vectorstores/pgvector";
*
* // Or other embeddings
* import { OpenAIEmbeddings } from "@langchain/openai";
* import { PoolConfig } from "pg";
*
* const embeddings = new OpenAIEmbeddings({
*   model: "text-embedding-3-small",
* });
*
* // Sample config
* const config = {
*   postgresConnectionOptions: {
*     type: "postgres",
*     host: "127.0.0.1",
*     port: 5433,
*     user: "myuser",
*     password: "ChangeMe",
*     database: "api",
*   } as PoolConfig,
*   tableName: "testlangchainjs",
*   columns: {
*     idColumnName: "id",
*     vectorColumnName: "vector",
*     contentColumnName: "content",
*     metadataColumnName: "metadata",
*   },
*   // supported distance strategies: cosine (default), innerProduct, or euclidean
*   distanceStrategy: "cosine" as DistanceStrategy,
* };
*
* const vectorStore = await PGVectorStore.initialize(embeddings, config);
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Add documents</strong></summary>
*
* ```typescript
* import type { Document } from '@langchain/core/documents';
*
* const document1 = { pageContent: "foo", metadata: { baz: "bar", num: 4 } };
* const document2 = { pageContent: "thud", metadata: { bar: "baz" } };
* const document3 = { pageContent: "i will be deleted :(", metadata: {} };
*
* const documents: Document[] = [document1, document2, document3];
* const ids = ["1", "2", "3"];
* await vectorStore.addDocuments(documents, { ids });
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Delete documents</strong></summary>
*
* ```typescript
* await vectorStore.delete({ ids: ["3"] });
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Similarity search</strong></summary>
*
* ```typescript
* const results = await vectorStore.similaritySearch("thud", 1);
* for (const doc of results) {
*   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
* }
* // Output: * thud [{"baz":"bar"}]
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Similarity search with filter</strong></summary>
*
* ```typescript
* const resultsWithFilter = await vectorStore.similaritySearch("thud", 1, { baz: "bar" });
*
* for (const doc of resultsWithFilter) {
*   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
* }
* // Output: * foo [{"baz":"bar"}]
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Similarity search with filter operators</strong></summary>
*
* Available filter operators: in, notIn, lte, lt, gte, gt, neq
*
* ```typescript
* const resultsWithFilters = await vectorStore.similaritySearch("thud", 1, {
*   baz: {
*     in: ["bar", "car"],
*   },
*   num: {
*     lte: 10
*   }
* });
*
* for (const doc of resultsWithFilters) {
*   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
* }
* // Output: * foo [{"baz":"bar"}]
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Similarity search with score</strong></summary>
*
* ```typescript
* const resultsWithScore = await vectorStore.similaritySearchWithScore("qux", 1);
* for (const [doc, score] of resultsWithScore) {
*   console.log(`* [SIM=${score.toFixed(6)}] ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
* }
* // Output: * [SIM=0.000000] qux [{"bar":"baz","baz":"bar"}]
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>As a retriever</strong></summary>
*
* ```typescript
* const retriever = vectorStore.asRetriever({
*   searchType: "mmr", // Leave blank for standard similarity search
*   k: 1,
* });
* const resultAsRetriever = await retriever.invoke("thud");
* console.log(resultAsRetriever);
*
* // Output: [Document({ metadata: { "baz":"bar" }, pageContent: "thud" })]
* ```
* </details>
*
* <br />
*/
var PGVectorStore = class PGVectorStore extends VectorStore {
	tableName;
	collectionTableName;
	collectionName = "langchain";
	collectionMetadata;
	schemaName;
	idColumnName;
	vectorColumnName;
	contentColumnName;
	extensionSchemaName;
	skipInitializationCheck;
	metadataColumnName;
	filter;
	_verbose;
	pool;
	client;
	chunkSize = 500;
	distanceStrategy = "cosine";
	scoreNormalization = "distance";
	_vectorstoreType() {
		return "pgvector";
	}
	/**
	* Performs similarity search with both distance and similarity scores returned.
	* This method returns both the raw distance and the normalized similarity score for each result.
	* @param query - Query vector.
	* @param k - Number of most similar documents to return.
	* @param filter - Optional filter to apply to the search.
	* @returns Promise that resolves with an array of tuples, each containing a `Document` and an object with both distance and similarity scores.
	*/
	async similaritySearchVectorWithScores(query, k, filter) {
		const results = await this.searchPostgres(query, k, filter, false);
		const enhancedResults = [];
		for (const [doc, distance] of results) {
			const bothScores = this.convertDistanceToBoth(distance);
			enhancedResults.push([doc, bothScores]);
		}
		return enhancedResults;
	}
	/**
	* Converts distance to similarity score based on the distance strategy.
	* @param distance Raw distance value from the database
	* @returns Similarity score (higher = more similar)
	*
	* For cosine distance: similarity = (2 - distance) / 2, keeping values in [0, 1] range
	* For euclidean distance: similarity = 1 / (1 + distance)
	* For innerProduct: similarity = -distance (pgvector returns negative inner product)
	*/
	convertDistanceToSimilarity(distance) {
		switch (this.distanceStrategy) {
			case "cosine": return (2 - distance) / 2;
			case "euclidean": return 1 / (1 + distance);
			case "innerProduct": return -distance;
			default: return distance;
		}
	}
	/**
	* Converts distance to score based on the normalization setting.
	* @param distance Raw distance value from the database
	* @returns Raw distance if scoreNormalization is "distance", otherwise similarity score
	*/
	convertDistanceToScore(distance) {
		return this.scoreNormalization === "distance" ? distance : this.convertDistanceToSimilarity(distance);
	}
	/**
	* Converts distance to both distance and similarity score, useful when users want access to both values.
	* @param distance Raw distance value from the database
	* @returns Object containing both the raw distance and the similarity score
	*/
	convertDistanceToBoth(distance) {
		return {
			distance,
			similarity: this.convertDistanceToSimilarity(distance)
		};
	}
	constructor(embeddings, config) {
		super(embeddings, config);
		this.tableName = config.tableName;
		if (config.collectionName !== void 0 && config.collectionTableName === void 0) throw new Error(`If supplying a "collectionName", you must also supply a "collectionTableName".`);
		this.collectionTableName = config.collectionTableName;
		this.collectionName = config.collectionName ?? "langchain";
		this.collectionMetadata = config.collectionMetadata ?? null;
		this.schemaName = config.schemaName ?? null;
		this.extensionSchemaName = config.extensionSchemaName ?? null;
		this.skipInitializationCheck = config.skipInitializationCheck ?? false;
		this.filter = config.filter;
		this.vectorColumnName = config.columns?.vectorColumnName ?? "embedding";
		this.contentColumnName = config.columns?.contentColumnName ?? "text";
		this.idColumnName = config.columns?.idColumnName ?? "id";
		this.metadataColumnName = config.columns?.metadataColumnName ?? "metadata";
		if (!config.postgresConnectionOptions && !config.pool) throw new Error("You must provide either a `postgresConnectionOptions` object or a `pool` instance.");
		const pool = config.pool ?? new pg.Pool(config.postgresConnectionOptions);
		this.pool = pool;
		this.chunkSize = config.chunkSize ?? 500;
		this.distanceStrategy = config.distanceStrategy ?? this.distanceStrategy;
		this.scoreNormalization = config.scoreNormalization ?? "distance";
		const langchainVerbose = getEnvironmentVariable("LANGCHAIN_VERBOSE");
		if (langchainVerbose === "true") this._verbose = true;
		else if (langchainVerbose === "false") this._verbose = false;
		else this._verbose = config.verbose;
	}
	get computedTableName() {
		return this.schemaName == null ? `${this.tableName}` : `"${this.schemaName}"."${this.tableName}"`;
	}
	get computedCollectionTableName() {
		return this.schemaName == null ? `${this.collectionTableName}` : `"${this.schemaName}"."${this.collectionTableName}"`;
	}
	get computedOperatorString() {
		let operator;
		switch (this.distanceStrategy) {
			case "cosine":
				operator = "<=>";
				break;
			case "innerProduct":
				operator = "<#>";
				break;
			case "euclidean":
				operator = "<->";
				break;
			default: throw new Error(`Unknown distance strategy: ${this.distanceStrategy}`);
		}
		return this.extensionSchemaName !== null ? `OPERATOR(${this.extensionSchemaName}.${operator})` : operator;
	}
	/**
	* Static method to create a new `PGVectorStore` instance from a
	* connection. It creates a table if one does not exist, and calls
	* `connect` to return a new instance of `PGVectorStore`.
	*
	* @param embeddings - Embeddings instance.
	* @param fields - `PGVectorStoreArgs` instance
	* @param fields.dimensions Number of dimensions in your vector data type. For example, use 1536 for OpenAI's `text-embedding-3-small`. If not set, indexes like HNSW might not be used during query time.
	* @returns A new instance of `PGVectorStore`.
	*/
	static async initialize(embeddings, config) {
		const { dimensions,...rest } = config;
		const postgresqlVectorStore = new PGVectorStore(embeddings, rest);
		await postgresqlVectorStore._initializeClient();
		await postgresqlVectorStore.ensureTableInDatabase(dimensions);
		if (postgresqlVectorStore.collectionTableName) await postgresqlVectorStore.ensureCollectionTableInDatabase();
		return postgresqlVectorStore;
	}
	async _initializeClient() {
		this.client = await this.pool.connect();
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
	* Inserts a row for the collectionName provided at initialization if it does not
	* exist and returns the collectionId.
	*
	* @returns The collectionId for the given collectionName.
	*/
	async getOrCreateCollection() {
		const queryString = `
      SELECT uuid from ${this.computedCollectionTableName}
      WHERE name = $1;
    `;
		const queryResult = await this.pool.query(queryString, [this.collectionName]);
		let collectionId = queryResult.rows[0]?.uuid;
		if (!collectionId) {
			const insertString = `
        INSERT INTO ${this.computedCollectionTableName}(
          uuid,
          name,
          cmetadata
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2
        )
        RETURNING uuid;
      `;
			const insertResult = await this.pool.query(insertString, [this.collectionName, this.collectionMetadata]);
			collectionId = insertResult.rows[0]?.uuid;
		}
		return collectionId;
	}
	/**
	* Generates the SQL placeholders for a specific row at the provided index.
	*
	* @param index - The index of the row for which placeholders need to be generated.
	* @param numOfColumns - The number of columns we are inserting data into.
	* @returns The SQL placeholders for the row values.
	*/
	generatePlaceholderForRowAt(index, numOfColumns) {
		const placeholders = [];
		for (let i = 0; i < numOfColumns; i += 1) placeholders.push(`$${index * numOfColumns + i + 1}`);
		return `(${placeholders.join(", ")})`;
	}
	/**
	* Constructs the SQL query for inserting rows into the specified table.
	*
	* @param rows - The rows of data to be inserted, consisting of values and records.
	* @returns The complete SQL INSERT INTO query string.
	*/
	async buildInsertQuery(rows) {
		let collectionId;
		if (this.collectionTableName) collectionId = await this.getOrCreateCollection();
		const columns = [
			this.contentColumnName,
			this.vectorColumnName,
			this.metadataColumnName
		];
		if (collectionId) columns.push("collection_id");
		if (rows[0] !== void 0 && rows.length !== 0 && columns.length === rows[0].length - 1) columns.push(this.idColumnName);
		const valuesPlaceholders = rows.map((_, j) => this.generatePlaceholderForRowAt(j, columns.length)).join(", ");
		const text = `
      INSERT INTO ${this.computedTableName}(
        ${columns.map((column) => `"${column}"`).join(", ")}
      )
      VALUES ${valuesPlaceholders}
    `;
		return text;
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
		const ids = options?.ids;
		if (ids !== void 0 && ids.length !== vectors.length) throw new Error("The number of ids must match the number of vectors provided.");
		const rows = [];
		let collectionId;
		if (this.collectionTableName) collectionId = await this.getOrCreateCollection();
		for (let i = 0; i < vectors.length; i += 1) {
			const values = [];
			const embedding = vectors[i];
			const embeddingString = `[${embedding.join(",")}]`;
			values.push(documents[i].pageContent.replace(/\0/g, ""), embeddingString.replace(/\0/g, ""), documents[i].metadata);
			if (collectionId) values.push(collectionId);
			if (ids) values.push(ids[i]);
			rows.push(values);
		}
		for (let i = 0; i < rows.length; i += this.chunkSize) {
			const chunk = rows.slice(i, i + this.chunkSize);
			const insertQuery = await this.buildInsertQuery(chunk);
			const flatValues = chunk.flat();
			try {
				await this.pool.query(insertQuery, flatValues);
			} catch (e) {
				console.error(e);
				throw new Error(`Error inserting: ${e.message}`);
			}
		}
	}
	/**
	* Method to delete documents from the vector store. It deletes the
	* documents that match the provided ids.
	*
	* @param ids - Array of document ids.
	* @returns Promise that resolves when the documents have been deleted.
	*/
	async deleteById(ids) {
		let collectionId;
		if (this.collectionTableName) collectionId = await this.getOrCreateCollection();
		const params = collectionId ? [ids, collectionId] : [ids];
		const queryString = `
      DELETE FROM ${this.computedTableName}
      WHERE ${collectionId ? "collection_id = $2 AND " : ""}${this.idColumnName} = ANY($1::uuid[])
    `;
		await this.pool.query(queryString, params);
	}
	/**
	* Builds WHERE clause conditions and parameters for metadata filtering.
	*
	* @param filter - The metadata filter object.
	* @param paramOffset - Starting parameter index offset.
	* @returns Object containing whereClauses array and parameters array.
	*/
	buildFilterClauses(filter, paramOffset = 0) {
		const whereClauses = [];
		const parameters = [];
		let paramCount = paramOffset;
		for (const [key, value] of Object.entries(filter)) if (typeof value === "object" && value !== null) {
			const _value = value;
			const currentParamCount = paramCount;
			if (Array.isArray(_value.in)) {
				const placeholders = _value.in.map((_, index) => `$${currentParamCount + index + 1}`).join(",");
				whereClauses.push(`${this.metadataColumnName}->>'${key}' IN (${placeholders})`);
				parameters.push(..._value.in);
				paramCount += _value.in.length;
			}
			if (Array.isArray(_value.notIn)) {
				const placeholders = _value.notIn.map((_, index) => `$${currentParamCount + index + 1}`).join(",");
				whereClauses.push(`${this.metadataColumnName}->>'${key}' NOT IN (${placeholders})`);
				parameters.push(..._value.notIn);
				paramCount += _value.notIn.length;
			}
			if (Array.isArray(_value.arrayContains)) {
				const placeholders = _value.arrayContains.map((_, index) => `$${currentParamCount + index + 1}`).join(",");
				whereClauses.push(`${this.metadataColumnName}->'${key}' ?| array[${placeholders}]`);
				parameters.push(..._value.arrayContains);
				paramCount += _value.arrayContains.length;
			}
			const operators = {
				gt: ">",
				gte: ">=",
				lt: "<",
				lte: "<="
			};
			for (const [opKey, sqlOp] of Object.entries(operators)) if (Object.prototype.hasOwnProperty.call(_value, opKey) && typeof _value[opKey] === "number") {
				paramCount += 1;
				whereClauses.push(`(${this.metadataColumnName}->>'${key}')::numeric ${sqlOp} $${paramCount}`);
				parameters.push(_value[opKey]);
			}
			if (Object.prototype.hasOwnProperty.call(_value, "neq")) {
				paramCount += 1;
				whereClauses.push(`(${this.metadataColumnName}->>'${key}' IS NULL OR (${this.metadataColumnName}->>'${key}')::text != $${paramCount})`);
				parameters.push(String(_value.neq));
			}
		} else {
			paramCount += 1;
			whereClauses.push(`${this.metadataColumnName}->>'${key}' = $${paramCount}`);
			parameters.push(value);
		}
		return {
			whereClauses,
			parameters,
			paramCount
		};
	}
	/**
	* Method to delete documents from the vector store. It deletes the
	* documents whose metadata matches the filter conditions.
	*
	* @param filter - An object representing the Metadata filter.
	* @returns Promise that resolves when the documents have been deleted.
	*/
	async deleteByFilter(filter) {
		let collectionId;
		if (this.collectionTableName) collectionId = await this.getOrCreateCollection();
		const baseParameters = [];
		const baseClauses = [];
		let paramOffset = 0;
		if (collectionId) {
			paramOffset = 1;
			baseParameters.push(collectionId);
			baseClauses.push("collection_id = $1");
		}
		const { whereClauses, parameters } = this.buildFilterClauses(filter, paramOffset);
		const allParameters = [...baseParameters, ...parameters];
		const allClauses = [...baseClauses, ...whereClauses];
		const whereClause = allClauses.length ? `WHERE ${allClauses.join(" AND ")}` : "";
		const queryString = `
      DELETE FROM ${this.computedTableName}
      ${whereClause}
    `;
		return await this.pool.query(queryString, allParameters);
	}
	/**
	* Method to delete documents from the vector store. It deletes the
	* documents that match the provided ids or metadata filter. Matches ids
	* exactly and metadata filter according to postgres jsonb containment. Ids and filter
	* are mutually exclusive.
	*
	* @param params - Object containing either an array of ids or a metadata filter object.
	* @returns Promise that resolves when the documents have been deleted.
	* @throws Error if neither ids nor filter are provided, or if both are provided.
	* @example <caption>Delete by ids</caption>
	* await vectorStore.delete({ ids: ["id1", "id2"] });
	* @example <caption>Delete by filter</caption>
	* await vectorStore.delete({ filter: { a: 1, b: 2 } });
	*/
	async delete(params) {
		const { ids, filter } = params;
		if (!(ids || filter)) throw new Error("You must specify either ids or a filter when deleting documents.");
		if (ids && filter) throw new Error("You cannot specify both ids and a filter when deleting documents.");
		if (ids) await this.deleteById(ids);
		else if (filter) await this.deleteByFilter(filter);
	}
	/**
	* Method to perform a similarity search in the vector store. It returns the `k` most similar documents to the query text.
	* @param query - Query vector.
	* @param k - Number of most similar documents to return.
	* @param filter - Optional filter to apply to the search.
	* @param includeEmbedding Whether to include the embedding vectors in the results.
	* @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
	*/
	async searchPostgres(query, k, filter, includeEmbedding) {
		const embeddingString = `[${query.join(",")}]`;
		const _filter = filter ?? {};
		let collectionId;
		if (this.collectionTableName) collectionId = await this.getOrCreateCollection();
		const baseParameters = [embeddingString, k];
		const baseClauses = [];
		let paramOffset = 2;
		if (collectionId) {
			paramOffset = 3;
			baseParameters.push(collectionId);
			baseClauses.push("collection_id = $3");
		}
		const { whereClauses, parameters } = this.buildFilterClauses(_filter, paramOffset);
		const allParameters = [...baseParameters, ...parameters];
		const allClauses = [...baseClauses, ...whereClauses];
		const whereClause = allClauses.length ? `WHERE ${allClauses.join(" AND ")}` : "";
		const queryString = `
      SELECT *, "${this.vectorColumnName}" ${this.computedOperatorString} $1 as "_distance"
      FROM ${this.computedTableName}
      ${whereClause}
      ORDER BY "_distance" ASC
      LIMIT $2;
      `;
		const documents = (await this.pool.query(queryString, allParameters)).rows;
		const results = [];
		for (const doc of documents) if (doc._distance != null && doc[this.contentColumnName] != null) {
			const document = new Document({
				pageContent: doc[this.contentColumnName],
				metadata: doc[this.metadataColumnName],
				id: doc[this.idColumnName]
			});
			if (includeEmbedding) document.metadata[this.vectorColumnName] = doc[this.vectorColumnName];
			const score = this.convertDistanceToScore(doc._distance);
			results.push([document, score]);
		}
		return results;
	}
	/**
	* Method to perform a similarity search in the vector store. It returns
	* the `k` most similar documents to the query vector, along with their
	* similarity scores.
	* @param query - Query vector.
	* @param k - Number of most similar documents to return.
	* @param filter - Optional filter to apply to the search.
	* @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		return this.searchPostgres(query, k, filter, false);
	}
	/**
	* Method to ensure the existence of the table in the database. It creates
	* the table if it does not already exist.
	* @param dimensions Number of dimensions in your vector data type. For example, use 1536 for OpenAI's `text-embedding-3-small`. If not set, indexes like HNSW might not be used during query time.
	* @returns Promise that resolves when the table has been ensured.
	*/
	async ensureTableInDatabase(dimensions) {
		if (this.skipInitializationCheck) return;
		const vectorQuery = this.extensionSchemaName == null ? "CREATE EXTENSION IF NOT EXISTS vector;" : `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA "${this.extensionSchemaName}";`;
		const extensionName = this.extensionSchemaName == null ? "vector" : `"${this.extensionSchemaName}"."vector"`;
		const vectorColumnType = dimensions ? `${extensionName}(${dimensions})` : extensionName;
		const tableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.computedTableName} (
        "${this.idColumnName}" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        "${this.contentColumnName}" text,
        "${this.metadataColumnName}" jsonb,
        "${this.vectorColumnName}" ${vectorColumnType}
      );
    `;
		await this.pool.query(vectorQuery);
		await this.pool.query(tableQuery);
	}
	/**
	* Method to ensure the existence of the collection table in the database.
	* It creates the table if it does not already exist.
	*
	* @returns Promise that resolves when the collection table has been ensured.
	*/
	async ensureCollectionTableInDatabase() {
		try {
			if (this.skipInitializationCheck) return;
			const queryString = `
        CREATE TABLE IF NOT EXISTS ${this.computedCollectionTableName} (
          uuid uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          name character varying,
          cmetadata jsonb
        );

        CREATE INDEX IF NOT EXISTS idx_${this.collectionTableName}_name ON ${this.computedCollectionTableName}(name);

        ALTER TABLE ${this.computedTableName}
          ADD COLUMN collection_id uuid;

        ALTER TABLE ${this.computedTableName}
          ADD CONSTRAINT ${this.tableName}_collection_id_fkey
          FOREIGN KEY (collection_id)
          REFERENCES ${this.computedCollectionTableName}(uuid)
          ON DELETE CASCADE;
      `;
			await this.pool.query(queryString);
		} catch (e) {
			if (!e.message.includes("already exists")) {
				console.error(e);
				throw new Error(`Error adding column or creating index: ${e.message}`);
			}
		}
	}
	/**
	* Static method to create a new `PGVectorStore` instance from an
	* array of texts and their metadata. It converts the texts into
	* `Document` instances and adds them to the store.
	*
	* @param texts - Array of texts.
	* @param metadatas - Array of metadata objects or a single metadata object.
	* @param embeddings - Embeddings instance.
	* @param dbConfig - `PGVectorStoreArgs` instance.
	* @returns Promise that resolves with a new instance of `PGVectorStore`.
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
		return PGVectorStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Static method to create a new `PGVectorStore` instance from an
	* array of `Document` instances. It adds the documents to the store.
	*
	* @param docs - Array of `Document` instances.
	* @param embeddings - Embeddings instance.
	* @param dbConfig - `PGVectorStoreArgs` instance.
	* @returns Promise that resolves with a new instance of `PGVectorStore`.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = await PGVectorStore.initialize(embeddings, dbConfig);
		await instance.addDocuments(docs, { ids: dbConfig.ids });
		return instance;
	}
	/**
	* Closes all the clients in the pool and terminates the pool.
	*
	* @returns Promise that resolves when all clients are closed and the pool is terminated.
	*/
	async end() {
		this.client?.release();
		return this.pool.end();
	}
	/**
	* Method to create the HNSW index on the vector column.
	*
	* @param dimensions - Defines the number of dimensions in your vector data type, up to 2000. For example, use 1536 for OpenAI's text-embedding-ada-002 and Amazon's amazon.titan-embed-text-v1 models.
	* @param m - The max number of connections per layer (16 by default). Index build time improves with smaller values, while higher values can speed up search queries.
	* @param efConstruction -  The size of the dynamic candidate list for constructing the graph (64 by default). A higher value can potentially improve the index quality at the cost of index build time.
	* @param distanceFunction -  The distance function name you want to use, is automatically selected based on the distanceStrategy.
	* @param namespace -  The namespace is used to create the index with a specific name. This is useful when you want to create multiple indexes on the same database schema (within the same schema in PostgreSQL, the index name must be unique across all tables).
	* @returns Promise that resolves with the query response of creating the index.
	*/
	async createHnswIndex(config) {
		let idxDistanceFunction = config?.distanceFunction || "vector_cosine_ops";
		const prefix = config?.namespace ? `${config.namespace}_` : "";
		switch (this.distanceStrategy) {
			case "cosine":
				idxDistanceFunction = "vector_cosine_ops";
				break;
			case "innerProduct":
				idxDistanceFunction = "vector_ip_ops";
				break;
			case "euclidean":
				idxDistanceFunction = "vector_l2_ops";
				break;
			default: throw new Error(`Unknown distance strategy: ${this.distanceStrategy}`);
		}
		const createIndexQuery = `CREATE INDEX IF NOT EXISTS ${prefix}${this.vectorColumnName}_embedding_hnsw_idx
        ON ${this.computedTableName} USING hnsw ((${this.vectorColumnName}::vector(${config.dimensions})) ${idxDistanceFunction})
        WITH (
            m=${config?.m || 16},
            ef_construction=${config?.efConstruction || 64}
        );`;
		try {
			await this.pool.query(createIndexQuery);
		} catch (e) {
			console.error(`Failed to create HNSW index on table ${this.computedTableName}, error: ${e}`);
		}
	}
	/**
	* Return documents selected using the maximal marginal relevance.
	* Maximal marginal relevance optimizes for similarity to the query AND
	* diversity among selected documents.
	* @param query Text to look up documents similar to.
	* @param options.k=4 Number of documents to return.
	* @param options.fetchK=20 Number of documents to fetch before passing to
	*     the MMR algorithm.
	* @param options.lambda=0.5 Number between 0 and 1 that determines the
	*     degree of diversity among the results, where 0 corresponds to maximum
	*     diversity and 1 to minimum diversity.
	* @returns List of documents selected by maximal marginal relevance.
	*/
	async maxMarginalRelevanceSearch(query, options) {
		const { k = 4, fetchK = 20, lambda = .5, filter } = options;
		const queryEmbedding = await this.embeddings.embedQuery(query);
		const docs = await this.searchPostgres(queryEmbedding, fetchK, filter, true);
		const embeddingList = docs.map((doc) => JSON.parse(doc[0].metadata[this.vectorColumnName]));
		const mmrIndexes = maximalMarginalRelevance(queryEmbedding, embeddingList, lambda, k);
		const mmrDocs = mmrIndexes.map((index) => {
			const doc = docs[index][0];
			delete doc.metadata[this.vectorColumnName];
			return docs[index][0];
		});
		return mmrDocs;
	}
};

//#endregion
export { PGVectorStore, pgvector_exports };
//# sourceMappingURL=pgvector.js.map