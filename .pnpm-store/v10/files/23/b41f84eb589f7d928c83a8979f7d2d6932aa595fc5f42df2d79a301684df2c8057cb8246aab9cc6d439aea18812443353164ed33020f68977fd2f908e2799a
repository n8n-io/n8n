import { APIResource } from "../../../core/resource.mjs";
import * as BetaAPI from "../beta.mjs";
import * as VersionsAPI from "./versions.mjs";
import { VersionCreateParams, VersionCreateResponse, VersionDeleteParams, VersionDeleteResponse, VersionListParams, VersionListResponse, VersionListResponsesPageCursor, VersionRetrieveParams, VersionRetrieveResponse, Versions } from "./versions.mjs";
import { APIPromise } from "../../../core/api-promise.mjs";
import { PageCursor, type PageCursorParams, PagePromise } from "../../../core/pagination.mjs";
import { type Uploadable } from "../../../core/uploads.mjs";
import { RequestOptions } from "../../../internal/request-options.mjs";
export declare class Skills extends APIResource {
    versions: VersionsAPI.Versions;
    /**
     * Create Skill
     *
     * @example
     * ```ts
     * const skill = await client.beta.skills.create();
     * ```
     */
    create(params?: SkillCreateParams | null | undefined, options?: RequestOptions): APIPromise<SkillCreateResponse>;
    /**
     * Get Skill
     *
     * @example
     * ```ts
     * const skill = await client.beta.skills.retrieve('skill_id');
     * ```
     */
    retrieve(skillID: string, params?: SkillRetrieveParams | null | undefined, options?: RequestOptions): APIPromise<SkillRetrieveResponse>;
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
    list(params?: SkillListParams | null | undefined, options?: RequestOptions): PagePromise<SkillListResponsesPageCursor, SkillListResponse>;
    /**
     * Delete Skill
     *
     * @example
     * ```ts
     * const skill = await client.beta.skills.delete('skill_id');
     * ```
     */
    delete(skillID: string, params?: SkillDeleteParams | null | undefined, options?: RequestOptions): APIPromise<SkillDeleteResponse>;
}
export type SkillListResponsesPageCursor = PageCursor<SkillListResponse>;
export interface SkillCreateResponse {
    /**
     * Unique identifier for the skill.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * ISO 8601 timestamp of when the skill was created.
     */
    created_at: string;
    /**
     * Display title for the skill.
     *
     * This is a human-readable label that is not included in the prompt sent to the
     * model.
     */
    display_title: string | null;
    /**
     * The latest version identifier for the skill.
     *
     * This represents the most recent version of the skill that has been created.
     */
    latest_version: string | null;
    /**
     * Source of the skill.
     *
     * This may be one of the following values:
     *
     * - `"custom"`: the skill was created by a user
     * - `"anthropic"`: the skill was created by Anthropic
     */
    source: string;
    /**
     * Object type.
     *
     * For Skills, this is always `"skill"`.
     */
    type: string;
    /**
     * ISO 8601 timestamp of when the skill was last updated.
     */
    updated_at: string;
}
export interface SkillRetrieveResponse {
    /**
     * Unique identifier for the skill.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * ISO 8601 timestamp of when the skill was created.
     */
    created_at: string;
    /**
     * Display title for the skill.
     *
     * This is a human-readable label that is not included in the prompt sent to the
     * model.
     */
    display_title: string | null;
    /**
     * The latest version identifier for the skill.
     *
     * This represents the most recent version of the skill that has been created.
     */
    latest_version: string | null;
    /**
     * Source of the skill.
     *
     * This may be one of the following values:
     *
     * - `"custom"`: the skill was created by a user
     * - `"anthropic"`: the skill was created by Anthropic
     */
    source: string;
    /**
     * Object type.
     *
     * For Skills, this is always `"skill"`.
     */
    type: string;
    /**
     * ISO 8601 timestamp of when the skill was last updated.
     */
    updated_at: string;
}
export interface SkillListResponse {
    /**
     * Unique identifier for the skill.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * ISO 8601 timestamp of when the skill was created.
     */
    created_at: string;
    /**
     * Display title for the skill.
     *
     * This is a human-readable label that is not included in the prompt sent to the
     * model.
     */
    display_title: string | null;
    /**
     * The latest version identifier for the skill.
     *
     * This represents the most recent version of the skill that has been created.
     */
    latest_version: string | null;
    /**
     * Source of the skill.
     *
     * This may be one of the following values:
     *
     * - `"custom"`: the skill was created by a user
     * - `"anthropic"`: the skill was created by Anthropic
     */
    source: string;
    /**
     * Object type.
     *
     * For Skills, this is always `"skill"`.
     */
    type: string;
    /**
     * ISO 8601 timestamp of when the skill was last updated.
     */
    updated_at: string;
}
export interface SkillDeleteResponse {
    /**
     * Unique identifier for the skill.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * Deleted object type.
     *
     * For Skills, this is always `"skill_deleted"`.
     */
    type: string;
}
export interface SkillCreateParams {
    /**
     * Body param: Display title for the skill.
     *
     * This is a human-readable label that is not included in the prompt sent to the
     * model.
     */
    display_title?: string | null;
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
export interface SkillRetrieveParams {
    /**
     * Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface SkillListParams extends PageCursorParams {
    /**
     * Query param: Filter skills by source.
     *
     * If provided, only skills from the specified source will be returned:
     *
     * - `"custom"`: only return user-created skills
     * - `"anthropic"`: only return Anthropic-created skills
     */
    source?: string | null;
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface SkillDeleteParams {
    /**
     * Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export declare namespace Skills {
    export { type SkillCreateResponse as SkillCreateResponse, type SkillRetrieveResponse as SkillRetrieveResponse, type SkillListResponse as SkillListResponse, type SkillDeleteResponse as SkillDeleteResponse, type SkillListResponsesPageCursor as SkillListResponsesPageCursor, type SkillCreateParams as SkillCreateParams, type SkillRetrieveParams as SkillRetrieveParams, type SkillListParams as SkillListParams, type SkillDeleteParams as SkillDeleteParams, };
    export { Versions as Versions, type VersionCreateResponse as VersionCreateResponse, type VersionRetrieveResponse as VersionRetrieveResponse, type VersionListResponse as VersionListResponse, type VersionDeleteResponse as VersionDeleteResponse, type VersionListResponsesPageCursor as VersionListResponsesPageCursor, type VersionCreateParams as VersionCreateParams, type VersionRetrieveParams as VersionRetrieveParams, type VersionListParams as VersionListParams, type VersionDeleteParams as VersionDeleteParams, };
}
//# sourceMappingURL=skills.d.mts.map