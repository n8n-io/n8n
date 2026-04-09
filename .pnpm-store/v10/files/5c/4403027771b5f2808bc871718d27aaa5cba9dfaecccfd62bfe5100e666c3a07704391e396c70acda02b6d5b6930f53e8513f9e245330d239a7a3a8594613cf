"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileListResponsesPage = exports.Files = void 0;
const resource_1 = require("../../../resource.js");
const core_1 = require("../../../core.js");
const Core = __importStar(require("../../../core.js"));
const ContentAPI = __importStar(require("./content.js"));
const content_1 = require("./content.js");
const pagination_1 = require("../../../pagination.js");
class Files extends resource_1.APIResource {
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
        if ((0, core_1.isRequestOptions)(query)) {
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
exports.Files = Files;
class FileListResponsesPage extends pagination_1.CursorPage {
}
exports.FileListResponsesPage = FileListResponsesPage;
Files.FileListResponsesPage = FileListResponsesPage;
Files.Content = content_1.Content;
//# sourceMappingURL=files.js.map