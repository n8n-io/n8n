"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Batches = void 0;
const resource_1 = require("../resource.js");
class Batches extends resource_1.APIResource {
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
exports.Batches = Batches;
//# sourceMappingURL=batches.js.map