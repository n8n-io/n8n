import { DocumentCollectionModel, IDocument, IDocumentCollectionModel } from "./document_models";
import { ISearchQuery, IUpdateDocumentParams, IZepClient } from "./interfaces";
/**
 * DocumentCollection extends DocumentCollectionModel.
 * It provides methods to interact with a Zep document collection.
 */
export default class DocumentCollection extends DocumentCollectionModel {
    private client;
    /**
     * Constructs a new DocumentCollection instance.
     * @param {IZepClient} client - The Zep client instance.
     * @param {IDocumentCollectionModel} params - The parameters for the document collection.
     */
    constructor(client: IZepClient, params: IDocumentCollectionModel);
    /**
     * Returns the status of the document collection.
     * @returns {string} The status of the document collection.
     * "ready" if all documents are embedded, "pending" otherwise.
     */
    get status(): string;
    /**
     * Adds documents to the collection.
     * @param {IDocument[]} documents - The documents to add.
     * @returns {Promise<string[]>} A promise that resolves to an array of document UUIDs.
     * @throws {Error} If the collection name is not provided or no documents are provided.
     * @throws {APIError} If the request fails.
     */
    addDocuments(documents: IDocument[]): Promise<string[]>;
    /**
     * Updates a document in the collection.
     * @param {IUpdateDocumentParams} params - The parameters to update the document.
     * @returns {Promise<void>} A promise that resolves when the document is updated.
     * @throws {Error} If the collection name is not provided or the document does not have a uuid.
     * @throws {APIError} If the request fails.
     * @throws {NotFoundError} If the request no document is found for the given uuid.
     */
    updateDocument({ uuid, documentId, metadata, }: IUpdateDocumentParams): Promise<void>;
    /**
     * Deletes a document from the collection.
     * @param {string} uuid - The uuid of the document to delete.
     * @returns {Promise<void>} A promise that resolves when the document is deleted.
     * @throws {Error} If the collection name is not provided or the document does not have a uuid.
     * @throws {APIError} If the request fails.
     * @throws {NotFoundError} If the request no document is found for the given uuid.
     */
    deleteDocument(uuid: string): Promise<void>;
    /**
     * Gets a document from the collection.
     * @param {string} uuid - The uuid of the document to get.
     * @returns {Promise<IDocument>} A promise that resolves to the document.
     * @throws {Error} If the collection name is not provided or the document does not have a uuid.
     * @throws {APIError} If the request fails.
     * @throws {NotFoundError} If the request no document is found for the given uuid.
     */
    getDocument(uuid: string): Promise<IDocument>;
    /**
     * Gets multiple documents from the collection.
     * @param {string[]} uuids - The uuids of the documents to get.
     * @returns {Promise<IDocument[]>} A promise that resolves to an array of documents.
     * @throws {Error} If any of the documents do not match the expected format.
     * @throws {Error} If the collection name is not provided or no uuids are provided.
     * @throws {APIError} If the request fails.
     */
    getDocuments(uuids: string[]): Promise<IDocument[]>;
    /**
     * Searches the collection and returns the results and the query vector.
     * @param {ISearchQuery} query - The search query.
     * @param {number} [limit] - The maximum number of results to return.
     * @returns {Promise<[IDocument[], Float32Array]>}
     *    A promise that resolves to an array of documents and the query vector.
     * @throws {Error} If the collection name is not provided or
     *    the search query does not have at least one of text, embedding, or metadata.
     * @throws {APIError} If the request fails.
     */
    searchReturnQueryVector(query: ISearchQuery, limit?: number): Promise<[IDocument[], Float32Array]>;
    /**
     * Searches the collection.
     * @param {ISearchQuery} query - The search query.
     * @param {number} [limit] - The maximum number of results to return.
     * @returns {Promise<IDocument[]>} A promise that resolves to an array of documents.
     * @throws {Error} If the collection name is not provided or
     *   the search query does not have at least one of text, embedding, or metadata.
     * @throws {APIError} If the request fails.
     */
    search(query: ISearchQuery, limit?: number): Promise<IDocument[]>;
    /**
     * Creates an index for the collection.
     * @param {boolean} [force=false] - Whether to force index creation even if
     * there are less than MIN_DOCS_TO_INDEX documents.
     * @returns {Promise<void>} A promise that resolves when the index is created.
     * @throws {Error} If the collection name is not provided or the collection
     * has less than MIN_DOCS_TO_INDEX documents and force is not true.
     * @throws {APIError} If the request fails.
     */
    createIndex(force?: boolean): Promise<void>;
}
