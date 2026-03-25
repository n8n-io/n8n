"use strict";
/* eslint import/no-extraneous-dependencies: 0 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZepVectorStore = void 0;
const vectorstores_1 = require("@langchain/core/vectorstores");
const documents_1 = require("@langchain/core/documents");
const math_1 = require("@langchain/core/utils/math");
const testing_1 = require("@langchain/core/utils/testing");
const api_1 = require("../api");
const __1 = require("../");
function zepDocsToDocumentsAndScore(results) {
    return results.map((d) => {
        var _a;
        return [
            new documents_1.Document({
                pageContent: (_a = d.content) !== null && _a !== void 0 ? _a : "",
                metadata: d.metadata,
            }),
            d.score ? d.score : 0,
        ];
    });
}
function assignMetadata(value) {
    if (typeof value === "object" && value !== null) {
        return value;
    }
    if (value !== undefined) {
        console.warn("Metadata filters must be an object, Record, or undefined.");
    }
    return undefined;
}
/**
 * ZepVectorStore is a VectorStore implementation
 * that uses the Zep long-term memory store as a backend.
 *
 * If the collection does not exist, it will be created automatically.
 *
 * Requires `zep-js` to be installed:
 * ```bash
 * npm install @getzep/zep-js
 * ```
 *
 * @property {ZepClient} client - The ZepClient instance used to interact with Zep's API.
 * @property {Promise<void>} initPromise - A promise that resolves
 * when the collection is initialized.
 * @property {DocumentCollection} collection - The Zep document collection.
 */
class ZepVectorStore extends vectorstores_1.VectorStore {
    constructor(embeddings, args) {
        super(embeddings, args);
        this.initPromise = this.initCollection(args).catch((err) => {
            console.error("Error initializing collection:", err);
            throw err;
        });
    }
    /**
     * Initializes the document collection. If the collection does not exist, it creates a new one.
     *
     * @param {IZepConfig} args - The configuration object for the Zep API.
     */
    initCollection(args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (args.client) {
                this.client = args.client;
            }
            else {
                this.client = new __1.ZepClient({
                    apiKey: args.apiKey,
                    environment: args.apiUrl,
                });
            }
            try {
                this.collectionName = args.collectionName;
                yield this.client.document.getCollection(this.collectionName);
            }
            catch (err) {
                if (err instanceof Error) {
                    if (err instanceof api_1.NotFoundError || err.name === "NotFoundError") {
                        yield this.createCollection(args);
                    }
                    else {
                        throw err;
                    }
                }
            }
        });
    }
    /**
     * Creates a new document collection.
     *
     * @param {IZepConfig} args - The configuration object for the Zep API.
     */
    createCollection(args) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.document.addCollection(args.collectionName, {
                description: args.description,
                metadata: args.metadata,
            });
            // eslint-disable-next-line no-console
            console.info("Created new collection:", args.collectionName);
        });
    }
    /**
     * Adds vectors and corresponding documents to the collection.
     *
     * @param {number[][]} vectors - The vectors to add.
     * @param {Document[]} documents - The corresponding documents to add.
     * @returns {Promise<string[]>} - A promise that resolves with the UUIDs of the added documents.
     */
    addVectors(vectors, documents) {
        return __awaiter(this, void 0, void 0, function* () {
            const docs = [];
            for (let i = 0; i < documents.length; i += 1) {
                const doc = {
                    content: documents[i].pageContent,
                    metadata: documents[i].metadata,
                };
                docs.push(doc);
            }
            // Wait for collection to be initialized
            yield this.initPromise;
            return this.client.document.addDocuments(this.collectionName, docs);
        });
    }
    /**
     * Adds documents to the collection. The documents are first embedded into vectors
     * using the provided embedding model.
     *
     * @param {Document[]} documents - The documents to add.
     * @returns {Promise<string[]>} - A promise that resolves with the UUIDs of the added documents.
     */
    addDocuments(documents) {
        return __awaiter(this, void 0, void 0, function* () {
            const vectors = [];
            return this.addVectors(vectors, documents);
        });
    }
    // eslint-disable-next-line class-methods-use-this,no-underscore-dangle
    _vectorstoreType() {
        return "zep";
    }
    /**
     * Deletes documents from the collection.
     *
     * @param {IZepDeleteParams} params - The list of Zep document UUIDs to delete.
     * @returns {Promise<void>}
     */
    delete(params) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Wait for collection to be initialized
            yield this.initPromise;
            try {
                // eslint-disable-next-line no-restricted-syntax
                for (var _b = __asyncValues(params.uuids), _c; _c = yield _b.next(), !_c.done;) {
                    const uuid = _c.value;
                    yield this.client.document.deleteDocument(this.collectionName, uuid);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
    /**
     * Performs a similarity search in the collection and returns the results with their scores.
     *
     * @param {number[]} query - The query vector.
     * @param {number} k - The number of results to return.
     * @param {Record<string, unknown>} filter - The filter to apply to the search. Zep only supports Record<string, unknown> as filter.
     * @returns {Promise<[Document, number][]>} - A promise that resolves with the search results and their scores.
     */
    similaritySearchVectorWithScore(query, k, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            // Deprecated
            console.warn("Zep does not support vector search. Using text search instead.");
            return [];
        });
    }
    // eslint-disable-next-line no-underscore-dangle
    _similaritySearchWithScore(query, k, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initPromise;
            const { results } = yield this.client.document.search(this.collectionName, {
                text: query,
                metadata: assignMetadata(filter),
                limit: k,
            });
            return zepDocsToDocumentsAndScore(results);
        });
    }
    similaritySearchWithScore(query, k = 4, filter = undefined, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callbacks = undefined // implement passing to embedQuery later
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._similaritySearchWithScore(query, k, filter);
        });
    }
    /**
     * Performs a similarity search on the Zep collection.
     *
     * @param {string} query - The query string to search for.
     * @param {number} [k=4] - The number of results to return. Defaults to 4.
     * @param {this["FilterType"] | undefined} [filter=undefined] - An optional set of JSONPath filters to apply to the search.
     * @param {Callbacks | undefined} [_callbacks=undefined] - Optional callbacks. Currently not implemented.
     * @returns {Promise<Document[]>} - A promise that resolves to an array of Documents that are similar to the query.
     *
     * @async
     */
    similaritySearch(query, k = 4, filter = undefined, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callbacks = undefined // implement passing to embedQuery later
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initPromise;
            const { results: zepResults } = yield this.client.document.search(this.collectionName, {
                text: query,
                metadata: assignMetadata(filter),
                limit: k,
            });
            const results = zepDocsToDocumentsAndScore(zepResults);
            return results.map((result) => result[0]);
        });
    }
    /**
     * Return documents selected using the maximal marginal relevance.
     * Maximal marginal relevance optimizes for similarity to the query AND diversity
     * among selected documents.
     *
     * @param {string} query - Text to look up documents similar to.
     * @param options
     * @param {number} options.k - Number of documents to return.
     * @param {number} options.fetchK=20- Number of documents to fetch before passing to the MMR algorithm.
     * @param {number} options.lambda=0.5 - Number between 0 and 1 that determines the degree of diversity among the results,
     *                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
     * @param {Record<string, any>} options.filter - Optional Zep JSONPath query to pre-filter on document metadata field
     *
     * @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
     */
    maxMarginalRelevanceSearch(query, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { k, fetchK = 20, lambda = 0.5, filter } = options;
            const r = yield this.client.document.search(this.collectionName, {
                text: query,
                metadata: assignMetadata(filter),
                limit: fetchK,
            });
            const queryEmbedding = Array.from(r.queryVector);
            const results = zepDocsToDocumentsAndScore(r.results);
            const embeddingList = r.results.map((doc) => Array.from(doc.embedding ? doc.embedding : []));
            const mmrIndexes = (0, math_1.maximalMarginalRelevance)(queryEmbedding, embeddingList, lambda, k);
            return mmrIndexes.filter((idx) => idx !== -1).map((idx) => results[idx][0]);
        });
    }
    static init(zepConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const instance = new this(new testing_1.FakeEmbeddings(), zepConfig);
            // Wait for collection to be initialized
            yield instance.initPromise;
            return instance;
        });
    }
    /**
     * Creates a new ZepVectorStore instance from an array of texts. Each text is converted into a Document and added to the collection.
     *
     * @param {string[]} texts - The texts to convert into Documents.
     * @param {object[] | object} metadatas - The metadata to associate with each Document.
     * If an array is provided, each element is associated with the corresponding Document.
     * If an object is provided, it is associated with all Documents.
     * @param {Embeddings} embeddings - The embeddings to use for vectorizing the texts.
     * @param {IZepConfig} zepConfig - The configuration object for the Zep API.
     * @returns {Promise<ZepVectorStore>} - A promise that resolves with the new ZepVectorStore instance.
     */
    static fromTexts(texts, metadatas, embeddings, zepConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const docs = [];
            for (let i = 0; i < texts.length; i += 1) {
                const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
                const newDoc = new documents_1.Document({
                    pageContent: texts[i],
                    metadata,
                });
                docs.push(newDoc);
            }
            return ZepVectorStore.fromDocuments(docs, embeddings, zepConfig);
        });
    }
    /**
     * Creates a new ZepVectorStore instance from an array of Documents. Each Document is added to a Zep collection.
     *
     * @param {Document[]} docs - The Documents to add.
     * @param {Embeddings} embeddings - The embeddings to use for vectorizing the Document contents.
     * @param {IZepConfig} zepConfig - The configuration object for the Zep API.
     * @returns {Promise<ZepVectorStore>} - A promise that resolves with the new ZepVectorStore instance.
     */
    static fromDocuments(docs, embeddings, zepConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const instance = new this(embeddings, zepConfig);
            // Wait for collection to be initialized
            yield instance.initPromise;
            yield instance.addDocuments(docs);
            return instance;
        });
    }
}
exports.ZepVectorStore = ZepVectorStore;
