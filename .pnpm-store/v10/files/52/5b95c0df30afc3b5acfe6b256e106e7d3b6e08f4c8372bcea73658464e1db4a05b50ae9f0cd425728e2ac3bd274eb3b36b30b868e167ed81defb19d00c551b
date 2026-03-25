"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Versions = void 0;
const resource_1 = require("../../../core/resource.js");
const pagination_1 = require("../../../core/pagination.js");
const headers_1 = require("../../../internal/headers.js");
const uploads_1 = require("../../../internal/uploads.js");
const path_1 = require("../../../internal/utils/path.js");
class Versions extends resource_1.APIResource {
    /**
     * Create Skill Version
     *
     * @example
     * ```ts
     * const version = await client.beta.skills.versions.create(
     *   'skill_id',
     * );
     * ```
     */
    create(skillID, params = {}, options) {
        const { betas, ...body } = params ?? {};
        return this._client.post((0, path_1.path) `/v1/skills/${skillID}/versions?beta=true`, (0, uploads_1.multipartFormRequestOptions)({
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        }, this._client));
    }
    /**
     * Get Skill Version
     *
     * @example
     * ```ts
     * const version = await client.beta.skills.versions.retrieve(
     *   'version',
     *   { skill_id: 'skill_id' },
     * );
     * ```
     */
    retrieve(version, params, options) {
        const { skill_id, betas } = params;
        return this._client.get((0, path_1.path) `/v1/skills/${skill_id}/versions/${version}?beta=true`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * List Skill Versions
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const versionListResponse of client.beta.skills.versions.list(
     *   'skill_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(skillID, params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList((0, path_1.path) `/v1/skills/${skillID}/versions?beta=true`, (pagination_1.PageCursor), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Skill Version
     *
     * @example
     * ```ts
     * const version = await client.beta.skills.versions.delete(
     *   'version',
     *   { skill_id: 'skill_id' },
     * );
     * ```
     */
    delete(version, params, options) {
        const { skill_id, betas } = params;
        return this._client.delete((0, path_1.path) `/v1/skills/${skill_id}/versions/${version}?beta=true`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        });
    }
}
exports.Versions = Versions;
//# sourceMappingURL=versions.js.map