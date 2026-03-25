import { __export } from "../_virtual/rolldown_runtime.js";
import { EncoderBackedStore } from "../storage/encoder_backed.js";
import { sha256 } from "@langchain/core/utils/hash";
import { Embeddings } from "@langchain/core/embeddings";

//#region src/embeddings/cache_backed.ts
var cache_backed_exports = {};
__export(cache_backed_exports, { CacheBackedEmbeddings: () => CacheBackedEmbeddings });
/**
* Interface for caching results from embedding models.
*
* The interface allows works with any store that implements
* the abstract store interface accepting keys of type str and values of list of
* floats.
*
* If need be, the interface can be extended to accept other implementations
* of the value serializer and deserializer, as well as the key encoder.
* @example
* ```typescript
* const underlyingEmbeddings = new OpenAIEmbeddings();
*
* const cacheBackedEmbeddings = CacheBackedEmbeddings.fromBytesStore(
*   underlyingEmbeddings,
*   new ConvexKVStore({ ctx }),
*   {
*     namespace: underlyingEmbeddings.modelName,
*   },
* );
*
* const loader = new TextLoader("./state_of_the_union.txt");
* const rawDocuments = await loader.load();
* const splitter = new RecursiveCharacterTextSplitter({
*   chunkSize: 1000,
*   chunkOverlap: 0,
* });
* const documents = await splitter.splitDocuments(rawDocuments);
*
* let time = Date.now();
* const vectorstore = await ConvexVectorStore.fromDocuments(
*   documents,
*   cacheBackedEmbeddings,
*   { ctx },
* );
* console.log(`Initial creation time: ${Date.now() - time}ms`);
*
* time = Date.now();
* const vectorstore2 = await ConvexVectorStore.fromDocuments(
*   documents,
*   cacheBackedEmbeddings,
*   { ctx },
* );
* console.log(`Cached creation time: ${Date.now() - time}ms`);
*
* ```
*/
var CacheBackedEmbeddings = class extends Embeddings {
	underlyingEmbeddings;
	documentEmbeddingStore;
	constructor(fields) {
		super(fields);
		this.underlyingEmbeddings = fields.underlyingEmbeddings;
		this.documentEmbeddingStore = fields.documentEmbeddingStore;
	}
	/**
	* Embed query text.
	*
	* This method does not support caching at the moment.
	*
	* Support for caching queries is easy to implement, but might make
	* sense to hold off to see the most common patterns.
	*
	* If the cache has an eviction policy, we may need to be a bit more careful
	* about sharing the cache between documents and queries. Generally,
	* one is OK evicting query caches, but document caches should be kept.
	*
	* @param document The text to embed.
	* @returns The embedding for the given text.
	*/
	async embedQuery(document) {
		return this.underlyingEmbeddings.embedQuery(document);
	}
	/**
	* Embed a list of texts.
	*
	* The method first checks the cache for the embeddings.
	* If the embeddings are not found, the method uses the underlying embedder
	* to embed the documents and stores the results in the cache.
	*
	* @param documents
	* @returns A list of embeddings for the given texts.
	*/
	async embedDocuments(documents) {
		const vectors = await this.documentEmbeddingStore.mget(documents);
		const missingIndicies = [];
		const missingDocuments = [];
		for (let i = 0; i < vectors.length; i += 1) if (vectors[i] === void 0) {
			missingIndicies.push(i);
			missingDocuments.push(documents[i]);
		}
		if (missingDocuments.length) {
			const missingVectors = await this.underlyingEmbeddings.embedDocuments(missingDocuments);
			const keyValuePairs = missingDocuments.map((document, i) => [document, missingVectors[i]]);
			await this.documentEmbeddingStore.mset(keyValuePairs);
			for (let i = 0; i < missingIndicies.length; i += 1) vectors[missingIndicies[i]] = missingVectors[i];
		}
		return vectors;
	}
	/**
	* Create a new CacheBackedEmbeddings instance from another embeddings instance
	* and a storage instance.
	* @param underlyingEmbeddings Embeddings used to populate the cache for new documents.
	* @param documentEmbeddingStore Stores raw document embedding values. Keys are hashes of the document content.
	* @param options.namespace Optional namespace for store keys.
	* @returns A new CacheBackedEmbeddings instance.
	*/
	static fromBytesStore(underlyingEmbeddings, documentEmbeddingStore, options) {
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();
		const encoderBackedStore = new EncoderBackedStore({
			store: documentEmbeddingStore,
			keyEncoder: (key) => (options?.namespace ?? "") + sha256(key),
			valueSerializer: (value) => encoder.encode(JSON.stringify(value)),
			valueDeserializer: (serializedValue) => JSON.parse(decoder.decode(serializedValue))
		});
		return new this({
			underlyingEmbeddings,
			documentEmbeddingStore: encoderBackedStore
		});
	}
};

//#endregion
export { CacheBackedEmbeddings, cache_backed_exports };
//# sourceMappingURL=cache_backed.js.map