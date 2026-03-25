import { APIResource } from "../../../core/resource.mjs";
import * as BetaAPI from "../beta.mjs";
import { APIPromise } from "../../../core/api-promise.mjs";
import { PageCursor, type PageCursorParams, PagePromise } from "../../../core/pagination.mjs";
import { type Uploadable } from "../../../core/uploads.mjs";
import { RequestOptions } from "../../../internal/request-options.mjs";
export declare class Versions extends APIResource {
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
    create(skillID: string, params?: VersionCreateParams | null | undefined, options?: RequestOptions): APIPromise<VersionCreateResponse>;
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
    retrieve(version: string, params: VersionRetrieveParams, options?: RequestOptions): APIPromise<VersionRetrieveResponse>;
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
    list(skillID: string, params?: VersionListParams | null | undefined, options?: RequestOptions): PagePromise<VersionListResponsesPageCursor, VersionListResponse>;
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
    delete(version: string, params: VersionDeleteParams, options?: RequestOptions): APIPromise<VersionDeleteResponse>;
}
export type VersionListResponsesPageCursor = PageCursor<VersionListResponse>;
export interface VersionCreateResponse {
    /**
     * Unique identifier for the skill version.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * ISO 8601 timestamp of when the skill version was created.
     */
    created_at: string;
    /**
     * Description of the skill version.
     *
     * This is extracted from the SKILL.md file in the skill upload.
     */
    description: string;
    /**
     * Directory name of the skill version.
     *
     * This is the top-level directory name that was extracted from the uploaded files.
     */
    directory: string;
    /**
     * Human-readable name of the skill version.
     *
     * This is extracted from the SKILL.md file in the skill upload.
     */
    name: string;
    /**
     * Identifier for the skill that this version belongs to.
     */
    skill_id: string;
    /**
     * Object type.
     *
     * For Skill Versions, this is always `"skill_version"`.
     */
    type: string;
    /**
     * Version identifier for the skill.
     *
     * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
     */
    version: string;
}
export interface VersionRetrieveResponse {
    /**
     * Unique identifier for the skill version.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * ISO 8601 timestamp of when the skill version was created.
     */
    created_at: string;
    /**
     * Description of the skill version.
     *
     * This is extracted from the SKILL.md file in the skill upload.
     */
    description: string;
    /**
     * Directory name of the skill version.
     *
     * This is the top-level directory name that was extracted from the uploaded files.
     */
    directory: string;
    /**
     * Human-readable name of the skill version.
     *
     * This is extracted from the SKILL.md file in the skill upload.
     */
    name: string;
    /**
     * Identifier for the skill that this version belongs to.
     */
    skill_id: string;
    /**
     * Object type.
     *
     * For Skill Versions, this is always `"skill_version"`.
     */
    type: string;
    /**
     * Version identifier for the skill.
     *
     * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
     */
    version: string;
}
export interface VersionListResponse {
    /**
     * Unique identifier for the skill version.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * ISO 8601 timestamp of when the skill version was created.
     */
    created_at: string;
    /**
     * Description of the skill version.
     *
     * This is extracted from the SKILL.md file in the skill upload.
     */
    description: string;
    /**
     * Directory name of the skill version.
     *
     * This is the top-level directory name that was extracted from the uploaded files.
     */
    directory: string;
    /**
     * Human-readable name of the skill version.
     *
     * This is extracted from the SKILL.md file in the skill upload.
     */
    name: string;
    /**
     * Identifier for the skill that this version belongs to.
     */
    skill_id: string;
    /**
     * Object type.
     *
     * For Skill Versions, this is always `"skill_version"`.
     */
    type: string;
    /**
     * Version identifier for the skill.
     *
     * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
     */
    version: string;
}
export interface VersionDeleteResponse {
    /**
     * Version identifier for the skill.
     *
     * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
     */
    id: string;
    /**
     * Deleted object type.
     *
     * For Skill Versions, this is always `"skill_version_deleted"`.
     */
    type: string;
}
export interface VersionCreateParams {
    /**
     * Body param: Files to upload for the skill.
     *
     * All files must be in the same top-level directory and must include a SKILL.md
     * file at the root of that directory.
     */
    files?: Array<Uploadable> | null;
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface VersionRetrieveParams {
    /**
     * Path param: Unique identifier for the skill.
     *
     * The format and length of IDs may change over time.
     */
    skill_id: string;
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface VersionListParams extends PageCursorParams {
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface VersionDeleteParams {
    /**
     * Path param: Unique identifier for the skill.
     *
     * The format and length of IDs may change over time.
     */
    skill_id: string;
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export declare namespace Versions {
    export { type VersionCreateResponse as VersionCreateResponse, type VersionRetrieveResponse as VersionRetrieveResponse, type VersionListResponse as VersionListResponse, type VersionDeleteResponse as VersionDeleteResponse, type VersionListResponsesPageCursor as VersionListResponsesPageCursor, type VersionCreateParams as VersionCreateParams, type VersionRetrieveParams as VersionRetrieveParams, type VersionListParams as VersionListParams, type VersionDeleteParams as VersionDeleteParams, };
}
//# sourceMappingURL=versions.d.mts.map