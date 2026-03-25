"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const document_models_1 = require("./document_models");
const utils_1 = require("./utils");
const document_collection_1 = __importDefault(require("./document_collection"));
/**
 * DocumentManager provides methods to list, create, update, get, and delete
 * Zep document collections.
 */
class DocumentManager {
    /**
     * Constructs a new DocumentManager instance.
     * @param {IZepClient} client - The Zep client instance.
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * Adds a new collection to the Zep client.
     * @param {IAddCollectionParams} params - The parameters for the new collection.
     * @returns {Promise<DocumentCollection>} A promise that resolves to the new
     * DocumentCollection instance.
     * @throws {Error} If embeddingDimensions is not a positive integer.
     * @throws {APIError} If the request fails.
     */
    addCollection({ name, embeddingDimensions, description, metadata, isAutoEmbedded = true, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (embeddingDimensions <= 0) {
                throw new Error("embeddingDimensions must be a positive integer");
            }
            const collection = new document_models_1.DocumentCollectionModel({
                name,
                description,
                metadata,
                embedding_dimensions: embeddingDimensions,
                is_auto_embedded: isAutoEmbedded,
            });
            yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/collection/${name}`), {
                method: "POST",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify(collection.toDict()),
            }));
            return this.getCollection(collection.name);
        });
    }
    /**
     * Retrieves a collection from the Zep client.
     * @param {string} name - The name of the collection.
     * @returns {Promise<DocumentCollection>} A promise that resolves to the DocumentCollection
     * instance.
     * @throws {Error} If the collection name is not provided.
     * @throws {NotFoundError} If the collection is not found.
     * @throws {APIError} If the request fails.
     */
    getCollection(name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!name || name.trim() === "") {
                throw new Error("Collection name must be provided");
            }
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/collection/${name}`), {
                headers: this.client.headers,
            }));
            const responseData = yield response.json();
            return new document_collection_1.default(this.client, {
                name: responseData.name,
                uuid: responseData.uuid,
                created_at: responseData.created_at,
                updated_at: responseData.updated_at,
                description: responseData.description,
                metadata: responseData.metadata,
                embedding_dimensions: responseData.embeddingDimensions,
                is_auto_embedded: responseData.isAutoEmbedded,
                is_indexed: responseData.is_indexed,
                document_count: responseData.document_count,
                document_embedded_count: responseData.document_embedded_count,
                is_normalized: responseData.is_normalized,
            });
        });
    }
    /**
     * Updates a collection in the Zep client.
     * @param {IUpdateCollectionParams} params - The parameters to update the collection.
     * @returns {Promise<DocumentCollection>} A promise that resolves to the updated
     * DocumentCollection instance.
     * @throws {Error} If neither description nor metadata are provided.
     * @throws {APIError} If the request fails.
     * @throws {NotFoundError} If the collection is not found.
     */
    updateCollection({ name, description, metadata, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((description === null || description === void 0 ? void 0 : description.length) === 0 && metadata === undefined) {
                throw new Error("Either description or metadata must be provided");
            }
            const collection = new document_models_1.DocumentCollectionModel({
                name,
                description,
                metadata,
            });
            yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/collection/${collection.name}`), {
                method: "PATCH",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify(collection.toDict()),
            }));
            return this.getCollection(collection.name);
        });
    }
    /**
     * Lists all collections in the Zep client.
     * @returns {Promise<DocumentCollection[]>} A promise that resolves to an array of
     * DocumentCollection instances.
     * @throws {APIError} If the request fails.
     */
    listCollections() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl("/collection"), {
                headers: this.client.headers,
            }));
            const responseData = yield response.json();
            return responseData.map((collectionData) => new document_collection_1.default(this.client, {
                name: collectionData.name,
                uuid: collectionData.uuid,
                created_at: collectionData.created_at,
                updated_at: collectionData.updated_at,
                description: collectionData.description,
                metadata: collectionData.metadata,
                embedding_dimensions: collectionData.embedding_dimensions,
                is_auto_embedded: collectionData.is_auto_embedded,
                is_indexed: collectionData.is_indexed,
                document_count: collectionData.document_count,
                document_embedded_count: collectionData.document_embedded_count,
                is_normalized: collectionData.is_normalized,
            }));
        });
    }
    /**
     * Deletes a collection from the Zep client.
     * @param {string} collectionName - The name of the collection to delete.
     * @returns {Promise<void>} A promise that resolves when the collection is deleted.
     * @throws {Error} If the collection name is not provided.
     * @throws {NotFoundError} If the collection is not found.
     * @throws {APIError} If the request fails.
     */
    deleteCollection(collectionName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!collectionName || collectionName.trim() === "") {
                throw new Error("Collection name must be provided");
            }
            yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/collection/${collectionName}`), {
                method: "DELETE",
                headers: this.client.headers,
            }));
        });
    }
}
exports.default = DocumentManager;
