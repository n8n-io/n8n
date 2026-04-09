import { APIResource } from "../resource.js";
import * as Core from "../core.js";
import { Page } from "../pagination.js";
export declare class Models extends APIResource {
    /**
     * Retrieves a model instance, providing basic information about the model such as
     * the owner and permissioning.
     */
    retrieve(model: string, options?: Core.RequestOptions): Core.APIPromise<Model>;
    /**
     * Lists the currently available models, and provides basic information about each
     * one such as the owner and availability.
     */
    list(options?: Core.RequestOptions): Core.PagePromise<ModelsPage, Model>;
    /**
     * Delete a fine-tuned model. You must have the Owner role in your organization to
     * delete a model.
     */
    del(model: string, options?: Core.RequestOptions): Core.APIPromise<ModelDeleted>;
}
/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
export declare class ModelsPage extends Page<Model> {
}
/**
 * Describes an OpenAI model offering that can be used with the API.
 */
export interface Model {
    /**
     * The model identifier, which can be referenced in the API endpoints.
     */
    id: string;
    /**
     * The Unix timestamp (in seconds) when the model was created.
     */
    created: number;
    /**
     * The object type, which is always "model".
     */
    object: 'model';
    /**
     * The organization that owns the model.
     */
    owned_by: string;
}
export interface ModelDeleted {
    id: string;
    deleted: boolean;
    object: string;
}
export declare namespace Models {
    export { type Model as Model, type ModelDeleted as ModelDeleted, ModelsPage as ModelsPage };
}
//# sourceMappingURL=models.d.ts.map