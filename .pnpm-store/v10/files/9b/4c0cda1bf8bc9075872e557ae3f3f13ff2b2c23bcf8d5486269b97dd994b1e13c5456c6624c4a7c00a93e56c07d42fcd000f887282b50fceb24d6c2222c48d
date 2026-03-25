const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __langchain_core_utils_math = require_rolldown_runtime.__toESM(require("@langchain/core/utils/math"));

//#region src/vectorstores/hanavector.ts
var hanavector_exports = {};
require_rolldown_runtime.__export(hanavector_exports, { HanaDB: () => HanaDB });
const COMPARISONS_TO_SQL = {
	$eq: "=",
	$ne: "<>",
	$lt: "<",
	$lte: "<=",
	$gt: ">",
	$gte: ">="
};
const IN_OPERATORS_TO_SQL = {
	$in: "IN",
	$nin: "NOT IN"
};
const BETWEEN_OPERATOR_TO_SQL = { $between: "BETWEEN" };
const LIKE_OPERATOR_TO_SQL = { $like: "LIKE" };
const LOGICAL_OPERATORS_TO_SQL = {
	$and: "AND",
	$or: "OR"
};
const HANA_DISTANCE_FUNCTION = {
	cosine: ["COSINE_SIMILARITY", "DESC"],
	euclidean: ["L2DISTANCE", "ASC"]
};
const defaultDistanceStrategy = "cosine";
const defaultTableName = "EMBEDDINGS";
const defaultContentColumn = "VEC_TEXT";
const defaultMetadataColumn = "VEC_META";
const defaultVectorColumn = "VEC_VECTOR";
const defaultVectorColumnLength = -1;
var HanaDB = class HanaDB extends __langchain_core_vectorstores.VectorStore {
	connection;
	distanceStrategy;
	static compiledPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
	tableName;
	contentColumn;
	metadataColumn;
	vectorColumn;
	vectorColumnLength;
	specificMetadataColumns;
	_vectorstoreType() {
		return "hanadb";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		this.distanceStrategy = args.distanceStrategy || defaultDistanceStrategy;
		this.tableName = args.tableName || defaultTableName;
		this.contentColumn = args.contentColumn || defaultContentColumn;
		this.metadataColumn = args.metadataColumn || defaultMetadataColumn;
		this.vectorColumn = args.vectorColumn || defaultVectorColumn;
		this.vectorColumnLength = HanaDB.sanitizeInt(args.vectorColumnLength || defaultVectorColumnLength, -1);
		this.specificMetadataColumns = args.specificMetadataColumns || [];
		this.connection = args.connection;
	}
	executeQuery(client, query) {
		return new Promise((resolve, reject) => {
			client.exec(query, (err, result) => {
				if (err) reject(err);
				else resolve(result);
			});
		});
	}
	prepareQuery(client, query) {
		return new Promise((resolve, reject) => {
			client.prepare(query, (err, statement) => {
				if (err) reject(err);
				else resolve(statement);
			});
		});
	}
	executeStatement(statement, params) {
		return new Promise((resolve, reject) => {
			statement.exec(params, (err, res) => {
				if (err) reject(err);
				else resolve(res);
			});
		});
	}
	async initialize() {
		let valid_distance = false;
		for (const key in HANA_DISTANCE_FUNCTION) if (key === this.distanceStrategy) {
			valid_distance = true;
			break;
		}
		if (!valid_distance) throw new Error(`Unsupported distance_strategy: ${this.distanceStrategy}`);
		await this.createTableIfNotExists();
		await this.checkColumn(this.tableName, this.contentColumn, ["NCLOB", "NVARCHAR"]);
		await this.checkColumn(this.tableName, this.metadataColumn, ["NCLOB", "NVARCHAR"]);
		await this.checkColumn(this.tableName, this.vectorColumn, ["REAL_VECTOR"], this.vectorColumnLength);
	}
	/**
	* Sanitizes the input string by removing characters that are not alphanumeric or underscores.
	* @param inputStr The string to be sanitized.
	* @returns The sanitized string.
	*/
	static sanitizeName(inputStr) {
		return inputStr.replace(/[^a-zA-Z0-9_]/g, "");
	}
	static escapeSqlIdentifier(inputStr) {
		return `"${inputStr.replaceAll("\"", "\"\"")}"`;
	}
	/**
	* Sanitizes the input to integer. Throws an error if the value is less than lower bound.
	* @param inputInt The input to be sanitized.
	* @returns The sanitized integer.
	*/
	static sanitizeInt(inputInt, lowerBound = 0) {
		const value = parseInt(inputInt.toString(), 10);
		if (Number.isNaN(value) || value < lowerBound) throw new Error(`Value (${value}) must not be smaller than ${lowerBound}`);
		return value;
	}
	/**
	* Sanitizes a list to ensure all elements are floats (numbers in TypeScript).
	* Throws an error if any element is not a number.
	*
	* @param {number[]} embedding - The array of numbers (floats) to be sanitized.
	* @returns {number[]} The sanitized array of numbers (floats).
	* @throws {Error} Throws an error if any element is not a number.
	*/
	static sanitizeListFloat(embedding) {
		if (!Array.isArray(embedding)) throw new Error(`Expected 'embedding' to be an array, but received ${typeof embedding}`);
		embedding.forEach((value) => {
			if (typeof value !== "number") throw new Error(`Value (${value}) does not have type number`);
		});
		return embedding;
	}
	/**
	* Sanitizes the keys of the metadata object to ensure they match the required pattern.
	* Throws an error if any key does not match the pattern.
	*
	* @param {Record<string, any>} metadata - The metadata object with keys to be validated.
	* @returns {object[] | object} The original metadata object if all keys are valid.
	* @throws {Error} Throws an error if any metadata key is invalid.
	*/
	sanitizeMetadataKeys(metadata) {
		if (!metadata) return {};
		Object.keys(metadata).forEach((key) => {
			if (!HanaDB.compiledPattern.test(key)) throw new Error(`Invalid metadata key ${key}`);
		});
		return metadata;
	}
	/**
	* Parses a string representation of a float array and returns an array of numbers.
	* @param {string} arrayAsString - The string representation of the array.
	* @returns {number[]} An array of floats parsed from the string.
	*/
	static parseFloatArrayFromString(arrayAsString) {
		const arrayWithoutBrackets = arrayAsString.slice(1, -1);
		return arrayWithoutBrackets.split(",").map((x) => parseFloat(x));
	}
	/**
	* Checks if the specified column exists in the table and validates its data type and length.
	* @param tableName The name of the table.
	* @param columnName The name of the column to check.
	* @param columnType The expected data type(s) of the column.
	* @param columnLength The expected length of the column. Optional.
	*/
	async checkColumn(tableName, columnName, columnType, columnLength) {
		const query = `
      SELECT DATA_TYPE_NAME, LENGTH
      FROM SYS.TABLE_COLUMNS
      WHERE SCHEMA_NAME = CURRENT_SCHEMA
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?`;
		const client = this.connection;
		const statement = await this.prepareQuery(client, query);
		const resultSet = await this.executeStatement(statement, [tableName, columnName]);
		if (resultSet.length === 0) throw new Error(`Column ${columnName} does not exist`);
		else {
			const dataType = resultSet[0].DATA_TYPE_NAME;
			const length = resultSet[0].LENGTH;
			const isValidType = Array.isArray(columnType) ? columnType.includes(dataType) : columnType === dataType;
			if (!isValidType) throw new Error(`Column ${columnName} has the wrong type: ${dataType}`);
			if (columnLength !== void 0 && length !== columnLength && length > 0) throw new Error(`Column ${columnName} has the wrong length: ${length}`);
		}
	}
	async createTableIfNotExists() {
		const tableExists = await this.tableExists(this.tableName);
		if (!tableExists) {
			const vectorColumnLength = this.vectorColumnLength <= 0 ? null : this.vectorColumnLength;
			const query = `
        CREATE TABLE ${HanaDB.escapeSqlIdentifier(this.tableName)} (
          ${HanaDB.escapeSqlIdentifier(this.contentColumn)} NCLOB,
          ${HanaDB.escapeSqlIdentifier(this.metadataColumn)} NCLOB,
          ${HanaDB.escapeSqlIdentifier(this.vectorColumn)} REAL_VECTOR${vectorColumnLength ? `(${vectorColumnLength})` : ""}
        )`;
			const client = this.connection;
			await this.executeQuery(client, query);
		}
	}
	async tableExists(tableName) {
		const tableExistsQuery = `SELECT COUNT(*) AS COUNT FROM SYS.TABLES WHERE SCHEMA_NAME = CURRENT_SCHEMA AND TABLE_NAME = ?`;
		const client = this.connection;
		const statement = await this.prepareQuery(client, tableExistsQuery);
		const resultSet = await this.executeStatement(statement, [tableName]);
		if (resultSet[0].COUNT === 1) return true;
		return false;
	}
	/**
	* Creates a WHERE clause based on the provided filter object.
	* @param filter - A filter object with keys as metadata fields and values as filter values.
	* @returns A tuple containing the WHERE clause string and an array of query parameters.
	*/
	createWhereByFilter(filter) {
		let whereStr = "";
		let queryTuple = [];
		if (filter && Object.keys(filter).length > 0) {
			const [where, params] = this.processFilterObject(filter);
			whereStr = ` WHERE ${where}`;
			queryTuple = params;
		}
		return [whereStr, queryTuple];
	}
	/**
	* Processes a filter object to generate SQL WHERE clause components.
	* @param filter - A filter object with keys as metadata fields and values as filter values.
	* @returns A tuple containing the WHERE clause string and an array of query parameters.
	*/
	processFilterObject(filter) {
		let whereStr = "";
		const queryTuple = [];
		Object.keys(filter).forEach((key, i) => {
			const filterValue = filter[key];
			if (i !== 0) whereStr += " AND ";
			if (key in LOGICAL_OPERATORS_TO_SQL) {
				const logicalOperator = LOGICAL_OPERATORS_TO_SQL[key];
				const logicalOperands = filterValue;
				logicalOperands.forEach((operand, j) => {
					if (j !== 0) whereStr += ` ${logicalOperator} `;
					const [whereLogical, paramsLogical] = this.processFilterObject(operand);
					whereStr += `(${whereLogical})`;
					queryTuple.push(...paramsLogical);
				});
				return;
			}
			let operator = "=";
			let sqlParam = "?";
			if (typeof filterValue === "number") if (Number.isInteger(filterValue)) queryTuple.push(filterValue.toString());
			else throw new Error(`Unsupported filter data-type: wrong number type for key ${key}`);
			else if (typeof filterValue === "string") queryTuple.push(filterValue);
			else if (typeof filterValue === "boolean") queryTuple.push(filterValue.toString());
			else if (typeof filterValue === "object" && filterValue !== null) {
				const specialOp = Object.keys(filterValue)[0];
				const specialVal = filterValue[specialOp];
				if (specialOp in COMPARISONS_TO_SQL) {
					operator = COMPARISONS_TO_SQL[specialOp];
					if (specialVal === void 0) throw new Error(`Operator '${specialOp}' expects a non-undefined value.`);
					if (typeof specialVal === "boolean") queryTuple.push(specialVal.toString());
					else if (typeof specialVal === "number") {
						sqlParam = "CAST(? as float)";
						queryTuple.push(specialVal);
					} else if (typeof specialVal === "object" && specialVal !== null && "type" in specialVal && specialVal.type === "date" && "date" in specialVal) {
						sqlParam = "CAST(? as DATE)";
						queryTuple.push(specialVal.date);
					} else queryTuple.push(specialVal);
				} else if (specialOp in BETWEEN_OPERATOR_TO_SQL) {
					if (!Array.isArray(specialVal) || specialVal.length !== 2) throw new Error(`Operator '${specialOp}' expects two values.`);
					const [betweenFrom, betweenTo] = specialVal;
					operator = BETWEEN_OPERATOR_TO_SQL[specialOp];
					sqlParam = "? AND ?";
					queryTuple.push(betweenFrom.toString(), betweenTo.toString());
				} else if (specialOp in LIKE_OPERATOR_TO_SQL) {
					operator = LIKE_OPERATOR_TO_SQL[specialOp];
					if (specialVal !== void 0) queryTuple.push(specialVal.toString());
					else throw new Error(`Operator '${specialOp}' expects a non-undefined value.`);
				} else if (specialOp in IN_OPERATORS_TO_SQL) {
					operator = IN_OPERATORS_TO_SQL[specialOp];
					if (Array.isArray(specialVal)) {
						const placeholders = Array(specialVal.length).fill("?").join(",");
						sqlParam = `(${placeholders})`;
						queryTuple.push(...specialVal.map((listEntry) => listEntry.toString()));
					} else throw new Error(`Unsupported value for ${operator}: ${specialVal}`);
				} else throw new Error(`Unsupported operator: ${specialOp}`);
			} else throw new Error(`Unsupported filter data-type: ${typeof filterValue}`);
			const selector = this.specificMetadataColumns.includes(key) ? HanaDB.escapeSqlIdentifier(key) : `JSON_VALUE(${HanaDB.escapeSqlIdentifier(this.metadataColumn)}, '$.${key}')`;
			whereStr += `${selector} ${operator} ${sqlParam}`;
		});
		return [whereStr, queryTuple];
	}
	/**
	* Creates an HNSW vector index on a specified table and vector column with
	* optional build and search configurations. If no configurations are provided,
	* default parameters from the database are used. If provided values exceed the
	* valid ranges, an error will be raised.
	* The index is always created in ONLINE mode.
	*
	* @param {object} options Object containing configuration options for the index
	* @param {number} [options.m] (Optional) Maximum number of neighbors per graph node (Valid Range: [4, 1000])
	* @param {number} [options.efConstruction] (Optional) Maximal candidates to consider when building the graph
	*                                           (Valid Range: [1, 100000])
	* @param {number} [options.efSearch] (Optional) Minimum candidates for top-k-nearest neighbor queries
	*                                     (Valid Range: [1, 100000])
	* @param {string} [options.indexName] (Optional) Custom index name. Defaults to <table_name>_<distance_strategy>_idx
	* @returns {Promise<void>} Promise that resolves when index is added.
	*/
	async createHnswIndex(options = {}) {
		const { m, efConstruction, efSearch, indexName } = options;
		const distanceFuncName = HANA_DISTANCE_FUNCTION[this.distanceStrategy][0];
		const defaultIndexName = `${this.tableName}_${distanceFuncName}_idx`;
		const finalIndexName = indexName || defaultIndexName;
		const buildConfig = {};
		const searchConfig = {};
		if (m !== void 0) {
			const minimumHnswM = 4;
			const maximumHnswM = 1e3;
			const sanitizedM = HanaDB.sanitizeInt(m, minimumHnswM);
			if (sanitizedM < minimumHnswM || sanitizedM > maximumHnswM) throw new Error("M must be in the range [4, 1000]");
			buildConfig.M = sanitizedM;
		}
		if (efConstruction !== void 0) {
			const minimumEfConstruction = 1;
			const maximumEfConstruction = 1e5;
			const sanitizedEfConstruction = HanaDB.sanitizeInt(efConstruction, minimumEfConstruction);
			if (sanitizedEfConstruction < minimumEfConstruction || sanitizedEfConstruction > maximumEfConstruction) throw new Error("efConstruction must be in the range [1, 100000]");
			buildConfig.efConstruction = sanitizedEfConstruction;
		}
		if (efSearch !== void 0) {
			const minimumEfSearch = 1;
			const maximumEfSearch = 1e5;
			const sanitizedEfSearch = HanaDB.sanitizeInt(efSearch, minimumEfSearch);
			if (sanitizedEfSearch < minimumEfSearch || sanitizedEfSearch > maximumEfSearch) throw new Error("efSearch must be in the range [1, 100000]");
			searchConfig.efSearch = sanitizedEfSearch;
		}
		const buildConfigStr = Object.keys(buildConfig).length ? JSON.stringify(buildConfig) : "";
		const searchConfigStr = Object.keys(searchConfig).length ? JSON.stringify(searchConfig) : "";
		let query = `
      CREATE HNSW VECTOR INDEX ${HanaDB.escapeSqlIdentifier(finalIndexName)}
      ON ${HanaDB.escapeSqlIdentifier(this.tableName)} (${HanaDB.escapeSqlIdentifier(this.vectorColumn)})
      SIMILARITY FUNCTION ${distanceFuncName}`;
		if (buildConfigStr) query += ` BUILD CONFIGURATION '${buildConfigStr}'`;
		if (searchConfigStr) query += ` SEARCH CONFIGURATION '${searchConfigStr}'`;
		query += " ONLINE;";
		const client = this.connection;
		await this.executeQuery(client, query);
	}
	/**
	* Deletes entries from the table based on the provided filter.
	* @param ids - Optional. Deletion by ids is not supported and will throw an error.
	* @param filter - Optional. A filter object to specify which entries to delete.
	* @throws Error if 'ids' parameter is provided, as deletion by ids is not supported.
	* @throws Error if 'filter' parameter is not provided, as it is required for deletion.
	* to do: adjust the call signature
	*/
	async delete(options) {
		const { ids, filter } = options;
		if (ids) throw new Error("Deletion via IDs is not supported");
		if (!filter) throw new Error("Parameter 'filter' is required when calling 'delete'");
		const [whereStr, queryTuple] = this.createWhereByFilter(filter);
		const query = `DELETE FROM ${HanaDB.escapeSqlIdentifier(this.tableName)} ${whereStr}`;
		const client = this.connection;
		const statement = await this.prepareQuery(client, query);
		await this.executeStatement(statement, queryTuple);
	}
	/**
	* Static method to create a HanaDB instance from raw texts. This method embeds the documents,
	* creates a table if it does not exist, and adds the documents to the table.
	* @param texts Array of text documents to add.
	* @param metadatas metadata for each text document.
	* @param embedding EmbeddingsInterface instance for document embedding.
	* @param dbConfig Configuration for the HanaDB.
	* @returns A Promise that resolves to an instance of HanaDB.
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
		return HanaDB.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Creates an instance of `HanaDB` from an array of
	* Document instances. The documents are added to the database.
	* @param docs List of documents to be converted to vectors.
	* @param embeddings Embeddings instance used to convert the documents to vectors.
	* @param dbConfig Configuration for the HanaDB.
	* @returns Promise that resolves to an instance of `HanaDB`.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new HanaDB(embeddings, dbConfig);
		await instance.initialize();
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Adds an array of documents to the table. The documents are first
	* converted to vectors using the `embedDocuments` method of the
	* `embeddings` instance.
	* @param documents Array of Document instances to be added to the table.
	* @returns Promise that resolves when the documents are added.
	*/
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	/**
	* Adds an array of vectors and corresponding documents to the database.
	* The vectors and documents are batch inserted into the database.
	* @param vectors Array of vectors to be added to the table.
	* @param documents Array of Document instances corresponding to the vectors.
	* @returns Promise that resolves when the vectors and documents are added.
	*/
	async addVectors(vectors, documents) {
		if (vectors.length !== documents.length) throw new Error(`Vectors and metadatas must have the same length`);
		const texts = documents.map((doc) => doc.pageContent);
		const metadatas = documents.map((doc) => doc.metadata);
		const client = this.connection;
		const sqlParams = texts.map((text, i) => {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const embeddingString = `[${vectors[i].join(", ")}]`;
			return [
				text,
				JSON.stringify(this.sanitizeMetadataKeys(metadata)),
				embeddingString
			];
		});
		const query = `
      INSERT INTO ${HanaDB.escapeSqlIdentifier(this.tableName)} (
        ${HanaDB.escapeSqlIdentifier(this.contentColumn)},
        ${HanaDB.escapeSqlIdentifier(this.metadataColumn)},
        ${HanaDB.escapeSqlIdentifier(this.vectorColumn)}
      ) VALUES (?, ?, TO_REAL_VECTOR(?));`;
		const statement = await this.prepareQuery(client, query);
		await this.executeStatement(statement, sqlParams);
	}
	/**
	* Return docs most similar to query.
	* @param query Query text for the similarity search.
	* @param k Number of Documents to return. Defaults to 4.
	* @param filter A dictionary of metadata fields and values to filter by.
	Defaults to None.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async similaritySearch(query, k, filter) {
		const results = await this.similaritySearchWithScore(query, k, filter);
		return results.map((result) => result[0]);
	}
	/**
	* Return documents and score values most similar to query.
	* @param query Query text for the similarity search.
	* @param k Number of Documents to return. Defaults to 4.
	* @param filter A dictionary of metadata fields and values to filter by.
	Defaults to None.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async similaritySearchWithScore(query, k, filter) {
		const queryEmbedding = await this.embeddings.embedQuery(query);
		return this.similaritySearchVectorWithScore(queryEmbedding, k, filter);
	}
	/**
	* Return docs most similar to the given embedding.
	* @param query Query embedding for the similarity search.
	* @param k Number of Documents to return. Defaults to 4.
	* @param filter A dictionary of metadata fields and values to filter by.
	Defaults to None.
	* @returns Promise that resolves to a list of documents and their corresponding similarity scores.
	*/
	async similaritySearchVectorWithScore(queryEmbedding, k, filter) {
		const wholeResult = await this.similaritySearchWithScoreAndVectorByVector(queryEmbedding, k, filter);
		return wholeResult.map(([doc, score]) => [doc, score]);
	}
	/**
	* Performs a similarity search based on vector comparison and returns documents along with their similarity scores and vectors.
	* @param embedding The vector representation of the query for similarity comparison.
	* @param k The number of top similar documents to return.
	* @param filter Optional filter criteria to apply to the search query.
	* @returns A promise that resolves to an array of tuples, each containing a Document, its similarity score, and its vector.
	*/
	async similaritySearchWithScoreAndVectorByVector(embedding, k, filter) {
		const sanitizedK = HanaDB.sanitizeInt(k);
		const sanitizedEmbedding = HanaDB.sanitizeListFloat(embedding);
		const distanceFuncName = HANA_DISTANCE_FUNCTION[this.distanceStrategy][0];
		const embeddingAsString = sanitizedEmbedding.join(",");
		let query = `
      SELECT TOP ${sanitizedK}
        ${HanaDB.escapeSqlIdentifier(this.contentColumn)},
        ${HanaDB.escapeSqlIdentifier(this.metadataColumn)},
        TO_NVARCHAR(${HanaDB.escapeSqlIdentifier(this.vectorColumn)}) AS VECTOR,
        ${distanceFuncName}(
          ${HanaDB.escapeSqlIdentifier(this.vectorColumn)},
          TO_REAL_VECTOR('[${embeddingAsString}]')
        ) AS CS
      FROM ${HanaDB.escapeSqlIdentifier(this.tableName)}`;
		const orderStr = ` ORDER BY CS ${HANA_DISTANCE_FUNCTION[this.distanceStrategy][1]}`;
		const [whereStr, queryTuple] = this.createWhereByFilter(filter);
		query += whereStr + orderStr;
		const client = this.connection;
		const statement = await this.prepareQuery(client, query);
		const resultSet = await this.executeStatement(statement, queryTuple);
		const result = resultSet.map((row) => {
			const metadata = JSON.parse(row[this.metadataColumn].toString("utf8"));
			const doc = {
				pageContent: row[this.contentColumn].toString("utf8"),
				metadata
			};
			const resultVector = HanaDB.parseFloatArrayFromString(row.VECTOR);
			const score = row.CS;
			return [
				doc,
				score,
				resultVector
			];
		});
		return result;
	}
	/**
	* Return documents selected using the maximal marginal relevance.
	* Maximal marginal relevance optimizes for similarity to the query AND
	* diversity among selected documents.
	* @param query Text to look up documents similar to.
	* @param options.k Number of documents to return.
	* @param options.fetchK=20 Number of documents to fetch before passing to
	*     the MMR algorithm.
	* @param options.lambda=0.5 Number between 0 and 1 that determines the
	*     degree of diversity among the results, where 0 corresponds to maximum
	*     diversity and 1 to minimum diversity.
	* @returns List of documents selected by maximal marginal relevance.
	*/
	async maxMarginalRelevanceSearch(query, options) {
		const { k, fetchK = 20, lambda = .5 } = options;
		const queryEmbedding = await this.embeddings.embedQuery(query);
		const docs = await this.similaritySearchWithScoreAndVectorByVector(queryEmbedding, fetchK);
		const embeddingList = docs.map((doc) => doc[2]);
		const mmrIndexes = (0, __langchain_core_utils_math.maximalMarginalRelevance)(queryEmbedding, embeddingList, lambda, k);
		const mmrDocs = mmrIndexes.map((index) => docs[index][0]);
		return mmrDocs;
	}
};

//#endregion
exports.HanaDB = HanaDB;
Object.defineProperty(exports, 'hanavector_exports', {
  enumerable: true,
  get: function () {
    return hanavector_exports;
  }
});
//# sourceMappingURL=hanavector.cjs.map