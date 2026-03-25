import { EventEmitter } from 'events';
import * as r from 'teeny-request';
import { ApiError, BodyResponseCallback, DecorateRequestOptions } from './util.js';
export type RequestResponse = [unknown, r.Response];
export interface ServiceObjectParent {
    interceptors: Interceptor[];
    getRequestInterceptors(): Function[];
    requestStream(reqOpts: DecorateRequestOptions): r.Request;
    request(reqOpts: DecorateRequestOptions, callback: BodyResponseCallback): void;
}
export interface Interceptor {
    request(opts: r.Options): DecorateRequestOptions;
}
export type GetMetadataOptions = object;
export type MetadataResponse<K> = [K, r.Response];
export type MetadataCallback<K> = (err: Error | null, metadata?: K, apiResponse?: r.Response) => void;
export type ExistsOptions = object;
export interface ExistsCallback {
    (err: Error | null, exists?: boolean): void;
}
export interface ServiceObjectConfig {
    /**
     * The base URL to make API requests to.
     */
    baseUrl?: string;
    /**
     * The method which creates this object.
     */
    createMethod?: Function;
    /**
     * The identifier of the object. For example, the name of a Storage bucket or
     * Pub/Sub topic.
     */
    id?: string;
    /**
     * A map of each method name that should be inherited.
     */
    methods?: Methods;
    /**
     * The parent service instance. For example, an instance of Storage if the
     * object is Bucket.
     */
    parent: ServiceObjectParent;
    /**
     * Override of projectId, used to allow access to resources in another project.
     * For example, a BigQuery dataset in another project to which the user has been
     * granted permission.
     */
    projectId?: string;
}
export interface Methods {
    [methodName: string]: {
        reqOpts?: r.CoreOptions;
    } | boolean;
}
export interface InstanceResponseCallback<T> {
    (err: ApiError | null, instance?: T | null, apiResponse?: r.Response): void;
}
export interface CreateOptions {
}
export type CreateResponse<T> = any[];
export interface CreateCallback<T> {
    (err: ApiError | null, instance?: T | null, ...args: any[]): void;
}
export type DeleteOptions = {
    ignoreNotFound?: boolean;
    ifGenerationMatch?: number | string;
    ifGenerationNotMatch?: number | string;
    ifMetagenerationMatch?: number | string;
    ifMetagenerationNotMatch?: number | string;
} & object;
export interface DeleteCallback {
    (err: Error | null, apiResponse?: r.Response): void;
}
export interface GetConfig {
    /**
     * Create the object if it doesn't already exist.
     */
    autoCreate?: boolean;
}
export type GetOrCreateOptions = GetConfig & CreateOptions;
export type GetResponse<T> = [T, r.Response];
export interface ResponseCallback {
    (err?: Error | null, apiResponse?: r.Response): void;
}
export type SetMetadataResponse<K> = [K];
export type SetMetadataOptions = object;
export interface BaseMetadata {
    id?: string;
    kind?: string;
    etag?: string;
    selfLink?: string;
    [key: string]: unknown;
}
/**
 * ServiceObject is a base class, meant to be inherited from by a "service
 * object," like a BigQuery dataset or Storage bucket.
 *
 * Most of the time, these objects share common functionality; they can be
 * created or deleted, and you can get or set their metadata.
 *
 * By inheriting from this class, a service object will be extended with these
 * shared behaviors. Note that any method can be overridden when the service
 * object requires specific behavior.
 */
declare class ServiceObject<T, K extends BaseMetadata> extends EventEmitter {
    metadata: K;
    baseUrl?: string;
    parent: ServiceObjectParent;
    id?: string;
    private createMethod?;
    protected methods: Methods;
    interceptors: Interceptor[];
    projectId?: string;
    constructor(config: ServiceObjectConfig);
    /**
     * Create the object.
     *
     * @param {object=} options - Configuration object.
     * @param {function} callback - The callback function.
     * @param {?error} callback.err - An error returned while making this request.
     * @param {object} callback.instance - The instance.
     * @param {object} callback.apiResponse - The full API response.
     */
    create(options?: CreateOptions): Promise<CreateResponse<T>>;
    create(options: CreateOptions, callback: CreateCallback<T>): void;
    create(callback: CreateCallback<T>): void;
    /**
     * Delete the object.
     *
     * @param {function=} callback - The callback function.
     * @param {?error} callback.err - An error returned while making this request.
     * @param {object} callback.apiResponse - The full API response.
     */
    delete(options?: DeleteOptions): Promise<[r.Response]>;
    delete(options: DeleteOptions, callback: DeleteCallback): void;
    delete(callback: DeleteCallback): void;
    /**
     * Check if the object exists.
     *
     * @param {function} callback - The callback function.
     * @param {?error} callback.err - An error returned while making this request.
     * @param {boolean} callback.exists - Whether the object exists or not.
     */
    exists(options?: ExistsOptions): Promise<[boolean]>;
    exists(options: ExistsOptions, callback: ExistsCallback): void;
    exists(callback: ExistsCallback): void;
    /**
     * Get the object if it exists. Optionally have the object created if an
     * options object is provided with `autoCreate: true`.
     *
     * @param {object=} options - The configuration object that will be used to
     *     create the object if necessary.
     * @param {boolean} options.autoCreate - Create the object if it doesn't already exist.
     * @param {function} callback - The callback function.
     * @param {?error} callback.err - An error returned while making this request.
     * @param {object} callback.instance - The instance.
     * @param {object} callback.apiResponse - The full API response.
     */
    get(options?: GetOrCreateOptions): Promise<GetResponse<T>>;
    get(callback: InstanceResponseCallback<T>): void;
    get(options: GetOrCreateOptions, callback: InstanceResponseCallback<T>): void;
    /**
     * Get the metadata of this object.
     *
     * @param {function} callback - The callback function.
     * @param {?error} callback.err - An error returned while making this request.
     * @param {object} callback.metadata - The metadata for this object.
     * @param {object} callback.apiResponse - The full API response.
     */
    getMetadata(options?: GetMetadataOptions): Promise<MetadataResponse<K>>;
    getMetadata(options: GetMetadataOptions, callback: MetadataCallback<K>): void;
    getMetadata(callback: MetadataCallback<K>): void;
    /**
     * Return the user's custom request interceptors.
     */
    getRequestInterceptors(): Function[];
    /**
     * Set the metadata for this object.
     *
     * @param {object} metadata - The metadata to set on this object.
     * @param {object=} options - Configuration options.
     * @param {function=} callback - The callback function.
     * @param {?error} callback.err - An error returned while making this request.
     * @param {object} callback.apiResponse - The full API response.
     */
    setMetadata(metadata: K, options?: SetMetadataOptions): Promise<SetMetadataResponse<K>>;
    setMetadata(metadata: K, callback: MetadataCallback<K>): void;
    setMetadata(metadata: K, options: SetMetadataOptions, callback: MetadataCallback<K>): void;
    /**
     * Make an authenticated API request.
     *
     * @private
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     * @param {function} callback - The callback function passed to `request`.
     */
    private request_;
    /**
     * Make an authenticated API request.
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     * @param {function} callback - The callback function passed to `request`.
     */
    request(reqOpts: DecorateRequestOptions): Promise<RequestResponse>;
    request(reqOpts: DecorateRequestOptions, callback: BodyResponseCallback): void;
    /**
     * Make an authenticated API request.
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     */
    requestStream(reqOpts: DecorateRequestOptions): r.Request;
}
export { ServiceObject };
