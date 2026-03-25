import { __export } from "../_virtual/rolldown_runtime.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { useQuery } from "azion/sql";

//#region src/retrievers/azion_edgesql.ts
var azion_edgesql_exports = {};
__export(azion_edgesql_exports, { AzionRetriever: () => AzionRetriever });
/**
* class for performing hybrid search operations on Azion's Edge SQL database.
* It extends the 'BaseRetriever' class and implements methods for
* similarity search and full-text search (FTS).
*/
/**
* Example usage:
* ```ts
* // Initialize embeddings and chat model
* const embeddings = new OpenAIEmbeddings();
* const chatModel = new ChatOpenAI({ model: "gpt-4o-mini" });
*
* // Create retriever with hybrid search
* const retriever = new AzionRetriever(embeddings, chatModel, {
*   searchType: 'hybrid',
*   similarityK: 3,
*   ftsK: 2,
*   dbName: 'my_docs',
*   metadataItems: ['category', 'author'],
*   vectorTable: 'documents',
*   ftsTable: 'documents_fts',
*   filters: [
*     { operator: '=', column: 'status', value: 'published' }
*   ]
* });
*
* // Retrieve relevant documents
* const docs = await retriever.invoke(
*   "What are coral reefs in Australia?"
* );
*
* // Create retriever with similarity search only
* const simRetriever = new AzionRetriever(embeddings, chatModel, {
*   searchType: 'similarity',
*   similarityK: 5,
*   dbName: 'my_docs',
*   vectorTable: 'documents'
* });
*
* // Customize entity extraction prompt
* const customRetriever = new AzionRetriever(embeddings, chatModel, {
*   searchType: 'hybrid',
*   similarityK: 3,
*   ftsK: 2,
*   dbName: 'my_docs',
*   promptEntityExtractor: "Extract key entities from: {{query}}"
* });
* ```
*/
var AzionRetriever = class extends BaseRetriever {
	static lc_name() {
		return "azionRetriever";
	}
	/** Namespace for the retriever in LangChain */
	lc_namespace = [
		"langchain",
		"retrievers",
		"azion"
	];
	/** Type of search to perform - either hybrid (combining vector + FTS) or similarity only */
	searchType;
	/** Number of results to return from similarity search. Minimum is 1. */
	similarityK;
	/** Number of results to return from full text search. Minimum is 1. */
	ftsK;
	/** Interface for generating embeddings from text */
	embeddings;
	/** Name of the database to search */
	dbName;
	/** Optional ChatModel used to extract entities from queries */
	entityExtractor;
	/** Prompt template for entity extraction */
	promptEntityExtractor;
	/** Optional metadata columns to include in results */
	metadataItems;
	/** Name of table containing vector embeddings for similarity search */
	vectorTable;
	/** Name of table containing documents for full text search */
	ftsTable;
	/** Array of filters to apply to search results */
	filters;
	/** Whether the metadata is contained in a single column or multiple columns */
	expandedMetadata;
	constructor(embeddings, args) {
		super(args);
		this.ftsTable = args.ftsTable || "vectors_fts";
		this.vectorTable = args.vectorTable || "vectors";
		this.similarityK = Math.max(1, args.similarityK || 1);
		this.ftsK = Math.max(1, args.ftsK || 1);
		this.dbName = args.dbName || "vectorstore";
		this.embeddings = embeddings;
		this.searchType = args.searchType || "similarity";
		this.entityExtractor = args.entityExtractor || void 0;
		this.metadataItems = args.metadataItems || void 0;
		this.promptEntityExtractor = args.promptEntityExtractor || "Provide them as a space-separated string in lowercase, translated to English.";
		this.filters = args.filters || [];
		this.expandedMetadata = args.expandedMetadata || false;
	}
	/**
	* Generates a string of filters for the SQL query.
	* @param {AzionFilter[]} filters - The filters to apply to the search.
	* @returns {string} A string of filters for the SQL query.
	*/
	generateFilters(filters) {
		if (!filters || filters?.length === 0) return "";
		return `${filters.map(({ operator, column, value }) => {
			const columnRef = this.expandedMetadata ? this.sanitizeItem(column) : `metadata->>'$.${this.sanitizeItem(column)}'`;
			if (["IN", "NOT IN"].includes(operator.toUpperCase())) return `${columnRef} ${operator} (${this.sanitizeItem(value)})`;
			return `${columnRef} ${operator} '${this.sanitizeItem(value)}'`;
		}).join(" AND ")} AND `;
	}
	/**
	* Generates SQL queries for full-text search and similarity search.
	* @param {number[]} embeddedQuery - The embedded query vector.
	* @param {string} queryEntities - The entities extracted from the query for full-text search.
	* @param {string} metadata - Additional metadata columns to be included in the results.
	* @returns An object containing the FTS query and similarity query strings.
	*/
	generateSqlQueries(embeddedQuery, queryEntities, metadata) {
		const filters = this.generateFilters(this.filters);
		let rowsNumber = this.similarityK;
		if (this.searchType === "hybrid") rowsNumber += this.ftsK;
		const ftsQuery = `
      SELECT id, content, ${metadata.replace("hybrid", "fts")}
      FROM ${this.ftsTable} 
      WHERE ${filters} ${this.ftsTable} MATCH '${queryEntities}'
      ORDER BY rank 
      LIMIT ${rowsNumber}
    `;
		const similarityQuery = `
      SELECT id, content, ${metadata.replace("hybrid", "similarity")}
      FROM ${this.vectorTable}  
      WHERE ${filters} rowid IN vector_top_k('${this.vectorTable}_idx', vector('[${embeddedQuery}]'), ${rowsNumber})
    `;
		return {
			ftsQuery,
			similarityQuery
		};
	}
	/**
	* Generates the SQL statements for the similarity search and full-text search.
	* @param query The user query.
	* @returns An array of SQL statements.
	*/
	async generateStatements(query) {
		const embeddedQuery = await this.embeddings.embedQuery(query);
		const metadata = this.generateMetadata();
		let queryEntities = "";
		if (this.searchType === "hybrid") queryEntities = await this.extractEntities(query);
		const { ftsQuery, similarityQuery } = this.generateSqlQueries(embeddedQuery, queryEntities, metadata);
		if (this.searchType === "similarity") return [similarityQuery];
		return [similarityQuery, ftsQuery];
	}
	/**
	* Generates the metadata string for the SQL query.
	* @returns {string} The metadata string.
	*/
	generateMetadata() {
		if (!this.metadataItems) return `json_object('searchtype', '${this.searchType}') as metadata`;
		if (this.expandedMetadata) return `json_object('searchtype','${this.searchType}',${this.metadataItems.map((item) => `'${this.sanitizeItem(item)}', ${this.sanitizeItem(item)}`).join(", ")}) as metadata`;
		return `json_patch(json_object(${this.metadataItems?.map((item) => `'${this.sanitizeItem(item)}', metadata->>'$.${this.sanitizeItem(item)}'`).join(", ")}), '{"searchtype":"${this.searchType}"}') as metadata`;
	}
	/**
	* Performs a similarity search on the vector store and returns the top 'similarityK' similar documents.
	* @param query The query string.
	* @returns A promise that resolves with the similarity search results when the search is complete.
	*/
	async similaritySearchWithScore(query) {
		const statements = await this.generateStatements(query);
		const { data: response, error: errorQuery } = await useQuery(this.dbName, statements);
		if (!response) {
			console.error("RESPONSE ERROR: ", errorQuery);
			throw this.searchError(errorQuery);
		}
		const searches = this.mapRows(response.results);
		const result = this.mapSearches(searches);
		return result;
	}
	/**
	* Extracts entities from a user query using the entityExtractor model.
	* @param query The user query
	* @returns A promise that resolves with the extracted entities when the extraction is complete.
	*/
	async extractEntities(query) {
		if (!this.entityExtractor) return this.convert2FTSQuery(query);
		const entityExtractionPrompt = new SystemMessage(this.promptEntityExtractor);
		const entityQuery = await this.entityExtractor.invoke([entityExtractionPrompt, new HumanMessage(query)]);
		return this.convert2FTSQuery(entityQuery.content.toString());
	}
	/**
	* Converts a query to a FTS query.
	* @param query The user query
	* @returns The converted FTS query
	*/
	convert2FTSQuery(query) {
		return query.replace(/[^a-záàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s]/g, "").replace(/\s+/g, " ").trim().split(" ").join(" OR ");
	}
	/**
	* Performs a hybrid search on the vector store, using cosine similarity and FTS search, and
	* returns the top 'similarityK' + 'ftsK' similar documents.
	* @param query The user query
	* @returns A promise that resolves with the hybrid search results when the search is complete.
	*/
	async hybridSearchAzion(query) {
		const statements = await this.generateStatements(query);
		const { data: response, error: errorQuery } = await useQuery(this.dbName, statements);
		if (!response) {
			console.error("RESPONSE ERROR: ", errorQuery);
			throw this.searchError(errorQuery);
		}
		const results = this.mapRows(response.results);
		const finalResults = this.removeDuplicates(results);
		return this.mapSearches(finalResults);
	}
	/**
	* Generates an error document based on the provided error information
	* @param error The error object containing details about the issue
	* @returns A promise that resolves to an array containing a single Document representing the error
	*/
	searchError(error) {
		throw new Error(error?.message);
	}
	/**
	* Performs the selected search and returns the documents retrieved.
	* @param query The user query
	* @returns A promise that resolves with the completion of the search results.
	*/
	async _getRelevantDocuments(query) {
		let result;
		if (this.searchType === "similarity") result = await this.similaritySearchWithScore(query);
		else result = await this.hybridSearchAzion(query);
		return result.map(([doc]) => doc);
	}
	/**
	* Removes duplicate results from the search results, prioritizing a mix of similarity and FTS results.
	* @param {SearchEmbeddingsResponse[]} results - The array of search results to process.
	* @returns {SearchEmbeddingsResponse[]} An array of unique search results, with a maximum of 3 similarity and 3 FTS results.
	*/
	removeDuplicates(results) {
		const uniqueResults = [];
		const seenIds = /* @__PURE__ */ new Set();
		let similarityCount = 0;
		let ftsCount = 0;
		const maxItems = this.ftsK + this.similarityK;
		for (const result of results) {
			if (!seenIds.has(result.id)) {
				if (result.metadata.searchtype === "similarity" && similarityCount < this.similarityK) {
					seenIds.add(result.id);
					uniqueResults.push(result);
					similarityCount += 1;
				} else if (result.metadata.searchtype === "fts" && ftsCount < this.ftsK) {
					seenIds.add(result.id);
					uniqueResults.push(result);
					ftsCount += 1;
				}
			}
			if (similarityCount + ftsCount === maxItems) break;
		}
		return uniqueResults;
	}
	/**
	* Converts query results to SearchEmbeddingsResponse objects.
	* @param {QueryResult[]} results - The raw query results from the database.
	* @returns {SearchEmbeddingsResponse[]} An array of SearchEmbeddingsResponse objects.
	*/
	mapRows(results) {
		if (!results) return [];
		return results.flatMap((queryResult) => {
			if (!queryResult.rows || !queryResult.columns) return [];
			return queryResult.rows.map((row) => ({
				id: Number(row[0]),
				content: String(row[1]),
				metadata: JSON.parse(String(row[2]))
			}));
		});
	}
	/**
	* Maps search results to Document objects.
	* @param {SearchEmbeddingsResponse[]} searches An array of SearchEmbeddingsResponse objects.
	* @returns An array of tuples, each containing a single Document object.
	*/
	mapSearches(searches) {
		return searches.map((resp) => [new Document({
			metadata: resp.metadata,
			pageContent: resp.content,
			id: resp.id.toString()
		})]);
	}
	/**
	* Sanitizes an item by removing non-alphanumeric characters.
	* @param {string} item The item to sanitize.
	* @returns {string} The sanitized item.
	*/
	sanitizeItem(item) {
		if (item) return item.replace(/[^a-zA-Z0-9\s]/g, "");
		return "";
	}
};

//#endregion
export { AzionRetriever, azion_edgesql_exports };
//# sourceMappingURL=azion_edgesql.js.map