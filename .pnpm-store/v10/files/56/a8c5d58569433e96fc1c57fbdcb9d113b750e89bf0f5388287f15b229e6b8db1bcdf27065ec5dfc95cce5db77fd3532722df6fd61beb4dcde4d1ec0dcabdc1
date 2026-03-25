// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../resource.mjs";
import * as Core from "../core.mjs";
export class Extensions extends APIResource {
    /**
     * Upload an Extension
     */
    create(body, options) {
        return this._client.post('/v1/extensions', Core.multipartFormRequestOptions({ body, ...options }));
    }
    /**
     * Extension
     */
    retrieve(id, options) {
        return this._client.get(`/v1/extensions/${id}`, options);
    }
    /**
     * Delete Extension
     */
    delete(id, options) {
        return this._client.delete(`/v1/extensions/${id}`, {
            ...options,
            headers: { Accept: '*/*', ...options?.headers },
        });
    }
}
//# sourceMappingURL=extensions.mjs.map