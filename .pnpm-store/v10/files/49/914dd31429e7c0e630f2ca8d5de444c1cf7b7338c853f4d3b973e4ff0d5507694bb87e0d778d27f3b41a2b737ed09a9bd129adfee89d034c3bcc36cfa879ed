// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../../core/resource.mjs";
import * as VersionsAPI from "./versions.mjs";
import { Versions, } from "./versions.mjs";
import { PageCursor } from "../../../core/pagination.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { multipartFormRequestOptions } from "../../../internal/uploads.mjs";
import { path } from "../../../internal/utils/path.mjs";
export class Skills extends APIResource {
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
        return this._client.post('/v1/skills?beta=true', multipartFormRequestOptions({
            body,
            ...options,
            headers: buildHeaders([
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
        return this._client.get(path `/v1/skills/${skillID}?beta=true`, {
            ...options,
            headers: buildHeaders([
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
        return this._client.getAPIList('/v1/skills?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
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
        return this._client.delete(path `/v1/skills/${skillID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        });
    }
}
Skills.Versions = Versions;
//# sourceMappingURL=skills.mjs.map