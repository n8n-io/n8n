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
Object.defineProperty(exports, "__esModule", { value: true });
const promise_pool_1 = require("@supercharge/promise-pool");
const document_models_1 = require("./document_models");
const utils_1 = require("./utils");
const errors_1 = require("./errors");
const MIN_DOCS_TO_INDEX = 10000;
const DEFAULT_BATCH_SIZE = 500;
const MAX_CONCURRENT_BATCHES = 5;
const LARGE_BATCH_WARNING_LIMIT = 1000;
const LARGE_BATCH_WARNING = `Batch size is greater than ${LARGE_BATCH_WARNING_LIMIT}. 
This may result in slow performance or out-of-memory failures.`;
/**
 * DocumentCollection extends DocumentCollectionModel.
 * It provides methods to interact with a Zep document collection.
 */
class DocumentCollection extends document_models_1.DocumentCollectionModel {
    /**
     * Constructs a new DocumentCollection instance.
     * @param {IZepClient} client - The Zep client instance.
     * @param {IDocumentCollectionModel} params - The parameters for the document collection.
     */
    constructor(client, params) {
        super(params);
        this.client = client;
    }
    /**
     * Returns the status of the document collection.
     * @returns {string} The status of the document collection.
     * "ready" if all documents are embedded, "pending" otherwise.
     */
    get status() {
        if (this.document_count &&
            this.document_embedded_count === this.document_count) {
            return "ready";
        }
        return "pending";
    }
    /**
     * Adds documents to the collection.
     * @param {IDocument[]} documents - The documents to add.
     * @returns {Promise<string[]>} A promise that resolves to an array of document UUIDs.
     * @throws {Error} If the collection name is not provided or no documents are provided.
     * @throws {APIError} If the request fails.
     */
    addDocuments(documents) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.name.length === 0) {
                throw new Error("Collection name must be provided");
            }
            if (documents.length === 0) {
                throw new Error("No documents provided");
            }
            if (documents.length > LARGE_BATCH_WARNING_LIMIT) {
                console.warn(LARGE_BATCH_WARNING);
            }
            // 1. Split the documents into batches of DEFAULT_BATCH_SIZE
            const batches = [];
            for (let i = 0; i < documents.length; i += DEFAULT_BATCH_SIZE) {
                batches.push(documents.slice(i, i + DEFAULT_BATCH_SIZE));
            }
            // 2. Create a function that will take a batch of documents and
            // return a promise that resolves when the batch is uploaded.
            const uploadBatch = (batch) => __awaiter(this, void 0, void 0, function* () {
                const body = JSON.stringify((0, document_models_1.docsWithFloatArrayToDocs)(batch));
                const url = this.client.getFullUrl(`/collection/${this.name}/document`);
                const response = yield (0, utils_1.handleRequest)(fetch(url, {
                    method: "POST",
                    headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                    body,
                }));
                return response.json();
            });
            // 3. Upload the batches in parallel
            // limit the number of concurrent batches to MAX_CONCURRENT_BATCHES
            const { results } = yield promise_pool_1.PromisePool.for(batches)
                .withConcurrency(MAX_CONCURRENT_BATCHES)
                .process((batch) => __awaiter(this, void 0, void 0, function* () {
                const result = yield uploadBatch(batch);
                return result;
            }));
            // Flatten the results array
            return results.flat();
        });
    }
    /**
     * Updates a document in the collection.
     * @param {IUpdateDocumentParams} params - The parameters to update the document.
     * @returns {Promise<void>} A promise that resolves when the document is updated.
     * @throws {Error} If the collection name is not provided or the document does not have a uuid.
     * @throws {APIError} If the request fails.
     * @throws {NotFoundError} If the request no document is found for the given uuid.
     */
    updateDocument({ uuid, documentId, metadata, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.name.length === 0) {
                throw new Error("Collection name must be provided");
            }
            if (!uuid) {
                throw new Error("Document must have a uuid");
            }
            const url = this.client.getFullUrl(`/collection/${this.name}/document/${uuid}`);
            yield (0, utils_1.handleRequest)(fetch(url, {
                method: "PATCH",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify({
                    uuid,
                    document_id: documentId,
                    metadata,
                }),
            }));
        });
    }
    /**
     * Deletes a document from the collection.
     * @param {string} uuid - The uuid of the document to delete.
     * @returns {Promise<void>} A promise that resolves when the document is deleted.
     * @throws {Error} If the collection name is not provided or the document does not have a uuid.
     * @throws {APIError} If the request fails.
     * @throws {NotFoundError} If the request no document is found for the given uuid.
     */
    deleteDocument(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.name.length === 0) {
                throw new Error("Collection name must be provided");
            }
            if (uuid.length === 0) {
                throw new Error("Document must have a uuid");
            }
            const url = this.client.getFullUrl(`/collection/${this.name}/document/uuid/${uuid}`);
            yield (0, utils_1.handleRequest)(fetch(url, {
                method: "DELETE",
                headers: this.client.headers,
            }));
        });
    }
    /**
     * Gets a document from the collection.
     * @param {string} uuid - The uuid of the document to get.
     * @returns {Promise<IDocument>} A promise that resolves to the document.
     * @throws {Error} If the collection name is not provided or the document does not have a uuid.
     * @throws {APIError} If the request fails.
     * @throws {NotFoundError} If the request no document is found for the given uuid.
     */
    getDocument(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.name.length === 0) {
                throw new Error("Collection name must be provided");
            }
            if (uuid.length === 0) {
                throw new Error("Document must have a uuid");
            }
            const url = this.client.getFullUrl(`/collection/${this.name}/document/${uuid}`);
            const response = yield (0, utils_1.handleRequest)(fetch(url, {
                headers: this.client.headers,
            }));
            const document = yield response.json();
            if (!(0, document_models_1.isGetIDocument)(document)) {
                throw new errors_1.APIError("Unexpected document response from server");
            }
            // embedding object or array to Float32Array
            if (document.embedding) {
                document.embedding = new Float32Array(document.embedding);
            }
            return document;
        });
    }
    /**
     * Gets multiple documents from the collection.
     * @param {string[]} uuids - The uuids of the documents to get.
     * @returns {Promise<IDocument[]>} A promise that resolves to an array of documents.
     * @throws {Error} If any of the documents do not match the expected format.
     * @throws {Error} If the collection name is not provided or no uuids are provided.
     * @throws {APIError} If the request fails.
     */
    getDocuments(uuids) {
        return __awaiter(this, void 0, void 0, function* () {
            if (uuids.length === 0) {
                throw new Error("No uuids provided");
            }
            if (this.name.length === 0) {
                throw new Error("Collection name must be provided");
            }
            if (uuids.length > LARGE_BATCH_WARNING_LIMIT) {
                console.warn(LARGE_BATCH_WARNING);
            }
            const url = this.client.getFullUrl(`/collection/${this.name}/document/list/get`);
            const response = yield (0, utils_1.handleRequest)(fetch(url, {
                method: "POST",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify({ uuids }),
            }));
            const documents = yield response.json();
            if (!Array.isArray(documents)) {
                throw new errors_1.APIError("Unexpected document response from server");
            }
            if (documents.map((d) => (0, document_models_1.isGetIDocument)(d)).includes(false)) {
                throw new errors_1.APIError("Unexpected document response from server");
            }
            // embedding object or array to Float32Array
            return (0, document_models_1.docsToDocsWithFloatArray)(documents);
        });
    }
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
    searchReturnQueryVector(query, limit) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.name.length === 0) {
                throw new Error("Collection name must be provided");
            }
            if (((_a = query.text) === null || _a === void 0 ? void 0 : _a.length) === 0 &&
                ((_b = query.embedding) === null || _b === void 0 ? void 0 : _b.length) === 0 &&
                ((_c = query.metadata) === null || _c === void 0 ? void 0 : _c.length) === 0) {
                throw new Error("Search query must have at least one of text, embedding, or metadata");
            }
            const q = Object.assign(Object.assign({}, query), { search_type: query.searchType, mmr_lambda: query.mmrLambda, embedding: query.embedding ? Array.from(query.embedding) : undefined });
            const payload = JSON.stringify(Object.fromEntries(Object.entries(q).filter(([k, v]) => v !== undefined && k !== "mmrLambda" && k !== "searchType")));
            const limitParam = limit ? `?limit=${limit}` : "";
            const url = this.client.getFullUrl(`/collection/${this.name}/search`) + limitParam;
            const response = yield (0, utils_1.handleRequest)(fetch(url, {
                method: "POST",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: payload,
            }));
            const results = yield response.json();
            const { results: documents, query_vector: queryVector } = results;
            if (documents.length === 0) {
                return [[], new Float32Array()];
            }
            if (!Array.isArray(documents)) {
                throw new errors_1.APIError("Unexpected document response from server");
            }
            if (documents.map((d) => (0, document_models_1.isGetIDocument)(d)).includes(false)) {
                throw new errors_1.APIError("Unexpected document response from server");
            }
            if (!Array.isArray(queryVector)) {
                throw new errors_1.APIError("Unexpected vector response from server");
            }
            if (queryVector.map((v) => (0, utils_1.isFloat)(v)).includes(false)) {
                throw new errors_1.APIError("Unexpected vector response from server");
            }
            return [
                (0, document_models_1.docsToDocsWithFloatArray)(documents),
                new Float32Array(queryVector),
            ];
        });
    }
    /**
     * Searches the collection.
     * @param {ISearchQuery} query - The search query.
     * @param {number} [limit] - The maximum number of results to return.
     * @returns {Promise<IDocument[]>} A promise that resolves to an array of documents.
     * @throws {Error} If the collection name is not provided or
     *   the search query does not have at least one of text, embedding, or metadata.
     * @throws {APIError} If the request fails.
     */
    search(query, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const [results] = yield this.searchReturnQueryVector(query, limit);
            return results;
        });
    }
    /**
     * Creates an index for the collection.
     * @param {boolean} [force=false] - Whether to force index creation even if
     * there are less than MIN_DOCS_TO_INDEX documents.
     * @returns {Promise<void>} A promise that resolves when the index is created.
     * @throws {Error} If the collection name is not provided or the collection
     * has less than MIN_DOCS_TO_INDEX documents and force is not true.
     * @throws {APIError} If the request fails.
     */
    createIndex(force) {
        return __awaiter(this, void 0, void 0, function* () {
            const forceParam = force ? `?force=${force}` : "";
            if (this.name.length === 0) {
                throw new Error("Collection name must be provided");
            }
            if (!force &&
                (this === null || this === void 0 ? void 0 : this.document_count) &&
                (this === null || this === void 0 ? void 0 : this.document_count) < MIN_DOCS_TO_INDEX) {
                throw new Error(`Collection must have at least ${MIN_DOCS_TO_INDEX} documents to index. Use force=true to override.`);
            }
            const url = this.client.getFullUrl(`/collection/${this.name}/index/create`);
            yield (0, utils_1.handleRequest)(fetch(url + forceParam, {
                method: "POST",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
            }));
        });
    }
}
exports.default = DocumentCollection;
