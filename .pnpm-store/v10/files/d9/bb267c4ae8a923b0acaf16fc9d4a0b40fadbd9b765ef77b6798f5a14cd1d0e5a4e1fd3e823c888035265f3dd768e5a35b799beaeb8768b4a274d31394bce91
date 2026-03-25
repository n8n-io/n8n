import { APIResource } from "../resource.js";
import * as Core from "../core.js";
export declare class Contexts extends APIResource {
    /**
     * Create a Context
     */
    create(body: ContextCreateParams, options?: Core.RequestOptions): Core.APIPromise<ContextCreateResponse>;
    /**
     * Context
     */
    retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<Context>;
    /**
     * Update Context
     */
    update(id: string, options?: Core.RequestOptions): Core.APIPromise<ContextUpdateResponse>;
}
export interface Context {
    id: string;
    createdAt: string;
    /**
     * The Project ID linked to the uploaded Context.
     */
    projectId: string;
    updatedAt: string;
}
export interface ContextCreateResponse {
    id: string;
    /**
     * The cipher algorithm used to encrypt the user-data-directory. AES-256-CBC is
     * currently the only supported algorithm.
     */
    cipherAlgorithm: string;
    /**
     * The initialization vector size used to encrypt the user-data-directory.
     * [Read more about how to use it](/features/contexts).
     */
    initializationVectorSize: number;
    /**
     * The public key to encrypt the user-data-directory.
     */
    publicKey: string;
    /**
     * An upload URL to upload a custom user-data-directory.
     */
    uploadUrl: string;
}
export interface ContextUpdateResponse {
    id: string;
    /**
     * The cipher algorithm used to encrypt the user-data-directory. AES-256-CBC is
     * currently the only supported algorithm.
     */
    cipherAlgorithm: string;
    /**
     * The initialization vector size used to encrypt the user-data-directory.
     * [Read more about how to use it](/features/contexts).
     */
    initializationVectorSize: number;
    /**
     * The public key to encrypt the user-data-directory.
     */
    publicKey: string;
    /**
     * An upload URL to upload a custom user-data-directory.
     */
    uploadUrl: string;
}
export interface ContextCreateParams {
    /**
     * The Project ID. Can be found in
     * [Settings](https://www.browserbase.com/settings).
     */
    projectId: string;
}
export declare namespace Contexts {
    export { type Context as Context, type ContextCreateResponse as ContextCreateResponse, type ContextUpdateResponse as ContextUpdateResponse, type ContextCreateParams as ContextCreateParams, };
}
//# sourceMappingURL=contexts.d.ts.map