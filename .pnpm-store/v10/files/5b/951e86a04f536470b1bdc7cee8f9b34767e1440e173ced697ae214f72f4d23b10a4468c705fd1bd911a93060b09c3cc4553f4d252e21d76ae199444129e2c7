import { v4 } from "uuid";
import flatten from "flat";
import { Index } from "@pinecone-database/pinecone";
import { VectorStore } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { chunkArray } from "@langchain/core/utils/chunk_array";
import { maximalMarginalRelevance } from "@langchain/core/utils/math";

//#region src/vectorstores.ts
/**
* Pinecone vector store integration.
*
* Setup:
* Install `@langchain/pinecone` and `@pinecone-database/pinecone` to pass a client in.
*
* ```bash
* npm install @langchain/pinecone @pinecone-database/pinecone
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/_langchain_pinecone.PineconeStore.html#constructor)
*
* <details open>
* <summary><strong>Instantiate</strong></summary>
*
* ```typescript
* import { PineconeStore } from '@langchain/pinecone';
* // Or other embeddings
* import { OpenAIEmbeddings } from '@langchain/openai';
*
* import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
*
* const pinecone = new PineconeClient();
*
* // Will automatically read the PINECONE_API_KEY env var
* const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
*
* const embeddings = new OpenAIEmbeddings({
*   model: "text-embedding-3-small",
* });
*
* const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
*   pineconeIndex,
*   // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
*   maxConcurrency: 5,
*   // You can pass a namespace here too
*   // namespace: "foo",
* });
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
* const document1 = { pageContent: "foo", metadata: { baz: "bar" } };
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
var PineconeStore = class PineconeStore extends VectorStore {
	textKey;
	namespace;
	pineconeIndex;
	filter;
	caller;
	_vectorstoreType() {
		return "pinecone";
	}
	constructor(embeddings, params) {
		super(embeddings, params);
		this.embeddings = embeddings;
		const { namespace, pineconeIndex, textKey, filter, pineconeConfig,...asyncCallerArgs } = params;
		this.namespace = namespace;
		if (!pineconeIndex && !pineconeConfig) throw new Error("pineconeConfig or pineconeIndex must be provided.");
		if (pineconeIndex && pineconeConfig) throw new Error("Only one of pineconeConfig or pineconeIndex can be provided.");
		if (pineconeIndex) this.pineconeIndex = pineconeIndex;
		else if (pineconeConfig) this.pineconeIndex = new Index(pineconeConfig.indexName, {
			...pineconeConfig.config,
			sourceTag: "langchainjs"
		}, pineconeConfig.namespace, pineconeConfig.indexHostUrl, pineconeConfig.additionalHeaders);
		this.textKey = textKey ?? "text";
		this.filter = filter;
		this.caller = new AsyncCaller(asyncCallerArgs);
	}
	/**
	* Method that adds documents to the Pinecone database.
	*
	* @param documents Array of documents to add to the Pinecone database.
	* @param options Optional ids for the documents.
	* @returns Promise that resolves with the ids of the added documents.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Method that adds vectors to the Pinecone database.
	*
	* @param vectors Array of vectors to add to the Pinecone database.
	* @param documents Array of documents associated with the vectors.
	* @param options Optional ids for the vectors.
	* @returns Promise that resolves with the ids of the added vectors.
	*/
	async addVectors(vectors, documents, options) {
		const ids = Array.isArray(options) ? options : options?.ids;
		const documentIds = ids == null ? documents.map(() => v4()) : ids;
		const pineconeVectors = vectors.map((values, idx) => {
			const documentMetadata = { ...documents[idx].metadata };
			const stringArrays = {};
			for (const key of Object.keys(documentMetadata)) if (Array.isArray(documentMetadata[key]) && documentMetadata[key].every((el) => typeof el === "string")) {
				stringArrays[key] = documentMetadata[key];
				delete documentMetadata[key];
			}
			const metadata = {
				...flatten(documentMetadata),
				...stringArrays,
				[this.textKey]: documents[idx].pageContent
			};
			for (const key of Object.keys(metadata)) if (metadata[key] == null) delete metadata[key];
			else if (typeof metadata[key] === "object" && Object.keys(metadata[key]).length === 0) delete metadata[key];
			return {
				id: documentIds[idx],
				metadata,
				values
			};
		});
		const optionsNamespace = !Array.isArray(options) && options?.namespace ? options.namespace : this.namespace;
		const namespace = this.pineconeIndex.namespace(optionsNamespace ?? "");
		const chunkSize = 100;
		const chunkedVectors = chunkArray(pineconeVectors, chunkSize);
		const batchRequests = chunkedVectors.map((chunk) => this.caller.call(async () => {
			try {
				await namespace.upsert(chunk);
			} catch (e) {
				if (e.message.includes("404")) e.statusCode = 404;
				throw e;
			}
		}));
		await Promise.all(batchRequests);
		return documentIds;
	}
	/**
	* Method that deletes vectors from the Pinecone database.
	* @param params Parameters for the delete operation.
	* @returns Promise that resolves when the delete operation is complete.
	*/
	async delete(params) {
		const { deleteAll, ids, filter } = params;
		const optionsNamespace = params.namespace ?? this.namespace;
		const namespace = this.pineconeIndex.namespace(optionsNamespace ?? "");
		if (deleteAll) await namespace.deleteAll();
		else if (ids) {
			const batchSize = 1e3;
			for (let i = 0; i < ids.length; i += batchSize) {
				const batchIds = ids.slice(i, i + batchSize);
				await namespace.deleteMany(batchIds);
			}
		} else if (filter) await namespace.deleteMany(filter);
		else throw new Error("Either ids or delete_all must be provided.");
	}
	async _runPineconeQuery(query, k, filter, options) {
		if (filter && this.filter) throw new Error("cannot provide both `filter` and `this.filter`");
		let _filter = filter ?? this.filter;
		let optionsNamespace = this.namespace ?? "";
		if (_filter && "namespace" in _filter) {
			optionsNamespace = _filter.namespace;
			delete _filter.namespace;
		}
		if (Object.keys(_filter ?? {}).length === 0) _filter = void 0;
		const namespace = this.pineconeIndex.namespace(optionsNamespace ?? "");
		const results = await namespace.query({
			includeMetadata: true,
			topK: k,
			vector: query,
			filter: _filter,
			...options
		});
		return results;
	}
	/**
	* Format the matching results from the Pinecone query.
	* @param matches Matching results from the Pinecone query.
	* @returns An array of arrays, where each inner array contains a document and its score.
	*/
	_formatMatches(matches = []) {
		const documentsWithScores = [];
		for (const record of matches) {
			const { id, score, metadata: { [this.textKey]: pageContent,...metadata } = { [this.textKey]: "" } } = record;
			if (score) documentsWithScores.push([new Document({
				id,
				pageContent: pageContent?.toString() ?? "",
				metadata
			}), score]);
		}
		return documentsWithScores;
	}
	/**
	* Method that performs a similarity search in the Pinecone database and
	* returns the results along with their scores.
	* @param query Query vector for the similarity search.
	* @param k Number of top results to return.
	* @param filter Optional filter to apply to the search.
	* @returns Promise that resolves with an array of documents and their scores.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const { matches = [] } = await this._runPineconeQuery(query, k, filter);
		const records = this._formatMatches(matches);
		return records;
	}
	/**
	* Return documents selected using the maximal marginal relevance.
	* Maximal marginal relevance optimizes for similarity to the query AND diversity
	* among selected documents.
	*
	* @param {string} query - Text to look up documents similar to.
	* @param {number} options.k - Number of documents to return.
	* @param {number} options.fetchK=20 - Number of documents to fetch before passing to the MMR algorithm.
	* @param {number} options.lambda=0.5 - Number between 0 and 1 that determines the degree of diversity among the results,
	*                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
	* @param {PineconeMetadata} options.filter - Optional filter to apply to the search.
	*
	* @returns {Promise<DocumentInterface[]>} - List of documents selected by maximal marginal relevance.
	*/
	async maxMarginalRelevanceSearch(query, options) {
		const queryEmbedding = await this.embeddings.embedQuery(query);
		const results = await this._runPineconeQuery(queryEmbedding, options.fetchK ?? 20, options.filter, { includeValues: true });
		const { matches = [] } = results;
		const embeddingList = matches.map((match) => match.values);
		const mmrIndexes = maximalMarginalRelevance(queryEmbedding, embeddingList, options.lambda, options.k);
		const topMmrMatches = mmrIndexes.map((idx) => matches[idx]);
		const records = this._formatMatches(topMmrMatches);
		return records.map(([doc, _score]) => doc);
	}
	/**
	* Static method that creates a new instance of the PineconeStore class
	* from texts.
	* @param texts Array of texts to add to the Pinecone database.
	* @param metadatas Metadata associated with the texts.
	* @param embeddings Embeddings to use for the texts.
	* @param dbConfig Configuration for the Pinecone database.
	* @returns Promise that resolves with a new instance of the PineconeStore class.
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
		const args = {
			pineconeIndex: dbConfig.pineconeIndex,
			textKey: dbConfig.textKey,
			namespace: dbConfig.namespace
		};
		return PineconeStore.fromDocuments(docs, embeddings, args);
	}
	/**
	* Static method that creates a new instance of the PineconeStore class
	* from documents.
	* @param docs Array of documents to add to the Pinecone database.
	* @param embeddings Embeddings to use for the documents.
	* @param dbConfig Configuration for the Pinecone database.
	* @returns Promise that resolves with a new instance of the PineconeStore class.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const args = dbConfig;
		args.textKey = dbConfig.textKey ?? "text";
		const instance = new this(embeddings, args);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Static method that creates a new instance of the PineconeStore class
	* from an existing index.
	* @param embeddings Embeddings to use for the documents.
	* @param dbConfig Configuration for the Pinecone database.
	* @returns Promise that resolves with a new instance of the PineconeStore class.
	*/
	static async fromExistingIndex(embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		return instance;
	}
};

//#endregion
export { PineconeStore };
//# sourceMappingURL=vectorstores.js.map