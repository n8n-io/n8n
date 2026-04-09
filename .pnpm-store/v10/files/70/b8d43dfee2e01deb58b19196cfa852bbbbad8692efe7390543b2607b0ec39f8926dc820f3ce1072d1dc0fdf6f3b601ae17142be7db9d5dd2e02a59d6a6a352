// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../resource.mjs";
import { isRequestOptions } from "../core.mjs";
export class Contexts extends APIResource {
    create(body = {}, options) {
        if (isRequestOptions(body)) {
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
//# sourceMappingURL=contexts.mjs.map