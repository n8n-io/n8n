"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Models = void 0;
const resource_1 = require("../resource.js");
class Models extends resource_1.APIResource {
    /**
     * Get a specific model
     */
    retrieve(model, options) {
        return this._client.get(`/openai/v1/models/${model}`, options);
    }
    /**
     * get all available models
     */
    list(options) {
        return this._client.get('/openai/v1/models', options);
    }
    /**
     * Delete a model
     */
    delete(model, options) {
        return this._client.delete(`/openai/v1/models/${model}`, options);
    }
}
exports.Models = Models;
//# sourceMappingURL=models.js.map