import { APIResource } from "../resource.js";
import * as Core from "../core.js";
export declare class Extensions extends APIResource {
    /**
     * Upload an Extension
     */
    create(body: ExtensionCreateParams, options?: Core.RequestOptions): Core.APIPromise<Extension>;
    /**
     * Extension
     */
    retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<Extension>;
    /**
     * Delete Extension
     */
    delete(id: string, options?: Core.RequestOptions): Core.APIPromise<void>;
}
export interface Extension {
    id: string;
    createdAt: string;
    fileName: string;
    /**
     * The Project ID linked to the uploaded Extension.
     */
    projectId: string;
    updatedAt: string;
}
export interface ExtensionCreateParams {
    file: Core.Uploadable;
}
export declare namespace Extensions {
    export { type Extension as Extension, type ExtensionCreateParams as ExtensionCreateParams };
}
//# sourceMappingURL=extensions.d.ts.map