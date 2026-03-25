const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));

//#region src/vectorstores/prisma.ts
var prisma_exports = {};
require_rolldown_runtime.__export(prisma_exports, { PrismaVectorStore: () => PrismaVectorStore });
const IdColumnSymbol = Symbol("id");
const ContentColumnSymbol = Symbol("content");
const OpMap = {
	equals: "=",
	in: "IN",
	notIn: "NOT IN",
	isNull: "IS NULL",
	isNotNull: "IS NOT NULL",
	like: "LIKE",
	lt: "<",
	lte: "<=",
	gt: ">",
	gte: ">=",
	not: "<>"
};
/**
* A specific implementation of the VectorStore class that is designed to
* work with Prisma. It provides methods for adding models, documents, and
* vectors, as well as for performing similarity searches.
*/
var PrismaVectorStore = class PrismaVectorStore extends __langchain_core_vectorstores.VectorStore {
	tableName;
	vectorColumnName;
	selectColumns;
	filter;
	idColumn;
	contentColumn;
	columnTypes;
	/**
	* When true, addDocuments uses INSERT statements to create new records.
	* When false (default), addDocuments uses UPDATE statements to update existing records by ID.
	* Set to true when using with ParentDocumentRetriever or when documents don't pre-exist in the database.
	*/
	useInsert;
	static IdColumn = IdColumnSymbol;
	static ContentColumn = ContentColumnSymbol;
	db;
	Prisma;
	_vectorstoreType() {
		return "prisma";
	}
	constructor(embeddings, config) {
		super(embeddings, {});
		this.Prisma = config.prisma;
		this.db = config.db;
		const entries = Object.entries(config.columns);
		const idColumn = entries.find((i) => i[1] === IdColumnSymbol)?.[0];
		const contentColumn = entries.find((i) => i[1] === ContentColumnSymbol)?.[0];
		if (idColumn == null) throw new Error("Missing ID column");
		if (contentColumn == null) throw new Error("Missing content column");
		this.idColumn = idColumn;
		this.contentColumn = contentColumn;
		this.tableName = config.tableName;
		this.vectorColumnName = config.vectorColumnName;
		this.columnTypes = config.columnTypes;
		this.useInsert = config.useInsert ?? false;
		this.selectColumns = entries.map(([key, alias]) => alias && key || null).filter((x) => !!x);
		if (config.filter) this.filter = config.filter;
	}
	/**
	* Creates a new PrismaVectorStore with the specified model.
	* @param db The PrismaClient instance.
	* @returns An object with create, fromTexts, and fromDocuments methods.
	*/
	static withModel(db) {
		function create(embeddings, config) {
			return new PrismaVectorStore(embeddings, {
				...config,
				db
			});
		}
		async function fromTexts(texts, metadatas, embeddings, dbConfig) {
			const docs = [];
			for (let i = 0; i < texts.length; i += 1) {
				const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
				const newDoc = new __langchain_core_documents.Document({
					pageContent: texts[i],
					metadata
				});
				docs.push(newDoc);
			}
			return PrismaVectorStore.fromDocuments(docs, embeddings, {
				...dbConfig,
				db
			});
		}
		async function fromDocuments(docs, embeddings, dbConfig) {
			const instance = new PrismaVectorStore(embeddings, {
				...dbConfig,
				db
			});
			await instance.addDocuments(docs);
			return instance;
		}
		return {
			create,
			fromTexts,
			fromDocuments
		};
	}
	/**
	* Adds the specified models to the store.
	* @param models The models to add.
	* @returns A promise that resolves when the models have been added.
	*/
	async addModels(models) {
		return this.addDocuments(models.map((metadata) => {
			const pageContent = metadata[this.contentColumn];
			if (typeof pageContent !== "string") throw new Error("Content column must be a string");
			return new __langchain_core_documents.Document({
				pageContent,
				metadata
			});
		}));
	}
	/**
	* Adds the specified documents to the store.
	* @param documents The documents to add.
	* @returns A promise that resolves when the documents have been added.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		const vectors = await this.embeddings.embedDocuments(texts);
		if (this.useInsert) return this.addDocumentsWithVectors(vectors, documents);
		return this.addVectors(vectors, documents);
	}
	/**
	* Adds the specified vectors to the store.
	* @param vectors The vectors to add.
	* @param documents The documents associated with the vectors.
	* @returns A promise that resolves when the vectors have been added.
	*/
	async addVectors(vectors, documents) {
		const idColumnRaw = this.Prisma.raw(`"${this.idColumn}"`);
		const tableNameRaw = this.Prisma.raw(`"${this.tableName}"`);
		const vectorColumnRaw = this.Prisma.raw(`"${this.vectorColumnName}"`);
		await this.db.$transaction(vectors.map((vector, idx) => {
			const idValue = documents[idx].metadata[this.idColumn];
			const columnType = this.columnTypes?.[this.idColumn];
			let whereClause;
			if (columnType === "uuid") whereClause = this.Prisma.sql`${idColumnRaw} = ${idValue}::uuid`;
			else if (columnType === "integer") whereClause = this.Prisma.sql`${idColumnRaw} = ${idValue}::integer`;
			else if (columnType === "bigint") whereClause = this.Prisma.sql`${idColumnRaw} = ${idValue}::bigint`;
			else whereClause = this.Prisma.sql`${idColumnRaw} = ${idValue}`;
			return this.db.$executeRaw(this.Prisma.sql`UPDATE ${tableNameRaw}
            SET ${vectorColumnRaw} = ${`[${vector.join(",")}]`}::vector
            WHERE ${whereClause}
          `);
		}));
	}
	/**
	* Adds documents with their corresponding vectors to the store using INSERT statements.
	* This method ensures documents are created if they don't exist, making it compatible
	* with ParentDocumentRetriever which creates new child documents.
	* @param vectors The vectors to add.
	* @param documents The documents associated with the vectors.
	* @returns A promise that resolves when the documents have been added.
	*/
	async addDocumentsWithVectors(vectors, documents) {
		const tableNameRaw = this.Prisma.raw(`"${this.tableName}"`);
		const vectorColumnRaw = this.Prisma.raw(`"${this.vectorColumnName}"`);
		const columnNames = this.selectColumns.map((col) => this.Prisma.raw(`"${col}"`));
		const allColumns = [...columnNames, vectorColumnRaw];
		await this.db.$transaction(vectors.map((vector, idx) => {
			const document = documents[idx];
			const vectorString = `[${vector.join(",")}]`;
			const columnValues = this.selectColumns.map((col) => {
				if (col === this.contentColumn) return document.pageContent;
				return document.metadata[col];
			});
			const allValues = [...columnValues, this.Prisma.sql`${vectorString}::vector`];
			return this.db.$executeRaw(this.Prisma.sql`
            INSERT INTO ${tableNameRaw} (${this.Prisma.join(allColumns, ", ")})
            VALUES (${this.Prisma.join(allValues, ", ")})
          `);
		}));
	}
	/**
	* Performs a similarity search with the specified query.
	* @param query The query to use for the similarity search.
	* @param k The number of results to return.
	* @param _filter The filter to apply to the results.
	* @param _callbacks The callbacks to use during the search.
	* @returns A promise that resolves with the search results.
	*/
	async similaritySearch(query, k = 4, filter = void 0) {
		const results = await this.similaritySearchVectorWithScore(await this.embeddings.embedQuery(query), k, filter);
		return results.map((result) => result[0]);
	}
	/**
	* Performs a similarity search with the specified query and returns the
	* results along with their scores.
	* @param query The query to use for the similarity search.
	* @param k The number of results to return.
	* @param filter The filter to apply to the results.
	* @param _callbacks The callbacks to use during the search.
	* @returns A promise that resolves with the search results and their scores.
	*/
	async similaritySearchWithScore(query, k, filter) {
		return super.similaritySearchWithScore(query, k, filter);
	}
	/**
	* Performs a similarity search with the specified vector and returns the
	* results along with their scores.
	* @param query The vector to use for the similarity search.
	* @param k The number of results to return.
	* @param filter The filter to apply to the results.
	* @returns A promise that resolves with the search results and their scores.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const vectorColumnRaw = this.Prisma.raw(`"${this.vectorColumnName}"`);
		const tableNameRaw = this.Prisma.raw(`"${this.tableName}"`);
		const selectRaw = this.Prisma.raw(this.selectColumns.map((x) => `"${x}"`).join(", "));
		const vector = `[${query.join(",")}]`;
		const articles = await this.db.$queryRaw(this.Prisma.join([
			this.Prisma.sql`
            SELECT ${selectRaw}, ${vectorColumnRaw} <=> ${vector}::vector as "_distance"
            FROM ${tableNameRaw}
          `,
			this.buildSqlFilterStr(filter ?? this.filter),
			this.Prisma.sql`
            ORDER BY "_distance" ASC
            LIMIT ${k};
          `
		].filter((x) => x != null), ""));
		const results = [];
		for (const article of articles) if (article._distance != null && article[this.contentColumn] != null) results.push([new __langchain_core_documents.Document({
			pageContent: article[this.contentColumn],
			metadata: article
		}), article._distance]);
		return results;
	}
	buildSqlFilterStr(filter) {
		if (filter == null) return null;
		return this.Prisma.join(Object.entries(filter).flatMap(([key, ops]) => Object.entries(ops).map(([opName, value]) => {
			const opNameKey = opName;
			const colRaw = this.Prisma.raw(`"${key}"`);
			const opRaw = this.Prisma.raw(OpMap[opNameKey]);
			const columnType = this.columnTypes?.[key];
			switch (OpMap[opNameKey]) {
				case OpMap.notIn:
				case OpMap.in:
					if (!Array.isArray(value)) throw new Error(`Invalid filter: IN operator requires an array. Received: ${JSON.stringify(value, null, 2)}`);
					if (value.length === 0) {
						const isInOperator = OpMap[opNameKey] === OpMap.in;
						return this.Prisma.sql`${!isInOperator}`;
					}
					if (columnType === "uuid") {
						const castedValues = value.map((v) => this.Prisma.sql`${v}::uuid`);
						return this.Prisma.sql`${colRaw} ${opRaw} (${this.Prisma.join(castedValues)})`;
					} else if (columnType === "integer") {
						const castedValues = value.map((v) => this.Prisma.sql`${v}::integer`);
						return this.Prisma.sql`${colRaw} ${opRaw} (${this.Prisma.join(castedValues)})`;
					} else if (columnType === "bigint") {
						const castedValues = value.map((v) => this.Prisma.sql`${v}::bigint`);
						return this.Prisma.sql`${colRaw} ${opRaw} (${this.Prisma.join(castedValues)})`;
					} else if (columnType === "jsonb") {
						const castedValues = value.map((v) => {
							const jsonValue = typeof v === "object" ? JSON.stringify(v) : v;
							return this.Prisma.sql`${jsonValue}::jsonb`;
						});
						return this.Prisma.sql`${colRaw} ${opRaw} (${this.Prisma.join(castedValues)})`;
					}
					return this.Prisma.sql`${colRaw} ${opRaw} (${this.Prisma.join(value)})`;
				case OpMap.isNull:
				case OpMap.isNotNull: return this.Prisma.sql`${colRaw} ${opRaw}`;
				default: if (columnType === "uuid") return this.Prisma.sql`${colRaw} ${opRaw} ${value}::uuid`;
				else if (columnType === "integer") return this.Prisma.sql`${colRaw} ${opRaw} ${value}::integer`;
				else if (columnType === "bigint") return this.Prisma.sql`${colRaw} ${opRaw} ${value}::bigint`;
				else if (columnType === "jsonb") {
					const jsonValue = typeof value === "object" ? JSON.stringify(value) : value;
					return this.Prisma.sql`${colRaw} ${opRaw} ${jsonValue}::jsonb`;
				} else if (columnType) return this.Prisma.sql`${colRaw} ${opRaw} ${value}::${this.Prisma.raw(columnType)}`;
				else return this.Prisma.sql`${colRaw}::text ${opRaw} ${value}`;
			}
		})), " AND ", " WHERE ");
	}
	/**
	* Creates a new PrismaVectorStore from the specified texts.
	* @param texts The texts to use to create the store.
	* @param metadatas The metadata for the texts.
	* @param embeddings The embeddings to use.
	* @param dbConfig The database configuration.
	* @returns A promise that resolves with the new PrismaVectorStore.
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
		return PrismaVectorStore.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Creates a new PrismaVectorStore from the specified documents.
	* @param docs The documents to use to create the store.
	* @param embeddings The embeddings to use.
	* @param dbConfig The database configuration.
	* @returns A promise that resolves with the new PrismaVectorStore.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new PrismaVectorStore(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
};

//#endregion
exports.PrismaVectorStore = PrismaVectorStore;
Object.defineProperty(exports, 'prisma_exports', {
  enumerable: true,
  get: function () {
    return prisma_exports;
  }
});
//# sourceMappingURL=prisma.cjs.map