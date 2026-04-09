// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../resource.mjs";
import { isRequestOptions } from "../../core.mjs";
import * as FilesAPI from "./files/files.mjs";
import { FileListResponsesPage, Files, } from "./files/files.mjs";
import { CursorPage } from "../../pagination.mjs";
export class Containers extends APIResource {
    constructor() {
        super(...arguments);
        this.files = new FilesAPI.Files(this._client);
    }
    /**
     * Create Container
     */
    create(body, options) {
        return this._client.post('/containers', { body, ...options });
    }
    /**
     * Retrieve Container
     */
    retrieve(containerId, options) {
        return this._client.get(`/containers/${containerId}`, options);
    }
    list(query = {}, options) {
        if (isRequestOptions(query)) {
            return this.list({}, query);
        }
        return this._client.getAPIList('/containers', ContainerListResponsesPage, { query, ...options });
    }
    /**
     * Delete Container
     */
    del(containerId, options) {
        return this._client.delete(`/containers/${containerId}`, {
            ...options,
            headers: { Accept: '*/*', ...options?.headers },
        });
    }
}
export class ContainerListResponsesPage extends CursorPage {
}
Containers.ContainerListResponsesPage = ContainerListResponsesPage;
Containers.Files = Files;
Containers.FileListResponsesPage = FileListResponsesPage;
//# sourceMappingURL=containers.mjs.map