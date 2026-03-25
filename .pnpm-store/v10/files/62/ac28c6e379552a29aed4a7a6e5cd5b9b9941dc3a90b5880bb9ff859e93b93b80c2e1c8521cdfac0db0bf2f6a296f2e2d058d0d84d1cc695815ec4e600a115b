"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Downloads = void 0;
const resource_1 = require("../../resource.js");
class Downloads extends resource_1.APIResource {
    /**
     * Session Downloads
     */
    list(id, options) {
        return this._client.get(`/v1/sessions/${id}/downloads`, {
            ...options,
            headers: { Accept: 'application/zip', ...options?.headers },
            __binaryResponse: true,
        });
    }
}
exports.Downloads = Downloads;
//# sourceMappingURL=downloads.js.map