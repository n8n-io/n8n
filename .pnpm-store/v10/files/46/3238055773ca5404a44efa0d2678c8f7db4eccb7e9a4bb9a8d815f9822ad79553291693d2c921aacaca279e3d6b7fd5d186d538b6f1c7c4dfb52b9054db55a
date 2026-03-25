import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";
import { Callbacks } from "@langchain/core/callbacks/manager";
import { ZepClient } from "../";
/**
 * Interface for the configuration options for a ZepVectorStore instance.
 */
export interface IZepConfig {
    apiUrl?: string;
    apiKey?: string;
    client?: ZepClient;
    collectionName: string;
    description?: string;
    metadata?: Record<string, never>;
}
/**
 * Interface for the parameters required to delete documents from a
 * ZepVectorStore instance.
 */
export interface IZepDeleteParams {
    uuids: string[];
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
export declare class ZepVectorStore extends VectorStore {
    client: ZepClient;
    collectionName: string;
    private readonly initPromise;
    constructor(embeddings: EmbeddingsInterface, args: IZepConfig);
    /**
     * Initializes the document collection. If the collection does not exist, it creates a new one.
     *
     * @param {IZepConfig} args - The configuration object for the Zep API.
     */
    private initCollection;
    /**
     * Creates a new document collection.
     *
     * @param {IZepConfig} args - The configuration object for the Zep API.
     */
    private createCollection;
    /**
     * Adds vectors and corresponding documents to the collection.
     *
     * @param {number[][]} vectors - The vectors to add.
     * @param {Document[]} documents - The corresponding documents to add.
     * @returns {Promise<string[]>} - A promise that resolves with the UUIDs of the added documents.
     */
    addVectors(vectors: number[][], documents: Document[]): Promise<string[]>;
    /**
     * Adds documents to the collection. The documents are first embedded into vectors
     * using the provided embedding model.
     *
     * @param {Document[]} documents - The documents to add.
     * @returns {Promise<string[]>} - A promise that resolves with the UUIDs of the added documents.
     */
    addDocuments(documents: Document[]): Promise<string[]>;
    _vectorstoreType(): string;
    /**
     * Deletes documents from the collection.
     *
     * @param {IZepDeleteParams} params - The list of Zep document UUIDs to delete.
     * @returns {Promise<void>}
     */
    delete(params: IZepDeleteParams): Promise<void>;
    /**
     * Performs a similarity search in the collection and returns the results with their scores.
     *
     * @param {number[]} query - The query vector.
     * @param {number} k - The number of results to return.
     * @param {Record<string, unknown>} filter - The filter to apply to the search. Zep only supports Record<string, unknown> as filter.
     * @returns {Promise<[Document, number][]>} - A promise that resolves with the search results and their scores.
     */
    similaritySearchVectorWithScore(query: number[], k: number, filter?: Record<string, unknown> | undefined): Promise<[Document, number][]>;
    _similaritySearchWithScore(query: string, k: number, filter?: Record<string, unknown> | undefined): Promise<[Document, number][]>;
    similaritySearchWithScore(query: string, k?: number, filter?: Record<string, unknown> | undefined, _callbacks?: undefined): Promise<[Document, number][]>;
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
    similaritySearch(query: string, k?: number, filter?: this["FilterType"] | undefined, _callbacks?: Callbacks | undefined): Promise<Document[]>;
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
    maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<Document[]>;
    static init(zepConfig: IZepConfig): Promise<ZepVectorStore>;
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
    static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, zepConfig: IZepConfig): Promise<ZepVectorStore>;
    /**
     * Creates a new ZepVectorStore instance from an array of Documents. Each Document is added to a Zep collection.
     *
     * @param {Document[]} docs - The Documents to add.
     * @param {Embeddings} embeddings - The embeddings to use for vectorizing the Document contents.
     * @param {IZepConfig} zepConfig - The configuration object for the Zep API.
     * @returns {Promise<ZepVectorStore>} - A promise that resolves with the new ZepVectorStore instance.
     */
    static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, zepConfig: IZepConfig): Promise<ZepVectorStore>;
}
