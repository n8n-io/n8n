// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../resource.mjs";
import { isRequestOptions } from "../../core.mjs";
import * as FileBatchesAPI from "./file-batches.mjs";
import { FileBatches, } from "./file-batches.mjs";
import * as FilesAPI from "./files.mjs";
import { FileContentResponsesPage, Files, VectorStoreFilesPage, } from "./files.mjs";
import { CursorPage, Page } from "../../pagination.mjs";
export class VectorStores extends APIResource {
    constructor() {
        super(...arguments);
        this.files = new FilesAPI.Files(this._client);
        this.fileBatches = new FileBatchesAPI.FileBatches(this._client);
    }
    /**
     * Create a vector store.
     */
    create(body, options) {
        return this._client.post('/vector_stores', {
            body,
            ...options,
            headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
        });
    }
    /**
     * Retrieves a vector store.
     */
    retrieve(vectorStoreId, options) {
        return this._client.get(`/vector_stores/${vectorStoreId}`, {
            ...options,
            headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
        });
    }
    /**
     * Modifies a vector store.
     */
    update(vectorStoreId, body, options) {
        return this._client.post(`/vector_stores/${vectorStoreId}`, {
            body,
            ...options,
            headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
        });
    }
    list(query = {}, options) {
        if (isRequestOptions(query)) {
            return this.list({}, query);
        }
        return this._client.getAPIList('/vector_stores', VectorStoresPage, {
            query,
            ...options,
            headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
        });
    }
    /**
     * Delete a vector store.
     */
    del(vectorStoreId, options) {
        return this._client.delete(`/vector_stores/${vectorStoreId}`, {
            ...options,
            headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
        });
    }
    /**
     * Search a vector store for relevant chunks based on a query and file attributes
     * filter.
     */
    search(vectorStoreId, body, options) {
        return this._client.getAPIList(`/vector_stores/${vectorStoreId}/search`, VectorStoreSearchResponsesPage, {
            body,
            method: 'post',
            ...options,
            headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
        });
    }
}
export class VectorStoresPage extends CursorPage {
}
/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
export class VectorStoreSearchResponsesPage extends Page {
}
VectorStores.VectorStoresPage = VectorStoresPage;
VectorStores.VectorStoreSearchResponsesPage = VectorStoreSearchResponsesPage;
VectorStores.Files = Files;
VectorStores.VectorStoreFilesPage = VectorStoreFilesPage;
VectorStores.FileContentResponsesPage = FileContentResponsesPage;
VectorStores.FileBatches = FileBatches;
//# sourceMappingURL=vector-stores.mjs.map