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
exports.ContainerListResponsesPage = exports.Containers = void 0;
const resource_1 = require("../../resource.js");
const core_1 = require("../../core.js");
const FilesAPI = __importStar(require("./files/files.js"));
const files_1 = require("./files/files.js");
const pagination_1 = require("../../pagination.js");
class Containers extends resource_1.APIResource {
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
        if ((0, core_1.isRequestOptions)(query)) {
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
exports.Containers = Containers;
class ContainerListResponsesPage extends pagination_1.CursorPage {
}
exports.ContainerListResponsesPage = ContainerListResponsesPage;
Containers.ContainerListResponsesPage = ContainerListResponsesPage;
Containers.Files = files_1.Files;
Containers.FileListResponsesPage = files_1.FileListResponsesPage;
//# sourceMappingURL=containers.js.map