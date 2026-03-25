const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __clickhouse_client = require_rolldown_runtime.__toESM(require("@clickhouse/client"));
const mysql2 = require_rolldown_runtime.__toESM(require("mysql2"));

//#region src/vectorstores/clickhouse.ts
var clickhouse_exports = {};
require_rolldown_runtime.__export(clickhouse_exports, { ClickHouseStore: () => ClickHouseStore });
/**
* Class for interacting with the ClickHouse database. It extends the
* VectorStore class and provides methods for adding vectors and
* documents, searching for similar vectors, and creating instances from
* texts or documents.
*/
var ClickHouseStore = class ClickHouseStore extends __langchain_core_vectorstores.VectorStore {
	client;
	indexType;
	indexParam;
	indexQueryParams;
	columnMap;
	database;
	table;
	isInitialized = false;
	_vectorstoreType() {
		return "clickhouse";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.indexType = args.indexType || "annoy";
		this.indexParam = args.indexParam || { L2Distance: 100 };
		this.indexQueryParams = args.indexQueryParams || {};
		this.columnMap = args.columnMap || {
			id: "id",
			document: "document",
			embedding: "embedding",
			metadata: "metadata",
			uuid: "uuid"
		};
		this.database = args.database || "default";
		this.table = args.table || "vector_table";
		this.client = (0, __clickhouse_client.createClient)({
			host: `${args.protocol ?? "https://"}${args.host}:${args.port}`,
			username: args.username,
			password: args.password,
			session_id: uuid.v4()
		});
	}
	/**
	* Method to add vectors to the ClickHouse database.
	* @param vectors The vectors to add.
	* @param documents The documents associated with the vectors.
	* @returns Promise that resolves when the vectors have been added.
	*/
	async addVectors(vectors, documents) {
		if (vectors.length === 0) return;
		if (!this.isInitialized) await this.initialize(vectors[0].length);
		const queryStr = this.buildInsertQuery(vectors, documents);
		await this.client.exec({ query: queryStr });
	}
	/**
	* Method to add documents to the ClickHouse database.
	* @param documents The documents to add.
	* @returns Promise that resolves when the documents have been added.
	*/
	async addDocuments(documents) {
		return this.addVectors(await this.embeddings.embedDocuments(documents.map((d) => d.pageContent)), documents);
	}
	/**
	* Method to search for vectors that are similar to a given query vector.
	* @param query The query vector.
	* @param k The number of similar vectors to return.
	* @param filter Optional filter for the search results.
	* @returns Promise that resolves with an array of tuples, each containing a Document and a score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		if (!this.isInitialized) await this.initialize(query.length);
		const queryStr = this.buildSearchQuery(query, k, filter);
		const queryResultSet = await this.client.query({ query: queryStr });
		const queryResult = await queryResultSet.json();
		const result = queryResult.data.map((item) => [new __langchain_core_documents.Document({
			pageContent: item.document,
			metadata: item.metadata
		}), item.dist]);
		return result;
	}
	/**
	* Static method to create an instance of ClickHouseStore from texts.
	* @param texts The texts to use.
	* @param metadatas The metadata associated with the texts.
	* @param embeddings The embeddings to use.
	* @param args The arguments for the ClickHouseStore.
	* @returns Promise that resolves with a new instance of ClickHouseStore.
	*/
	static async fromTexts(texts, metadatas, embeddings, args) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new __langchain_core_documents.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return ClickHouseStore.fromDocuments(docs, embeddings, args);
	}
	/**
	* Static method to create an instance of ClickHouseStore from documents.
	* @param docs The documents to use.
	* @param embeddings The embeddings to use.
	* @param args The arguments for the ClickHouseStore.
	* @returns Promise that resolves with a new instance of ClickHouseStore.
	*/
	static async fromDocuments(docs, embeddings, args) {
		const instance = new this(embeddings, args);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Static method to create an instance of ClickHouseStore from an existing
	* index.
	* @param embeddings The embeddings to use.
	* @param args The arguments for the ClickHouseStore.
	* @returns Promise that resolves with a new instance of ClickHouseStore.
	*/
	static async fromExistingIndex(embeddings, args) {
		const instance = new this(embeddings, args);
		await instance.initialize();
		return instance;
	}
	/**
	* Method to initialize the ClickHouse database.
	* @param dimension Optional dimension of the vectors.
	* @returns Promise that resolves when the database has been initialized.
	*/
	async initialize(dimension) {
		const dim = dimension ?? (await this.embeddings.embedQuery("test")).length;
		let indexParamStr = "";
		if (this.indexParam) if (typeof this.indexParam === "string") indexParamStr = this.indexParam;
		else indexParamStr = Object.entries(this.indexParam).map(([key, value]) => `'${key}', ${value}`).join(", ");
		const query = `
    CREATE TABLE IF NOT EXISTS ${this.database}.${this.table}(
      ${this.columnMap.id} Nullable(String),
      ${this.columnMap.document} Nullable(String),
      ${this.columnMap.embedding} Array(Float32),
      ${this.columnMap.metadata} JSON,
      ${this.columnMap.uuid} UUID DEFAULT generateUUIDv4(),
      CONSTRAINT cons_vec_len CHECK length(${this.columnMap.embedding}) = ${dim},
      INDEX vec_idx ${this.columnMap.embedding} TYPE ${this.indexType}(${indexParamStr}) GRANULARITY 1000
    ) ENGINE =  MergeTree ORDER BY ${this.columnMap.uuid} SETTINGS index_granularity = 8192;`;
		await this.client.exec({
			query,
			clickhouse_settings: {
				allow_experimental_object_type: 1,
				allow_experimental_annoy_index: 1
			}
		});
		this.isInitialized = true;
	}
	/**
	* Method to build an SQL query for inserting vectors and documents into
	* the ClickHouse database.
	* @param vectors The vectors to insert.
	* @param documents The documents to insert.
	* @returns The SQL query string.
	*/
	buildInsertQuery(vectors, documents) {
		const columnsStr = Object.values(Object.fromEntries(Object.entries(this.columnMap).filter(([key]) => key !== this.columnMap.uuid))).join(", ");
		const placeholders = vectors.map(() => "(?, ?, ?, ?)").join(", ");
		const values = [];
		for (let i = 0; i < vectors.length; i += 1) {
			const vector = vectors[i];
			const document = documents[i];
			values.push(uuid.v4(), this.escapeString(document.pageContent), JSON.stringify(vector), JSON.stringify(document.metadata));
		}
		const insertQueryStr = `
      INSERT INTO TABLE ${this.database}.${this.table}(${columnsStr}) 
      VALUES ${placeholders}
    `;
		const insertQuery = (0, mysql2.format)(insertQueryStr, values);
		return insertQuery;
	}
	escapeString(str) {
		return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
	}
	/**
	* Method to build an SQL query for searching for similar vectors in the
	* ClickHouse database.
	* @param query The query vector.
	* @param k The number of similar vectors to return.
	* @param filter Optional filter for the search results.
	* @returns The SQL query string.
	*/
	buildSearchQuery(query, k, filter) {
		const order = "ASC";
		const whereStr = filter ? `PREWHERE ${filter.whereStr}` : "";
		const placeholders = query.map(() => "?").join(", ");
		const settingStrings = [];
		if (this.indexQueryParams) for (const [key, value] of Object.entries(this.indexQueryParams)) settingStrings.push(`SETTING ${key}=${value}`);
		const searchQueryStr = `
      SELECT ${this.columnMap.document} AS document, ${this.columnMap.metadata} AS metadata, dist
      FROM ${this.database}.${this.table}
      ${whereStr}
      ORDER BY L2Distance(${this.columnMap.embedding}, [${placeholders}]) AS dist ${order}
      LIMIT ${k} ${settingStrings.join(" ")}
    `;
		const searchQuery = (0, mysql2.format)(searchQueryStr, query);
		return searchQuery;
	}
};

//#endregion
exports.ClickHouseStore = ClickHouseStore;
Object.defineProperty(exports, 'clickhouse_exports', {
  enumerable: true,
  get: function () {
    return clickhouse_exports;
  }
});
//# sourceMappingURL=clickhouse.cjs.map