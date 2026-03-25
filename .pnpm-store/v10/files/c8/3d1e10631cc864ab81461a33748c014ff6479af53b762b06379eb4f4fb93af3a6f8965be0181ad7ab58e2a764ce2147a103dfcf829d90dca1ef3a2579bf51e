import { APIResource } from "../core/resource.mjs";
import * as BetaAPI from "./beta/beta.mjs";
import { APIPromise } from "../core/api-promise.mjs";
import { Page, type PageParams, PagePromise } from "../core/pagination.mjs";
import { RequestOptions } from "../internal/request-options.mjs";
export declare class Models extends APIResource {
    /**
     * Get a specific model.
     *
     * The Models API response can be used to determine information about a specific
     * model or resolve a model alias to a model ID.
     */
    retrieve(modelID: string, params?: ModelRetrieveParams | null | undefined, options?: RequestOptions): APIPromise<ModelInfo>;
    /**
     * List available models.
     *
     * The Models API response can be used to determine which models are available for
     * use in the API. More recently released models are listed first.
     */
    list(params?: ModelListParams | null | undefined, options?: RequestOptions): PagePromise<ModelInfosPage, ModelInfo>;
}
export type ModelInfosPage = Page<ModelInfo>;
export interface ModelInfo {
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
    export { type ModelInfo as ModelInfo, type ModelInfosPage as ModelInfosPage, type ModelRetrieveParams as ModelRetrieveParams, type ModelListParams as ModelListParams, };
}
//# sourceMappingURL=models.d.mts.map