// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../../core/resource.mjs";
import { PageCursor } from "../../../core/pagination.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { multipartFormRequestOptions } from "../../../internal/uploads.mjs";
import { path } from "../../../internal/utils/path.mjs";
export class Versions extends APIResource {
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
        return this._client.post(path `/v1/skills/${skillID}/versions?beta=true`, multipartFormRequestOptions({
            body,
            ...options,
            headers: buildHeaders([
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
        return this._client.get(path `/v1/skills/${skill_id}/versions/${version}?beta=true`, {
            ...options,
            headers: buildHeaders([
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
        return this._client.getAPIList(path `/v1/skills/${skillID}/versions?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
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
        return this._client.delete(path `/v1/skills/${skill_id}/versions/${version}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'skills-2025-10-02'].toString() },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=versions.mjs.map