"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionCreateResponsesPage = exports.Permissions = void 0;
const resource_1 = require("../../../resource.js");
const core_1 = require("../../../core.js");
const pagination_1 = require("../../../pagination.js");
class Permissions extends resource_1.APIResource {
    /**
     * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
     *
     * This enables organization owners to share fine-tuned models with other projects
     * in their organization.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
     *   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
     *   { project_ids: ['string'] },
     * )) {
     *   // ...
     * }
     * ```
     */
    create(fineTunedModelCheckpoint, body, options) {
        return this._client.getAPIList(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, PermissionCreateResponsesPage, { body, method: 'post', ...options });
    }
    retrieve(fineTunedModelCheckpoint, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.retrieve(fineTunedModelCheckpoint, {}, query);
        }
        return this._client.get(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
            query,
            ...options,
        });
    }
    /**
     * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
     *
     * Organization owners can use this endpoint to delete a permission for a
     * fine-tuned model checkpoint.
     *
     * @example
     * ```ts
     * const permission =
     *   await client.fineTuning.checkpoints.permissions.del(
     *     'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
     *     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
     *   );
     * ```
     */
    del(fineTunedModelCheckpoint, permissionId, options) {
        return this._client.delete(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions/${permissionId}`, options);
    }
}
exports.Permissions = Permissions;
/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
class PermissionCreateResponsesPage extends pagination_1.Page {
}
exports.PermissionCreateResponsesPage = PermissionCreateResponsesPage;
Permissions.PermissionCreateResponsesPage = PermissionCreateResponsesPage;
//# sourceMappingURL=permissions.js.map