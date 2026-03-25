const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const redis = require_rolldown_runtime.__toESM(require("redis"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));

//#region src/vectorstores.ts
/**
* Class representing a RedisVectorStore. It extends the VectorStore class
* and includes methods for adding documents and vectors, performing
* similarity searches, managing the index, and more.
*/
var RedisVectorStore = class RedisVectorStore extends __langchain_core_vectorstores.VectorStore {
	redisClient;
	indexName;
	indexOptions;
	createIndexOptions;
	keyPrefix;
	contentKey;
	metadataKey;
	vectorKey;
	filter;
	ttl;
	customSchema;
	_vectorstoreType() {
		return "redis";
	}
	/**
	* Validates metadata against the custom schema if defined
	* @param metadata The metadata object to validate
	* @throws Error if validation fails
	*/
	validateMetadata(metadata) {
		if (!this.customSchema) return;
		for (const [fieldName, fieldConfig] of Object.entries(this.customSchema)) {
			const value = metadata[fieldName];
			if (fieldConfig.required && (value === void 0 || value === null)) throw new Error(`Required metadata field '${fieldName}' is missing`);
			if (value === void 0 || value === null) continue;
			switch (fieldConfig.type) {
				case redis.SchemaFieldTypes.NUMERIC:
					if (typeof value !== "number") throw new Error(`Metadata field '${fieldName}' must be a number, got ${typeof value}`);
					break;
				case redis.SchemaFieldTypes.TAG:
					if (typeof value !== "string" && !Array.isArray(value)) throw new Error(`Metadata field '${fieldName}' must be a string or array, got ${typeof value}`);
					break;
				case redis.SchemaFieldTypes.TEXT:
					if (typeof value !== "string") throw new Error(`Metadata field '${fieldName}' must be a string, got ${typeof value}`);
					break;
				default: break;
			}
		}
	}
	constructor(embeddings, _dbConfig) {
		super(embeddings, _dbConfig);
		this.redisClient = _dbConfig.redisClient;
		this.indexName = _dbConfig.indexName;
		this.indexOptions = _dbConfig.indexOptions ?? {
			ALGORITHM: redis.VectorAlgorithms.HNSW,
			DISTANCE_METRIC: "COSINE"
		};
		this.keyPrefix = _dbConfig.keyPrefix ?? `doc:${this.indexName}:`;
		this.contentKey = _dbConfig.contentKey ?? "content";
		this.metadataKey = _dbConfig.metadataKey ?? "metadata";
		this.vectorKey = _dbConfig.vectorKey ?? "content_vector";
		this.filter = _dbConfig.filter;
		this.ttl = _dbConfig.ttl;
		this.customSchema = _dbConfig.customSchema;
		this.createIndexOptions = {
			ON: "HASH",
			PREFIX: this.keyPrefix,
			..._dbConfig.createIndexOptions
		};
	}
	/**
	* Method for adding documents to the RedisVectorStore. It first converts
	* the documents to texts and then adds them as vectors.
	* @param documents The documents to add.
	* @param options Optional parameters for adding the documents.
	* @returns A promise that resolves when the documents have been added.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Method for adding vectors to the RedisVectorStore. It checks if the
	* index exists and creates it if it doesn't, then adds the vectors in
	* batches.
	* @param vectors The vectors to add.
	* @param documents The documents associated with the vectors.
	* @param keys Optional keys for the vectors.
	* @param batchSize The size of the batches in which to add the vectors. Defaults to 1000.
	* @returns A promise that resolves when the vectors have been added.
	*/
	async addVectors(vectors, documents, { keys, batchSize = 1e3 } = {}) {
		if (!vectors.length || !vectors[0].length) throw new Error("No vectors provided");
		await this.createIndex(vectors[0].length);
		const info = await this.redisClient.ft.info(this.indexName);
		const lastKeyCount = parseInt(info.numDocs || info.num_docs, 10) || 0;
		if (this.customSchema) for (let idx = 0; idx < documents.length; idx += 1) {
			const metadata = documents[idx] && documents[idx].metadata ? documents[idx].metadata : {};
			this.validateMetadata(metadata);
		}
		const multi = this.redisClient.multi();
		await Promise.all(vectors.map(async (vector, idx) => {
			const key = keys && keys.length ? keys[idx] : `${this.keyPrefix}${idx + lastKeyCount}`;
			const metadata = documents[idx] && documents[idx].metadata ? documents[idx].metadata : {};
			const hashFields = {
				[this.vectorKey]: this.getFloat32Buffer(vector),
				[this.contentKey]: documents[idx].pageContent,
				[this.metadataKey]: this.escapeSpecialChars(JSON.stringify(metadata))
			};
			if (this.customSchema) for (const [fieldName, fieldConfig] of Object.entries(this.customSchema)) {
				const fieldValue = metadata[fieldName];
				if (fieldValue !== void 0 && fieldValue !== null) {
					const indexedFieldName = `${this.metadataKey}.${fieldName}`;
					if (fieldConfig.type === redis.SchemaFieldTypes.TAG && Array.isArray(fieldValue)) {
						const separator = fieldConfig.SEPARATOR || ",";
						hashFields[indexedFieldName] = fieldValue.join(separator);
					} else hashFields[indexedFieldName] = fieldValue;
				}
			}
			multi.hSet(key, hashFields);
			if (this.ttl) multi.expire(key, this.ttl);
			if (idx % batchSize === 0) await multi.exec();
		}));
		await multi.exec();
	}
	/**
	* Method for performing a similarity search in the RedisVectorStore. It
	* returns the documents and their scores.
	* @param query The query vector.
	* @param k The number of nearest neighbors to return.
	* @param filter Optional filter to apply to the search.
	* @returns A promise that resolves to an array of documents and their scores.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		if (filter && this.filter) throw new Error("cannot provide both `filter` and `this.filter`");
		const _filter = filter ?? this.filter;
		const results = await this.redisClient.ft.search(this.indexName, ...this.buildQuery(query, k, _filter));
		const result = [];
		if (results.total) {
			for (const res of results.documents) if (res.value) {
				const document = res.value;
				if (document.vector_score) result.push([new __langchain_core_documents.Document({
					pageContent: document[this.contentKey] ?? "",
					metadata: JSON.parse(this.unEscapeSpecialChars(document.metadata ?? "{}"))
				}), Number(document.vector_score)]);
			}
		}
		return result;
	}
	/**
	* Method for performing a similarity search with custom metadata filtering.
	* Uses the custom schema fields for efficient filtering.
	* @param query The query vector.
	* @param k The number of nearest neighbors to return.
	* @param metadataFilter Object with metadata field filters using custom schema.
	* @returns A promise that resolves to an array of documents and their scores.
	*/
	async similaritySearchVectorWithScoreAndMetadata(query, k, metadataFilter) {
		const results = await this.redisClient.ft.search(this.indexName, ...this.buildCustomQuery(query, k, metadataFilter));
		const result = [];
		if (results.total) {
			for (const res of results.documents) if (res.value) {
				const document = res.value;
				if (document.vector_score) {
					let metadata = {};
					try {
						metadata = JSON.parse(this.unEscapeSpecialChars(document.metadata ?? "{}"));
					} catch {
						metadata = {};
					}
					if (this.customSchema) for (const fieldName of Object.keys(this.customSchema)) {
						const fieldKey = `${this.metadataKey}.${fieldName}`;
						if (document[fieldKey] !== void 0) metadata[fieldName] = document[fieldKey];
					}
					result.push([new __langchain_core_documents.Document({
						pageContent: document[this.contentKey] ?? "",
						metadata
					}), Number(document.vector_score)]);
				}
			}
		}
		return result;
	}
	/**
	* Static method for creating a new instance of RedisVectorStore from
	* texts. It creates documents from the texts and metadata, then adds them
	* to the RedisVectorStore.
	* @param texts The texts to add.
	* @param metadatas The metadata associated with the texts.
	* @param embeddings The embeddings to use.
	* @param dbConfig The configuration for the RedisVectorStore.
	* @param docsOptions The document options to use.
	* @returns A promise that resolves to a new instance of RedisVectorStore.
	*/
	static fromTexts(texts, metadatas, embeddings, dbConfig, docsOptions) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new __langchain_core_documents.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return RedisVectorStore.fromDocuments(docs, embeddings, dbConfig, docsOptions);
	}
	/**
	* Static method for creating a new instance of RedisVectorStore from
	* documents. It adds the documents to the RedisVectorStore.
	* @param docs The documents to add.
	* @param embeddings The embeddings to use.
	* @param dbConfig The configuration for the RedisVectorStore.
	* @param docsOptions The document options to use.
	* @returns A promise that resolves to a new instance of RedisVectorStore.
	*/
	static async fromDocuments(docs, embeddings, dbConfig, docsOptions) {
		const instance = new this(embeddings, dbConfig);
		await instance.addDocuments(docs, docsOptions);
		return instance;
	}
	/**
	* Method for checking if an index exists in the RedisVectorStore.
	* @returns A promise that resolves to a boolean indicating whether the index exists.
	*/
	async checkIndexExists() {
		try {
			await this.redisClient.ft.info(this.indexName);
		} catch (err) {
			if (err?.message.includes("unknown command")) throw new Error("Failed to run FT.INFO command. Please ensure that you are running a RediSearch-capable Redis instance: https://js.langchain.com/docs/integrations/vectorstores/redis/#setup");
			return false;
		}
		return true;
	}
	/**
	* Method for creating an index in the RedisVectorStore. If the index
	* already exists, it does nothing.
	* @param dimensions The dimensions of the index
	* @returns A promise that resolves when the index has been created.
	*/
	async createIndex(dimensions = 1536) {
		if (await this.checkIndexExists()) return;
		const schema = {
			[this.vectorKey]: {
				type: redis.SchemaFieldTypes.VECTOR,
				TYPE: "FLOAT32",
				DIM: dimensions,
				...this.indexOptions
			},
			[this.contentKey]: redis.SchemaFieldTypes.TEXT,
			[this.metadataKey]: redis.SchemaFieldTypes.TEXT
		};
		if (this.customSchema) for (const [fieldName, fieldConfig] of Object.entries(this.customSchema)) {
			const indexedFieldName = `${this.metadataKey}.${fieldName}`;
			if (fieldConfig.type === redis.SchemaFieldTypes.TAG) schema[indexedFieldName] = {
				type: redis.SchemaFieldTypes.TAG,
				SORTABLE: fieldConfig.SORTABLE ? true : void 0,
				SEPARATOR: fieldConfig.SEPARATOR || ","
			};
			else if (fieldConfig.type === redis.SchemaFieldTypes.NUMERIC) schema[indexedFieldName] = {
				type: redis.SchemaFieldTypes.NUMERIC,
				SORTABLE: fieldConfig.SORTABLE ? true : void 0
			};
			else if (fieldConfig.type === redis.SchemaFieldTypes.TEXT) schema[indexedFieldName] = {
				type: redis.SchemaFieldTypes.TEXT,
				SORTABLE: fieldConfig.SORTABLE ? true : void 0
			};
			else schema[indexedFieldName] = fieldConfig.type;
		}
		await this.redisClient.ft.create(this.indexName, schema, this.createIndexOptions);
	}
	/**
	* Method for dropping an index from the RedisVectorStore.
	* @param deleteDocuments Optional boolean indicating whether to drop the associated documents.
	* @returns A promise that resolves to a boolean indicating whether the index was dropped.
	*/
	async dropIndex(deleteDocuments) {
		try {
			const options = deleteDocuments ? { DD: deleteDocuments } : void 0;
			await this.redisClient.ft.dropIndex(this.indexName, options);
			return true;
		} catch {
			return false;
		}
	}
	/**
	* Deletes vectors from the vector store.
	*
	* Supports two deletion modes:
	* - Delete all documents by dropping the entire index and recreating it
	* - Delete specific documents by their IDs using Redis DEL operation
	*
	* @param params - The deletion parameters. Must be one of:
	*   - `{ deleteAll: boolean }` - If true, drops the entire index and all associated documents
	*   - `{ ids: string[] }` - Array of document IDs to delete. IDs will be automatically prefixed with the configured keyPrefix
	* @returns A promise that resolves when the deletion operation is complete
	* @throws {Error} Throws an error if invalid parameters are provided (neither deleteAll nor ids specified)
	*
	* @example
	* Delete all documents:
	* ```typescript
	* await vectorStore.delete({ deleteAll: true });
	* ```
	*
	* @example
	* Delete specific documents by ID:
	* ```typescript
	* await vectorStore.delete({ ids: ['doc1', 'doc2', 'doc3'] });
	* ```
	*/
	async delete(params) {
		if ("deleteAll" in params && params.deleteAll) await this.dropIndex(true);
		else if ("ids" in params && params.ids && params.ids.length > 0) {
			const keys = params.ids.map((id) => `${this.keyPrefix}${id}`);
			await this.redisClient.del(keys);
		} else throw new Error(`Invalid parameters passed to "delete".`);
	}
	buildQuery(query, k, filter) {
		const vectorScoreField = "vector_score";
		let hybridFields = "*";
		if (filter && filter.length) hybridFields = `@${this.metadataKey}:(${this.prepareFilter(filter)})`;
		const baseQuery = `${hybridFields} => [KNN ${k} @${this.vectorKey} $vector AS ${vectorScoreField}]`;
		const returnFields = [
			this.metadataKey,
			this.contentKey,
			vectorScoreField
		];
		if (this.customSchema) for (const fieldName of Object.keys(this.customSchema)) returnFields.push(`${this.metadataKey}.${fieldName}`);
		const options = {
			PARAMS: { vector: this.getFloat32Buffer(query) },
			RETURN: returnFields,
			SORTBY: vectorScoreField,
			DIALECT: 2,
			LIMIT: {
				from: 0,
				size: k
			}
		};
		return [baseQuery, options];
	}
	/**
	* Builds a query with custom metadata field filtering
	* @param query The query vector
	* @param k Number of results to return
	* @param metadataFilter Object with metadata field filters
	* @returns Query string and search options
	*/
	buildCustomQuery(query, k, metadataFilter) {
		const vectorScoreField = "vector_score";
		let hybridFields = "*";
		if (metadataFilter && this.customSchema) {
			const filterClauses = [];
			for (const [fieldName, value] of Object.entries(metadataFilter)) if (this.customSchema[fieldName]) {
				const fieldConfig = this.customSchema[fieldName];
				const indexedFieldName = `${this.metadataKey}.${fieldName}`;
				if (fieldConfig.type === redis.SchemaFieldTypes.NUMERIC) if (typeof value === "object" && value !== null) {
					if ("min" in value && "max" in value) filterClauses.push(`@${indexedFieldName}:[${value.min} ${value.max}]`);
					else if ("min" in value) filterClauses.push(`@${indexedFieldName}:[${value.min} +inf]`);
					else if ("max" in value) filterClauses.push(`@${indexedFieldName}:[-inf ${value.max}]`);
				} else filterClauses.push(`@${indexedFieldName}:[${value} ${value}]`);
				else if (fieldConfig.type === redis.SchemaFieldTypes.TAG) if (Array.isArray(value)) {
					const tagFilter = value.map((v) => `{${v}}`).join("|");
					filterClauses.push(`@${indexedFieldName}:(${tagFilter})`);
				} else filterClauses.push(`@${indexedFieldName}:{${value}}`);
				else if (fieldConfig.type === redis.SchemaFieldTypes.TEXT) filterClauses.push(`@${indexedFieldName}:(${value})`);
			}
			if (filterClauses.length > 0) hybridFields = filterClauses.join(" ");
		}
		const baseQuery = `${hybridFields} => [KNN ${k} @${this.vectorKey} $vector AS ${vectorScoreField}]`;
		const returnFields = [
			this.metadataKey,
			this.contentKey,
			vectorScoreField
		];
		if (this.customSchema) for (const fieldName of Object.keys(this.customSchema)) returnFields.push(`${this.metadataKey}.${fieldName}`);
		const options = {
			PARAMS: { vector: this.getFloat32Buffer(query) },
			RETURN: returnFields,
			SORTBY: vectorScoreField,
			DIALECT: 2,
			LIMIT: {
				from: 0,
				size: k
			}
		};
		return [baseQuery, options];
	}
	prepareFilter(filter) {
		if (Array.isArray(filter)) return filter.map(this.escapeSpecialChars).join("|");
		return filter;
	}
	/**
	* Escapes all '-', ':', and '"' characters.
	* RediSearch considers these all as special characters, so we need
	* to escape them
	* @see https://redis.io/docs/stack/search/reference/query_syntax
	*
	* @param str
	* @returns
	*/
	escapeSpecialChars(str) {
		return str.replaceAll("-", "\\-").replaceAll(":", "\\:").replaceAll(`"`, `\\"`);
	}
	/**
	* Unescapes all '-', ':', and '"' characters, returning the original string
	*
	* @param str
	* @returns
	*/
	unEscapeSpecialChars(str) {
		return str.replaceAll("\\-", "-").replaceAll("\\:", ":").replaceAll(`\\"`, `"`);
	}
	/**
	* Converts the vector to the buffer Redis needs to
	* correctly store an embedding
	*
	* @param vector
	* @returns Buffer
	*/
	getFloat32Buffer(vector) {
		return Buffer.from(new Float32Array(vector).buffer);
	}
};

//#endregion
exports.RedisVectorStore = RedisVectorStore;
//# sourceMappingURL=vectorstores.cjs.map