import { APIResource } from "../../core/resource.js";
import * as BetaAPI from "./beta.js";
import { APIPromise } from "../../core/api-promise.js";
import { Page, type PageParams, PagePromise } from "../../core/pagination.js";
import { RequestOptions } from "../../internal/request-options.js";
export declare class Models extends APIResource {
    /**
     * Get a specific model.
     *
     * The Models API response can be used to determine information about a specific
     * model or resolve a model alias to a model ID.
     *
     * @example
     * ```ts
     * const betaModelInfo = await client.beta.models.retrieve(
     *   'model_id',
     * );
     * ```
     */
    retrieve(modelID: string, params?: ModelRetrieveParams | null | undefined, options?: RequestOptions): APIPromise<BetaModelInfo>;
    /**
     * List available models.
     *
     * The Models API response can be used to determine which models are available for
     * use in the API. More recently released models are listed first.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaModelInfo of client.beta.models.list()) {
     *   // ...
     * }
     * ```
     */
    list(params?: ModelListParams | null | undefined, options?: RequestOptions): PagePromise<BetaModelInfosPage, BetaModelInfo>;
}
export type BetaModelInfosPage = Page<BetaModelInfo>;
export interface BetaModelInfo {
    /**
     * Unique model identifier.
     */
    id: string;
    /**
     * RFC 3339 datetime string representing the time at which the model was released.
     * May be set to an epoch value if the release date is unknown.
     */
    created_at: string;
    /**
     * A human-readable name for the model.
     */
    display_name: string;
    /**
     * Object type.
     *
     * For Models, this is always `"model"`.
     */
    type: 'model';
}
export interface ModelRetrieveParams {
    /**
     * Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface ModelListParams extends PageParams {
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export declare namespace Models {
    export { type BetaModelInfo as BetaModelInfo, type BetaModelInfosPage as BetaModelInfosPage, type ModelRetrieveParams as ModelRetrieveParams, type ModelListParams as ModelListParams, };
}
//# sourceMappingURL=models.d.ts.map