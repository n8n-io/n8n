"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Content = void 0;
const resource_1 = require("../../../resource.js");
class Content extends resource_1.APIResource {
    /**
     * Retrieve Container File Content
     */
    retrieve(containerId, fileId, options) {
        return this._client.get(`/containers/${containerId}/files/${fileId}/content`, {
            ...options,
            headers: { Accept: 'application/binary', ...options?.headers },
            __binaryResponse: true,
        });
    }
}
exports.Content = Content;
//# sourceMappingURL=content.js.map