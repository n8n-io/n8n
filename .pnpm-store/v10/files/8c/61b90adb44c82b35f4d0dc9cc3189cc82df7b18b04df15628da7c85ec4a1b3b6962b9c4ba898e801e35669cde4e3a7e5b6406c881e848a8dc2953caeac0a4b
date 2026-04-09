"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contexts = void 0;
const resource_1 = require("../resource.js");
const core_1 = require("../core.js");
class Contexts extends resource_1.APIResource {
    create(body = {}, options) {
        if ((0, core_1.isRequestOptions)(body)) {
            return this.create({}, body);
        }
        return this._client.post('/v1/contexts', { body, ...options });
    }
    /**
     * Get a Context
     */
    retrieve(id, options) {
        return this._client.get(`/v1/contexts/${id}`, options);
    }
    /**
     * Update a Context
     */
    update(id, options) {
        return this._client.put(`/v1/contexts/${id}`, options);
    }
    /**
     * Delete a Context
     */
    delete(id, options) {
        return this._client.delete(`/v1/contexts/${id}`, {
            ...options,
            headers: { Accept: '*/*', ...options?.headers },
        });
    }
}
exports.Contexts = Contexts;
//# sourceMappingURL=contexts.js.map