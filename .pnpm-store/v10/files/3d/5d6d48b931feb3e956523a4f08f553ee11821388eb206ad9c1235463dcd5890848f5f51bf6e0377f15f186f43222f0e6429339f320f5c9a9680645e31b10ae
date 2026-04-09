// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../../resource.mjs";
import { isRequestOptions } from "../../../core.mjs";
import * as Core from "../../../core.mjs";
import * as ContentAPI from "./content.mjs";
import { Content } from "./content.mjs";
import { CursorPage } from "../../../pagination.mjs";
export class Files extends APIResource {
    constructor() {
        super(...arguments);
        this.content = new ContentAPI.Content(this._client);
    }
    /**
     * Create a Container File
     *
     * You can send either a multipart/form-data request with the raw file content, or
     * a JSON request with a file ID.
     */
    create(containerId, body, options) {
        return this._client.post(`/containers/${containerId}/files`, Core.multipartFormRequestOptions({ body, ...options }));
    }
    /**
     * Retrieve Container File
     */
    retrieve(containerId, fileId, options) {
        return this._client.get(`/containers/${containerId}/files/${fileId}`, options);
    }
    list(containerId, query = {}, options) {
        if (isRequestOptions(query)) {
            return this.list(containerId, {}, query);
        }
        return this._client.getAPIList(`/containers/${containerId}/files`, FileListResponsesPage, {
            query,
            ...options,
        });
    }
    /**
     * Delete Container File
     */
    del(containerId, fileId, options) {
        return this._client.delete(`/containers/${containerId}/files/${fileId}`, {
            ...options,
            headers: { Accept: '*/*', ...options?.headers },
        });
    }
}
export class FileListResponsesPage extends CursorPage {
}
Files.FileListResponsesPage = FileListResponsesPage;
Files.Content = Content;
//# sourceMappingURL=files.mjs.map