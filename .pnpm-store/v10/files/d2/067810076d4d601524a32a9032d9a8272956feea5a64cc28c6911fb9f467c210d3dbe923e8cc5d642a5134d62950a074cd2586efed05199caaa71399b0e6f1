// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../resource.mjs";
export class Batches extends APIResource {
    /**
     * Creates and executes a batch from an uploaded file of requests
     */
    create(body, options) {
        return this._client.post('/openai/v1/batches', { body, ...options });
    }
    /**
     * Retrieves a batch.
     */
    retrieve(batchId, options) {
        return this._client.get(`/openai/v1/batches/${batchId}`, options);
    }
    /**
     * List your organization's batches.
     */
    list(options) {
        return this._client.get('/openai/v1/batches', options);
    }
    /**
     * Cancels a batch.
     */
    cancel(batchId, options) {
        return this._client.post(`/openai/v1/batches/${batchId}/cancel`, options);
    }
}
//# sourceMappingURL=batches.mjs.map