"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skills = void 0;
const tslib_1 = require("../../../internal/tslib.js");
const resource_1 = require("../../../core/resource.js");
const VersionsAPI = tslib_1.__importStar(require("./versions.js"));
const versions_1 = require("./versions.js");
const pagination_1 = require("../../../core/pagination.js");
const headers_1 = require("../../../internal/headers.js");
const uploads_1 = require("../../../internal/uploads.js");
const path_1 = require("../../../internal/utils/path.js");
class Skills extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.versions = new VersionsAPI.Versions(this._client);
    }
    /**
     * Create Skill
     *
     * @example
     * ```ts
     * const skill = await client.beta.skills.create();
     * ```
     */
    create(params = {}, options) {
        const { betas, ...body } = params ?? {};
        return this._client.post('/v1/skills?beta=true', (0, uploads_1.multipartFormRequestOptions)({
            body,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        }, this._client));
    }
    /**
     * Get Skill
     *
     * @example
     * ```ts
     * const skill = await client.beta.skills.retrieve('skill_id');
     * ```
     */
    retrieve(skillID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.get((0, path_1.path) `/v1/skills/${skillID}?beta=true`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * List Skills
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const skillListResponse of client.beta.skills.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList('/v1/skills?beta=true', (pagination_1.PageCursor), {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Skill
     *
     * @example
     * ```ts
     * const skill = await client.beta.skills.delete('skill_id');
     * ```
     */
    delete(skillID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.delete((0, path_1.path) `/v1/skills/${skillID}?beta=true`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        });
    }
}
exports.Skills = Skills;
Skills.Versions = versions_1.Versions;
//# sourceMappingURL=skills.js.map