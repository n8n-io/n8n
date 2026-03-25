import { IAddCollectionParams, IUpdateCollectionParams, IZepClient } from "./interfaces";
import DocumentCollection from "./document_collection";
/**
 * DocumentManager provides methods to list, create, update, get, and delete
 * Zep document collections.
 */
export default class DocumentManager {
    client: IZepClient;
    /**
     * Constructs a new DocumentManager instance.
     * @param {IZepClient} client - The Zep client instance.
     */
    constructor(client: IZepClient);
    /**
     * Adds a new collection to the Zep client.
     * @param {IAddCollectionParams} params - The parameters for the new collection.
     * @returns {Promise<DocumentCollection>} A promise that resolves to the new
     * DocumentCollection instance.
     * @throws {Error} If embeddingDimensions is not a positive integer.
     * @throws {APIError} If the request fails.
     */
    addCollection({ name, embeddingDimensions, description, metadata, isAutoEmbedded, }: IAddCollectionParams): Promise<DocumentCollection>;
    /**
     * Retrieves a collection from the Zep client.
     * @param {string} name - The name of the collection.
     * @returns {Promise<DocumentCollection>} A promise that resolves to the DocumentCollection
     * instance.
     * @throws {Error} If the collection name is not provided.
     * @throws {NotFoundError} If the collection is not found.
     * @throws {APIError} If the request fails.
     */
    getCollection(name: string): Promise<DocumentCollection>;
    /**
     * Updates a collection in the Zep client.
     * @param {IUpdateCollectionParams} params - The parameters to update the collection.
     * @returns {Promise<DocumentCollection>} A promise that resolves to the updated
     * DocumentCollection instance.
     * @throws {Error} If neither description nor metadata are provided.
     * @throws {APIError} If the request fails.
     * @throws {NotFoundError} If the collection is not found.
     */
    updateCollection({ name, description, metadata, }: IUpdateCollectionParams): Promise<DocumentCollection>;
    /**
     * Lists all collections in the Zep client.
     * @returns {Promise<DocumentCollection[]>} A promise that resolves to an array of
     * DocumentCollection instances.
     * @throws {APIError} If the request fails.
     */
    listCollections(): Promise<DocumentCollection[]>;
    /**
     * Deletes a collection from the Zep client.
     * @param {string} collectionName - The name of the collection to delete.
     * @returns {Promise<void>} A promise that resolves when the collection is deleted.
     * @throws {Error} If the collection name is not provided.
     * @throws {NotFoundError} If the collection is not found.
     * @throws {APIError} If the request fails.
     */
    deleteCollection(collectionName: string): Promise<void>;
}
