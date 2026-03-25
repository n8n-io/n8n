import { __export } from "../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import * as uuid from "uuid";
import { VectorStore } from "@langchain/core/vectorstores";
import { createClient } from "@clickhouse/client";

//#region src/vectorstores/myscale.ts
var myscale_exports = {};
__export(myscale_exports, { MyScaleStore: () => MyScaleStore });
/**
* Class for interacting with the MyScale database. It extends the
* VectorStore class and provides methods for adding vectors and
* documents, searching for similar vectors, and creating instances from
* texts or documents.
*/
var MyScaleStore = class MyScaleStore extends VectorStore {
	client;
	indexType;
	indexParam;
	columnMap;
	database;
	table;
	metric;
	isInitialized = false;
	_vectorstoreType() {
		return "myscale";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.indexType = args.indexType || "MSTG";
		this.indexParam = args.indexParam || {};
		this.columnMap = args.columnMap || {
			id: "id",
			text: "text",
			vector: "vector",
			metadata: "metadata"
		};
		this.database = args.database || "default";
		this.table = args.table || "vector_table";
		this.metric = args.metric || "Cosine";
		this.client = createClient({
			host: `${args.protocol ?? "https://"}${args.host}:${args.port}`,
			username: args.username,
			password: args.password,
			session_id: uuid.v4()
		});
	}
	/**
	* Method to add vectors to the MyScale database.
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
	* Method to add documents to the MyScale database.
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
		const result = queryResult.data.map((item) => [new Document({
			pageContent: item.text,
			metadata: item.metadata
		}), item.dist]);
		return result;
	}
	/**
	* Static method to create an instance of MyScaleStore from texts.
	* @param texts The texts to use.
	* @param metadatas The metadata associated with the texts.
	* @param embeddings The embeddings to use.
	* @param args The arguments for the MyScaleStore.
	* @returns Promise that resolves with a new instance of MyScaleStore.
	*/
	static async fromTexts(texts, metadatas, embeddings, args) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return MyScaleStore.fromDocuments(docs, embeddings, args);
	}
	/**
	* Static method to create an instance of MyScaleStore from documents.
	* @param docs The documents to use.
	* @param embeddings The embeddings to use.
	* @param args The arguments for the MyScaleStore.
	* @returns Promise that resolves with a new instance of MyScaleStore.
	*/
	static async fromDocuments(docs, embeddings, args) {
		const instance = new this(embeddings, args);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Static method to create an instance of MyScaleStore from an existing
	* index.
	* @param embeddings The embeddings to use.
	* @param args The arguments for the MyScaleStore.
	* @returns Promise that resolves with a new instance of MyScaleStore.
	*/
	static async fromExistingIndex(embeddings, args) {
		const instance = new this(embeddings, args);
		await instance.initialize();
		return instance;
	}
	/**
	* Method to initialize the MyScale database.
	* @param dimension Optional dimension of the vectors.
	* @returns Promise that resolves when the database has been initialized.
	*/
	async initialize(dimension) {
		const dim = dimension ?? (await this.embeddings.embedQuery("test")).length;
		let indexParamStr = "";
		for (const [key, value] of Object.entries(this.indexParam)) indexParamStr += `, '${key}=${value}'`;
		const query = `
      CREATE TABLE IF NOT EXISTS ${this.database}.${this.table}(
        ${this.columnMap.id} String,
        ${this.columnMap.text} String,
        ${this.columnMap.vector} Array(Float32),
        ${this.columnMap.metadata} JSON,
        CONSTRAINT cons_vec_len CHECK length(${this.columnMap.vector}) = ${dim},
        VECTOR INDEX vidx ${this.columnMap.vector} TYPE ${this.indexType}('metric_type=${this.metric}'${indexParamStr})
      ) ENGINE = MergeTree ORDER BY ${this.columnMap.id}
    `;
		await this.client.exec({ query: "SET allow_experimental_object_type=1" });
		await this.client.exec({ query: "SET output_format_json_named_tuples_as_objects = 1" });
		await this.client.exec({ query });
		this.isInitialized = true;
	}
	/**
	* Method to build an SQL query for inserting vectors and documents into
	* the MyScale database.
	* @param vectors The vectors to insert.
	* @param documents The documents to insert.
	* @returns The SQL query string.
	*/
	buildInsertQuery(vectors, documents) {
		const columnsStr = Object.values(this.columnMap).join(", ");
		const data = [];
		for (let i = 0; i < vectors.length; i += 1) {
			const vector = vectors[i];
			const document = documents[i];
			const item = [
				`'${uuid.v4()}'`,
				`'${this.escapeString(document.pageContent)}'`,
				`[${vector}]`,
				`'${JSON.stringify(document.metadata)}'`
			].join(", ");
			data.push(`(${item})`);
		}
		const dataStr = data.join(", ");
		return `
      INSERT INTO TABLE
        ${this.database}.${this.table}(${columnsStr})
      VALUES
        ${dataStr}
    `;
	}
	escapeString(str) {
		return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
	}
	/**
	* Method to build an SQL query for searching for similar vectors in the
	* MyScale database.
	* @param query The query vector.
	* @param k The number of similar vectors to return.
	* @param filter Optional filter for the search results.
	* @returns The SQL query string.
	*/
	buildSearchQuery(query, k, filter) {
		const order = this.metric === "IP" ? "DESC" : "ASC";
		const whereStr = filter ? `PREWHERE ${filter.whereStr}` : "";
		return `
      SELECT ${this.columnMap.text} AS text, ${this.columnMap.metadata} AS metadata, dist
      FROM ${this.database}.${this.table}
      ${whereStr}
      ORDER BY distance(${this.columnMap.vector}, [${query}]) AS dist ${order}
      LIMIT ${k}
    `;
	}
};

//#endregion
export { MyScaleStore, myscale_exports };
//# sourceMappingURL=myscale.js.map