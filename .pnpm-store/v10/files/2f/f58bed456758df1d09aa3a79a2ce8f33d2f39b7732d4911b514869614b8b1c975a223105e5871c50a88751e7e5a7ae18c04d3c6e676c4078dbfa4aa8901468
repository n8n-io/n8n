// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../resource.mjs";
import * as Core from "../core.mjs";
export class Files extends APIResource {
    /**
     * Upload a file that can be used across various endpoints.
     *
     * The Batch API only supports `.jsonl` files up to 100 MB in size. The input also
     * has a specific required [format](/docs/batch).
     *
     * Please contact us if you need to increase these storage limits.
     */
    create(body, options) {
        return this._client.post('/openai/v1/files', Core.multipartFormRequestOptions({ body, ...options }));
    }
    /**
     * Returns a list of files.
     */
    list(options) {
        return this._client.get('/openai/v1/files', options);
    }
    /**
     * Delete a file.
     */
    delete(fileId, options) {
        return this._client.delete(`/openai/v1/files/${fileId}`, options);
    }
    /**
     * Returns the contents of the specified file.
     */
    content(fileId, options) {
        return this._client.get(`/openai/v1/files/${fileId}/content`, options);
    }
    /**
     * Returns information about a file.
     */
    info(fileId, options) {
        return this._client.get(`/openai/v1/files/${fileId}`, options);
    }
}
//# sourceMappingURL=files.mjs.map