import { __export } from "../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import neo4j from "neo4j-driver";
import * as uuid from "uuid";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/neo4j_vector.ts
var neo4j_vector_exports = {};
__export(neo4j_vector_exports, { Neo4jVectorStore: () => Neo4jVectorStore });
const DEFAULT_SEARCH_TYPE = "vector";
const DEFAULT_INDEX_TYPE = "NODE";
const DEFAULT_DISTANCE_STRATEGY = "cosine";
const DEFAULT_NODE_EMBEDDING_PROPERTY = "embedding";
/**
* @security *Security note*: Make sure that the database connection uses credentials
* that are narrowly-scoped to only include necessary permissions.
* Failure to do so may result in data corruption or loss, since the calling
* code may attempt commands that would result in deletion, mutation
* of data if appropriately prompted or reading sensitive data if such
* data is present in the database.
* The best way to guard against such negative outcomes is to (as appropriate)
* limit the permissions granted to the credentials used with this tool.
* For example, creating read only users for the database is a good way to
* ensure that the calling code cannot mutate or delete data.
*
* @link See https://js.langchain.com/docs/security for more information.
*/
var Neo4jVectorStore = class Neo4jVectorStore extends VectorStore {
	driver;
	database;
	preDeleteCollection;
	nodeLabel;
	embeddingNodeProperty;
	embeddingDimension;
	textNodeProperty;
	keywordIndexName;
	indexName;
	retrievalQuery;
	searchType;
	indexType;
	distanceStrategy = DEFAULT_DISTANCE_STRATEGY;
	supportMetadataFilter = true;
	isEnterprise = false;
	_vectorstoreType() {
		return "neo4jvector";
	}
	constructor(embeddings, config) {
		super(embeddings, config);
	}
	static async initialize(embeddings, config) {
		const store = new Neo4jVectorStore(embeddings, config);
		await store._initializeDriver(config);
		await store._verifyConnectivity();
		const { preDeleteCollection = false, nodeLabel = "Chunk", textNodeProperty = "text", embeddingNodeProperty = DEFAULT_NODE_EMBEDDING_PROPERTY, keywordIndexName = "keyword", indexName = "vector", retrievalQuery = "", searchType = DEFAULT_SEARCH_TYPE, indexType = DEFAULT_INDEX_TYPE } = config;
		store.embeddingDimension = (await embeddings.embedQuery("foo")).length;
		store.preDeleteCollection = preDeleteCollection;
		store.nodeLabel = nodeLabel;
		store.textNodeProperty = textNodeProperty;
		store.embeddingNodeProperty = embeddingNodeProperty;
		store.keywordIndexName = keywordIndexName;
		store.indexName = indexName;
		store.retrievalQuery = retrievalQuery;
		store.searchType = searchType;
		store.indexType = indexType;
		if (store.preDeleteCollection) await store._dropIndex();
		return store;
	}
	async _initializeDriver({ url, username, password, database = "neo4j" }) {
		try {
			this.driver = neo4j.driver(url, neo4j.auth.basic(username, password));
			this.database = database;
		} catch {
			throw new Error("Could not create a Neo4j driver instance. Please check the connection details.");
		}
	}
	async _verifyConnectivity() {
		await this.driver.verifyAuthentication();
	}
	async _verifyVersion() {
		try {
			const data = await this.query("CALL dbms.components()");
			const versionString = data[0].versions[0];
			const targetVersion = [
				5,
				11,
				0
			];
			let version;
			if (versionString.includes("aura")) {
				const baseVersion = versionString.split("-")[0];
				version = baseVersion.split(".").map(Number);
				version.push(0);
			} else version = versionString.split(".").map(Number);
			if (isVersionLessThan(version, targetVersion)) throw new Error("Version index is only supported in Neo4j version 5.11 or greater");
			const metadataTargetVersion = [
				5,
				18,
				0
			];
			if (isVersionLessThan(version, metadataTargetVersion)) this.supportMetadataFilter = false;
			this.isEnterprise = data[0].edition === "enterprise";
		} catch (error) {
			console.error("Database version check failed:", error);
		}
	}
	async close() {
		await this.driver.close();
	}
	async _dropIndex() {
		try {
			await this.query(`
        MATCH (n:\`${this.nodeLabel}\`)
        CALL {
          WITH n
          DETACH DELETE n
        }
        IN TRANSACTIONS OF 10000 ROWS;
      `);
			await this.query(`DROP INDEX ${this.indexName}`);
		} catch (error) {
			console.error("An error occurred while dropping the index:", error);
		}
	}
	async query(query, params = {}) {
		const session = this.driver.session({ database: this.database });
		const result = await session.run(query, params);
		return toObjects(result.records);
	}
	static async fromTexts(texts, metadatas, embeddings, config) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return Neo4jVectorStore.fromDocuments(docs, embeddings, config);
	}
	static async fromDocuments(docs, embeddings, config) {
		const { searchType = DEFAULT_SEARCH_TYPE, createIdIndex = true, textNodeProperties = [] } = config;
		const store = await this.initialize(embeddings, config);
		const embeddingDimension = await store.retrieveExistingIndex();
		if (!embeddingDimension) await store.createNewIndex();
		else if (store.embeddingDimension !== embeddingDimension) throw new Error(`Index with name "${store.indexName}" already exists. The provided embedding function and vector index dimensions do not match.
        Embedding function dimension: ${store.embeddingDimension}
        Vector index dimension: ${embeddingDimension}`);
		if (searchType === "hybrid") {
			const ftsNodeLabel = await store.retrieveExistingFtsIndex();
			if (!ftsNodeLabel) await store.createNewKeywordIndex(textNodeProperties);
			else if (ftsNodeLabel !== store.nodeLabel) throw Error("Vector and keyword index don't index the same node label");
		}
		if (createIdIndex) await store.query(`CREATE CONSTRAINT IF NOT EXISTS FOR (n:${store.nodeLabel}) REQUIRE n.id IS UNIQUE;`);
		await store.addDocuments(docs);
		return store;
	}
	static async fromExistingIndex(embeddings, config) {
		const { searchType = DEFAULT_SEARCH_TYPE, keywordIndexName = "keyword" } = config;
		if (searchType === "hybrid" && !keywordIndexName) throw Error("keyword_index name has to be specified when using hybrid search option");
		const store = await this.initialize(embeddings, config);
		const embeddingDimension = await store.retrieveExistingIndex();
		if (!embeddingDimension) throw Error("The specified vector index name does not exist. Make sure to check if you spelled it correctly");
		if (store.embeddingDimension !== embeddingDimension) throw new Error(`The provided embedding function and vector index dimensions do not match.
         Embedding function dimension: ${store.embeddingDimension}
         Vector index dimension: ${embeddingDimension}`);
		if (searchType === "hybrid") {
			const ftsNodeLabel = await store.retrieveExistingFtsIndex();
			if (!ftsNodeLabel) throw Error("The specified keyword index name does not exist. Make sure to check if you spelled it correctly");
			else if (ftsNodeLabel !== store.nodeLabel) throw Error("Vector and keyword index don't index the same node label");
		}
		return store;
	}
	static async fromExistingGraph(embeddings, config) {
		const { textNodeProperties = [], embeddingNodeProperty = DEFAULT_NODE_EMBEDDING_PROPERTY, searchType = DEFAULT_SEARCH_TYPE, retrievalQuery = "", nodeLabel } = config;
		let _retrievalQuery = retrievalQuery;
		if (textNodeProperties.length === 0) throw Error("Parameter `text_node_properties` must not be an empty array");
		if (!retrievalQuery) _retrievalQuery = `
        RETURN reduce(str='', k IN ${JSON.stringify(textNodeProperties)} |
        str + '\\n' + k + ': ' + coalesce(node[k], '')) AS text,
        node {.*, \`${embeddingNodeProperty}\`: Null, id: Null, ${textNodeProperties.map((prop) => `\`${prop}\`: Null`).join(", ")} } AS metadata, score
      `;
		const store = await this.initialize(embeddings, {
			...config,
			retrievalQuery: _retrievalQuery
		});
		const embeddingDimension = await store.retrieveExistingIndex();
		if (!embeddingDimension) await store.createNewIndex();
		else if (store.embeddingDimension !== embeddingDimension) throw new Error(`Index with name ${store.indexName} already exists. The provided embedding function and vector index dimensions do not match.\nEmbedding function dimension: ${store.embeddingDimension}\nVector index dimension: ${embeddingDimension}`);
		if (searchType === "hybrid") {
			const ftsNodeLabel = await store.retrieveExistingFtsIndex(textNodeProperties);
			if (!ftsNodeLabel) await store.createNewKeywordIndex(textNodeProperties);
			else if (ftsNodeLabel !== store.nodeLabel) throw Error("Vector and keyword index don't index the same node label");
		}
		while (true) {
			const fetchQuery = `
        MATCH (n:\`${nodeLabel}\`)
        WHERE n.${embeddingNodeProperty} IS null
        AND any(k in $props WHERE n[k] IS NOT null)
        RETURN elementId(n) AS id, reduce(str='', k IN $props |
        str + '\\n' + k + ':' + coalesce(n[k], '')) AS text
        LIMIT 1000
      `;
			const data = await store.query(fetchQuery, { props: textNodeProperties });
			if (!data) break;
			const textEmbeddings = await embeddings.embedDocuments(data.map((el) => el.text));
			const params = { data: data.map((el, index) => ({
				id: el.id,
				embedding: textEmbeddings[index]
			})) };
			await store.query(`
        UNWIND $data AS row
        MATCH (n:\`${nodeLabel}\`)
        WHERE elementId(n) = row.id
        CALL db.create.setVectorProperty(n, '${embeddingNodeProperty}', row.embedding)
        YIELD node RETURN count(*)
      `, params);
			if (data.length < 1e3) break;
		}
		return store;
	}
	async createNewIndex() {
		const indexQuery = `
      CALL db.index.vector.createNodeIndex(
        $index_name,
        $node_label,
        $embedding_node_property,
        toInteger($embedding_dimension),
        $similarity_metric
      )
    `;
		const parameters = {
			index_name: this.indexName,
			node_label: this.nodeLabel,
			embedding_node_property: this.embeddingNodeProperty,
			embedding_dimension: this.embeddingDimension,
			similarity_metric: this.distanceStrategy
		};
		await this.query(indexQuery, parameters);
	}
	async retrieveExistingIndex() {
		let indexInformation = await this.query(`
        SHOW INDEXES YIELD name, type, labelsOrTypes, properties, options
        WHERE type = 'VECTOR' AND (name = $index_name
        OR (labelsOrTypes[0] = $node_label AND
        properties[0] = $embedding_node_property))
        RETURN name, labelsOrTypes, properties, options
      `, {
			index_name: this.indexName,
			node_label: this.nodeLabel,
			embedding_node_property: this.embeddingNodeProperty
		});
		if (indexInformation) {
			indexInformation = this.sortByIndexName(indexInformation, this.indexName);
			try {
				const [index] = indexInformation;
				const [labelOrType] = index.labelsOrTypes;
				const [property] = index.properties;
				this.indexName = index.name;
				this.nodeLabel = labelOrType;
				this.embeddingNodeProperty = property;
				const embeddingDimension = index.options.indexConfig["vector.dimensions"];
				return Number(embeddingDimension);
			} catch {
				return null;
			}
		}
		return null;
	}
	async retrieveExistingFtsIndex(textNodeProperties = []) {
		const indexInformation = await this.query(`
      SHOW INDEXES YIELD name, type, labelsOrTypes, properties, options
      WHERE type = 'FULLTEXT' AND (name = $keyword_index_name
      OR (labelsOrTypes = [$node_label] AND
      properties = $text_node_property))
      RETURN name, labelsOrTypes, properties, options
    `, {
			keyword_index_name: this.keywordIndexName,
			node_label: this.nodeLabel,
			text_node_property: textNodeProperties.length > 0 ? textNodeProperties : [this.textNodeProperty]
		});
		if (indexInformation) {
			const sortedIndexInformation = this.sortByIndexName(indexInformation, this.indexName);
			try {
				const [index] = sortedIndexInformation;
				const [labelOrType] = index.labelsOrTypes;
				const [property] = index.properties;
				this.keywordIndexName = index.name;
				this.textNodeProperty = property;
				this.nodeLabel = labelOrType;
				return labelOrType;
			} catch {
				return null;
			}
		}
		return null;
	}
	async createNewKeywordIndex(textNodeProperties = []) {
		const nodeProps = textNodeProperties.length > 0 ? textNodeProperties : [this.textNodeProperty];
		const ftsIndexQuery = `
      CREATE FULLTEXT INDEX ${this.keywordIndexName}
      FOR (n:\`${this.nodeLabel}\`) ON EACH
      [${nodeProps.map((prop) => `n.\`${prop}\``).join(", ")}]
    `;
		await this.query(ftsIndexQuery);
	}
	sortByIndexName(values, indexName) {
		return values.sort((a, b) => (a.name === indexName ? -1 : 0) - (b.name === indexName ? -1 : 0));
	}
	async addVectors(vectors, documents, metadatas, ids) {
		let _ids = ids;
		const _metadatas = metadatas;
		if (!_ids) _ids = documents.map(() => uuid.v1());
		const importQuery = `
      UNWIND $data AS row
      CALL {
        WITH row
        MERGE (c:\`${this.nodeLabel}\` {id: row.id})
        WITH c, row
        CALL db.create.setVectorProperty(c, '${this.embeddingNodeProperty}', row.embedding)
        YIELD node
        SET c.\`${this.textNodeProperty}\` = row.text
        SET c += row.metadata
      } IN TRANSACTIONS OF 1000 ROWS
    `;
		const parameters = { data: documents.map(({ pageContent, metadata }, index) => ({
			text: pageContent,
			metadata: _metadatas ? _metadatas[index] : metadata,
			embedding: vectors[index],
			id: _ids ? _ids[index] : null
		})) };
		await this.query(importQuery, parameters);
		return _ids;
	}
	async addDocuments(documents) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
	}
	async similaritySearch(query, k = 4, params = {}) {
		const embedding = await this.embeddings.embedQuery(query);
		const results = await this.similaritySearchVectorWithScore(embedding, k, query, params);
		return results.map((result) => result[0]);
	}
	async similaritySearchWithScore(query, k = 4, params = {}) {
		const embedding = await this.embeddings.embedQuery(query);
		return this.similaritySearchVectorWithScore(embedding, k, query, params);
	}
	async similaritySearchVectorWithScore(vector, k, query, params = {}) {
		let indexQuery;
		let filterParams;
		const { filter } = params;
		if (filter) {
			if (!this.supportMetadataFilter) throw new Error("Metadata filtering is only supported in Neo4j version 5.18 or greater.");
			if (this.searchType === "hybrid") throw new Error("Metadata filtering can't be use in combination with a hybrid search approach.");
			const parallelQuery = this.isEnterprise ? "CYPHER runtime = parallel parallelRuntimeSupport=all " : "";
			const baseIndexQuery = `
        ${parallelQuery}
        MATCH (n:\`${this.nodeLabel}\`)
        WHERE n.\`${this.embeddingNodeProperty}\` IS NOT NULL
        AND size(n.\`${this.embeddingNodeProperty}\`) = toInteger(${this.embeddingDimension}) AND
      `;
			const baseCosineQuery = `
        WITH n as node, vector.similarity.cosine(
          n.\`${this.embeddingNodeProperty}\`,
          $embedding
        ) AS score ORDER BY score DESC LIMIT toInteger($k)
      `;
			const [fSnippets, fParams] = constructMetadataFilter(filter);
			indexQuery = baseIndexQuery + fSnippets + baseCosineQuery;
			filterParams = fParams;
		} else {
			indexQuery = getSearchIndexQuery(this.searchType, this.indexType);
			filterParams = {};
		}
		let defaultRetrieval;
		if (this.indexType === "RELATIONSHIP") defaultRetrieval = `
        RETURN relationship.${this.textNodeProperty} AS text, score,
        relationship {.*, ${this.textNodeProperty}: Null,
        ${this.embeddingNodeProperty}: Null, id: Null } AS metadata
      `;
		else defaultRetrieval = `
        RETURN node.${this.textNodeProperty} AS text, score,
        node {.*, ${this.textNodeProperty}: Null,
        ${this.embeddingNodeProperty}: Null, id: Null } AS metadata
      `;
		const retrievalQuery = this.retrievalQuery ? this.retrievalQuery : defaultRetrieval;
		const readQuery = `${indexQuery} ${retrievalQuery}`;
		const parameters = {
			index: this.indexName,
			k: Number(k),
			embedding: vector,
			keyword_index: this.keywordIndexName,
			query: removeLuceneChars(query),
			...params,
			...filterParams
		};
		const results = await this.query(readQuery, parameters);
		if (results) {
			if (results.some((result) => result.text == null)) if (!this.retrievalQuery) throw new Error(`Make sure that none of the '${this.textNodeProperty}' properties on nodes with label '${this.nodeLabel}' are missing or empty`);
			else throw new Error("Inspect the 'retrievalQuery' and ensure it doesn't return null for the 'text' column");
			const docs = results.map((result) => [new Document({
				pageContent: result.text,
				metadata: Object.fromEntries(Object.entries(result.metadata).filter(([_, v]) => v !== null))
			}), result.score]);
			return docs;
		}
		return [];
	}
};
function toObjects(records) {
	const recordValues = records.map((record) => {
		const rObj = record.toObject();
		const out = {};
		Object.keys(rObj).forEach((key) => {
			out[key] = itemIntToString(rObj[key]);
		});
		return out;
	});
	return recordValues;
}
function itemIntToString(item) {
	if (neo4j.isInt(item)) return item.toString();
	if (Array.isArray(item)) return item.map((ii) => itemIntToString(ii));
	if ([
		"number",
		"string",
		"boolean"
	].indexOf(typeof item) !== -1) return item;
	if (item === null) return item;
	if (typeof item === "object") return objIntToString(item);
}
function objIntToString(obj) {
	const entry = extractFromNeoObjects(obj);
	let newObj = null;
	if (Array.isArray(entry)) newObj = entry.map((item) => itemIntToString(item));
	else if (entry !== null && typeof entry === "object") {
		newObj = {};
		Object.keys(entry).forEach((key) => {
			newObj[key] = itemIntToString(entry[key]);
		});
	}
	return newObj;
}
function extractFromNeoObjects(obj) {
	if (obj instanceof neo4j.types.Node || obj instanceof neo4j.types.Relationship) return obj.properties;
	else if (obj instanceof neo4j.types.Path) return [].concat.apply([], extractPathForRows(obj));
	return obj;
}
function extractPathForRows(path) {
	let { segments } = path;
	if (!Array.isArray(path.segments) || path.segments.length < 1) segments = [{
		...path,
		end: null
	}];
	return segments.map((segment) => [
		objIntToString(segment.start),
		objIntToString(segment.relationship),
		objIntToString(segment.end)
	].filter((part) => part !== null));
}
function getSearchIndexQuery(searchType, indexType = DEFAULT_INDEX_TYPE) {
	if (indexType === "NODE") {
		const typeToQueryMap = {
			vector: "CALL db.index.vector.queryNodes($index, $k, $embedding) YIELD node, score",
			hybrid: `
          CALL {
              CALL db.index.vector.queryNodes($index, $k, $embedding) YIELD node, score
              WITH collect({node:node, score:score}) AS nodes, max(score) AS max
              UNWIND nodes AS n
              // We use 0 as min
              RETURN n.node AS node, (n.score / max) AS score UNION
              CALL db.index.fulltext.queryNodes($keyword_index, $query, {limit: $k}) YIELD node, score
              WITH collect({node: node, score: score}) AS nodes, max(score) AS max
              UNWIND nodes AS n
              RETURN n.node AS node, (n.score / max) AS score
          }
          WITH node, max(score) AS score ORDER BY score DESC LIMIT toInteger($k)
      `
		};
		return typeToQueryMap[searchType];
	} else return `
      CALL db.index.vector.queryRelationships($index, $k, $embedding)
      YIELD relationship, score
    `;
}
function removeLuceneChars(text) {
	if (text === void 0 || text === null) return null;
	const specialChars = [
		"+",
		"-",
		"&",
		"|",
		"!",
		"(",
		")",
		"{",
		"}",
		"[",
		"]",
		"^",
		"\"",
		"~",
		"*",
		"?",
		":",
		"\\"
	];
	let modifiedText = text;
	for (const char of specialChars) modifiedText = modifiedText.split(char).join(" ");
	return modifiedText.trim();
}
function isVersionLessThan(v1, v2) {
	for (let i = 0; i < Math.min(v1.length, v2.length); i += 1) if (v1[i] < v2[i]) return true;
	else if (v1[i] > v2[i]) return false;
	return v1.length < v2.length;
}
const COMPARISONS_TO_NATIVE = {
	$eq: "=",
	$ne: "<>",
	$lt: "<",
	$lte: "<=",
	$gt: ">",
	$gte: ">="
};
const COMPARISONS_TO_NATIVE_OPERATORS = new Set(Object.keys(COMPARISONS_TO_NATIVE));
const TEXT_OPERATORS = new Set(["$like", "$ilike"]);
const LOGICAL_OPERATORS = new Set(["$and", "$or"]);
const SPECIAL_CASED_OPERATORS = new Set([
	"$in",
	"$nin",
	"$between"
]);
const SUPPORTED_OPERATORS = new Set([
	...COMPARISONS_TO_NATIVE_OPERATORS,
	...TEXT_OPERATORS,
	...LOGICAL_OPERATORS,
	...SPECIAL_CASED_OPERATORS
]);
const IS_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
function combineQueries(inputQueries, operator) {
	let combinedQuery = "";
	const combinedParams = {};
	const paramCounter = {};
	for (const [query, params] of inputQueries) {
		let newQuery = query;
		for (const [param, value] of Object.entries(params)) {
			if (param in paramCounter) paramCounter[param] += 1;
			else paramCounter[param] = 1;
			const newParamName = `${param}_${paramCounter[param]}`;
			newQuery = newQuery.replace(`$${param}`, `$${newParamName}`);
			combinedParams[newParamName] = value;
		}
		if (combinedQuery) combinedQuery += ` ${operator} `;
		combinedQuery += `(${newQuery})`;
	}
	return [combinedQuery, combinedParams];
}
function collectParams(inputData) {
	const queryParts = [];
	const params = {};
	for (const [queryPart, param] of inputData) {
		queryParts.push(queryPart);
		Object.assign(params, param);
	}
	return [queryParts, params];
}
function handleFieldFilter(field, value, paramNumber = 1) {
	if (typeof field !== "string") throw new Error(`field should be a string but got: ${typeof field} with value: ${field}`);
	if (field.startsWith("$")) throw new Error(`Invalid filter condition. Expected a field but got an operator: ${field}`);
	if (!IS_IDENTIFIER_REGEX.test(field)) throw new Error(`Invalid field name: ${field}. Expected a valid identifier.`);
	let operator;
	let filterValue;
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		const keys = Object.keys(value);
		if (keys.length !== 1) throw new Error(`Invalid filter condition. Expected a value which is a dictionary
        with a single key that corresponds to an operator but got a dictionary
        with ${keys.length} keys. The first few keys are: ${keys.slice(0, 3).join(", ")}
      `);
		operator = keys[0];
		filterValue = value[operator];
		if (!SUPPORTED_OPERATORS.has(operator)) throw new Error(`Invalid operator: ${operator}. Expected one of ${SUPPORTED_OPERATORS}`);
	} else {
		operator = "$eq";
		filterValue = value;
	}
	if (COMPARISONS_TO_NATIVE_OPERATORS.has(operator)) {
		const native = COMPARISONS_TO_NATIVE[operator];
		const querySnippet = `n.${field} ${native} $param_${paramNumber}`;
		const queryParam = { [`param_${paramNumber}`]: filterValue };
		return [querySnippet, queryParam];
	} else if (operator === "$between") {
		const [low, high] = filterValue;
		const querySnippet = `$param_${paramNumber}_low <= n.${field} <= $param_${paramNumber}_high`;
		const queryParam = {
			[`param_${paramNumber}_low`]: low,
			[`param_${paramNumber}_high`]: high
		};
		return [querySnippet, queryParam];
	} else if ([
		"$in",
		"$nin",
		"$like",
		"$ilike"
	].includes(operator)) {
		if (["$in", "$nin"].includes(operator)) filterValue.forEach((val) => {
			if (typeof val !== "string" && typeof val !== "number" && typeof val !== "boolean") throw new Error(`Unsupported type: ${typeof val} for value: ${val}`);
		});
		if (operator === "$in") {
			const querySnippet = `n.${field} IN $param_${paramNumber}`;
			const queryParam = { [`param_${paramNumber}`]: filterValue };
			return [querySnippet, queryParam];
		} else if (operator === "$nin") {
			const querySnippet = `n.${field} NOT IN $param_${paramNumber}`;
			const queryParam = { [`param_${paramNumber}`]: filterValue };
			return [querySnippet, queryParam];
		} else if (operator === "$like") {
			const querySnippet = `n.${field} CONTAINS $param_${paramNumber}`;
			const queryParam = { [`param_${paramNumber}`]: filterValue.slice(0, -1) };
			return [querySnippet, queryParam];
		} else if (operator === "$ilike") {
			const querySnippet = `toLower(n.${field}) CONTAINS $param_${paramNumber}`;
			const queryParam = { [`param_${paramNumber}`]: filterValue.slice(0, -1) };
			return [querySnippet, queryParam];
		} else throw new Error("Not Implemented");
	} else throw new Error("Not Implemented");
}
function constructMetadataFilter(filter) {
	if (typeof filter !== "object" || filter === null) throw new Error("Expected a dictionary representing the filter condition.");
	const entries = Object.entries(filter);
	if (entries.length === 1) {
		const [key, value] = entries[0];
		if (key.startsWith("$")) {
			if (!["$and", "$or"].includes(key.toLowerCase())) throw new Error(`Invalid filter condition. Expected $and or $or but got: ${key}`);
			if (!Array.isArray(value)) throw new Error(`Expected an array for logical conditions, but got ${typeof value} for value: ${value}`);
			const operation = key.toLowerCase() === "$and" ? "AND" : "OR";
			const combinedQueries = combineQueries(value.map((v) => constructMetadataFilter(v)), operation);
			return combinedQueries;
		} else return handleFieldFilter(key, value);
	} else if (entries.length > 1) {
		for (const [key] of entries) if (key.startsWith("$")) throw new Error(`Invalid filter condition. Expected a field but got an operator: ${key}`);
		const and_multiple = collectParams(entries.map(([field, val], index) => handleFieldFilter(field, val, index + 1)));
		if (and_multiple.length >= 1) return [and_multiple[0].join(" AND "), and_multiple[1]];
		else throw Error("Invalid filter condition. Expected a dictionary but got an empty dictionary");
	} else throw new Error("Filter condition contains no entries.");
}

//#endregion
export { Neo4jVectorStore, neo4j_vector_exports };
//# sourceMappingURL=neo4j_vector.js.map