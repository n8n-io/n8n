import { ServiceObject, MetadataCallback, SetMetadataResponse } from './nodejs-common/index.js';
import { BaseMetadata, SetMetadataOptions } from './nodejs-common/service-object.js';
import { Storage } from './storage.js';
export interface HmacKeyOptions {
    projectId?: string;
}
export interface HmacKeyMetadata extends BaseMetadata {
    accessId?: string;
    etag?: string;
    projectId?: string;
    serviceAccountEmail?: string;
    state?: string;
    timeCreated?: string;
    updated?: string;
}
export interface SetHmacKeyMetadataOptions {
    /**
     * This parameter is currently ignored.
     */
    userProject?: string;
}
export interface SetHmacKeyMetadata {
    state?: 'ACTIVE' | 'INACTIVE';
    etag?: string;
}
export interface HmacKeyMetadataCallback {
    (err: Error | null, metadata?: HmacKeyMetadata, apiResponse?: unknown): void;
}
export type HmacKeyMetadataResponse = [HmacKeyMetadata, unknown];
/**
 * The API-formatted resource description of the HMAC key.
 *
 * Note: This is not guaranteed to be up-to-date when accessed. To get the
 * latest record, call the `getMetadata()` method.
 *
 * @name HmacKey#metadata
 * @type {object}
 */
/**
 * An HmacKey object contains metadata of an HMAC key created from a
 * service account through the {@link Storage} client using
 * {@link Storage#createHmacKey}.
 *
 * See {@link https://cloud.google.com/storage/docs/authentication/hmackeys| HMAC keys documentation}
 *
 * @class
 */
export declare class HmacKey extends ServiceObject<HmacKey, HmacKeyMetadata> {
    /**
     * A reference to the {@link Storage} associated with this {@link HmacKey}
     * instance.
     * @name HmacKey#storage
     * @type {Storage}
     */
    storage: Storage;
    private instanceRetryValue?;
    /**
     * @typedef {object} HmacKeyOptions
     * @property {string} [projectId] The project ID of the project that owns
     *     the service account of the requested HMAC key. If not provided,
     *     the project ID used to instantiate the Storage client will be used.
     */
    /**
     * Constructs an HmacKey object.
     *
     * Note: this only create a local reference to an HMAC key, to create
     * an HMAC key, use {@link Storage#createHmacKey}.
     *
     * @param {Storage} storage The Storage instance this HMAC key is
     *     attached to.
     * @param {string} accessId The unique accessId for this HMAC key.
     * @param {HmacKeyOptions} options Constructor configurations.
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const hmacKey = storage.hmacKey('access-id');
     * ```
     */
    constructor(storage: Storage, accessId: string, options?: HmacKeyOptions);
    /**
     * Set the metadata for this object.
     *
     * @param {object} metadata - The metadata to set on this object.
     * @param {object=} options - Configuration options.
     * @param {function=} callback - The callback function.
     * @param {?error} callback.err - An error returned while making this request.
     * @param {object} callback.apiResponse - The full API response.
     */
    setMetadata(metadata: HmacKeyMetadata, options?: SetMetadataOptions): Promise<SetMetadataResponse<HmacKeyMetadata>>;
    setMetadata(metadata: HmacKeyMetadata, callback: MetadataCallback<HmacKeyMetadata>): void;
    setMetadata(metadata: HmacKeyMetadata, options: SetMetadataOptions, callback: MetadataCallback<HmacKeyMetadata>): void;
}
