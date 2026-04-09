import { ApiError, Service, ServiceOptions } from './nodejs-common/index.js';
import { Readable } from 'stream';
import { Bucket, BucketMetadata } from './bucket.js';
import { Channel } from './channel.js';
import { File } from './file.js';
import { HmacKey, HmacKeyMetadata, HmacKeyOptions } from './hmacKey.js';
import { CRC32CValidatorGenerator } from './crc32c.js';
export interface GetServiceAccountOptions {
    userProject?: string;
    projectIdentifier?: string;
}
export interface ServiceAccount {
    emailAddress?: string;
}
export type GetServiceAccountResponse = [ServiceAccount, unknown];
export interface GetServiceAccountCallback {
    (err: Error | null, serviceAccount?: ServiceAccount, apiResponse?: unknown): void;
}
export interface CreateBucketQuery {
    enableObjectRetention: boolean;
    predefinedAcl?: 'authenticatedRead' | 'private' | 'projectPrivate' | 'publicRead' | 'publicReadWrite';
    predefinedDefaultObjectAcl?: 'authenticatedRead' | 'bucketOwnerFullControl' | 'bucketOwnerRead' | 'private' | 'projectPrivate' | 'publicRead';
    project: string;
    projection?: 'full' | 'noAcl';
    userProject: string;
}
export declare enum IdempotencyStrategy {
    RetryAlways = 0,
    RetryConditional = 1,
    RetryNever = 2
}
export interface RetryOptions {
    retryDelayMultiplier?: number;
    totalTimeout?: number;
    maxRetryDelay?: number;
    autoRetry?: boolean;
    maxRetries?: number;
    retryableErrorFn?: (err: ApiError) => boolean;
    idempotencyStrategy?: IdempotencyStrategy;
}
export interface PreconditionOptions {
    ifGenerationMatch?: number | string;
    ifGenerationNotMatch?: number | string;
    ifMetagenerationMatch?: number | string;
    ifMetagenerationNotMatch?: number | string;
}
export interface StorageOptions extends ServiceOptions {
    /**
     * The API endpoint of the service used to make requests.
     * Defaults to `storage.googleapis.com`.
     */
    apiEndpoint?: string;
    crc32cGenerator?: CRC32CValidatorGenerator;
    retryOptions?: RetryOptions;
}
export interface BucketOptions {
    crc32cGenerator?: CRC32CValidatorGenerator;
    kmsKeyName?: string;
    preconditionOpts?: PreconditionOptions;
    userProject?: string;
    generation?: number;
    softDeleted?: boolean;
}
export interface Cors {
    maxAgeSeconds?: number;
    method?: string[];
    origin?: string[];
    responseHeader?: string[];
}
interface Versioning {
    enabled: boolean;
}
/**
 * Custom placement configuration.
 * Initially used for dual-region buckets.
 **/
export interface CustomPlacementConfig {
    dataLocations?: string[];
}
export interface AutoclassConfig {
    enabled?: boolean;
    terminalStorageClass?: 'NEARLINE' | 'ARCHIVE';
}
export interface CreateBucketRequest extends BucketMetadata {
    archive?: boolean;
    coldline?: boolean;
    dataLocations?: string[];
    dra?: boolean;
    enableObjectRetention?: boolean;
    multiRegional?: boolean;
    nearline?: boolean;
    predefinedAcl?: 'authenticatedRead' | 'private' | 'projectPrivate' | 'publicRead' | 'publicReadWrite';
    predefinedDefaultObjectAcl?: 'authenticatedRead' | 'bucketOwnerFullControl' | 'bucketOwnerRead' | 'private' | 'projectPrivate' | 'publicRead';
    projection?: 'full' | 'noAcl';
    regional?: boolean;
    requesterPays?: boolean;
    rpo?: string;
    standard?: boolean;
    storageClass?: string;
    userProject?: string;
    versioning?: Versioning;
}
export type CreateBucketResponse = [Bucket, unknown];
export interface BucketCallback {
    (err: Error | null, bucket?: Bucket | null, apiResponse?: unknown): void;
}
export type GetBucketsResponse = [Bucket[], {}, unknown];
export interface GetBucketsCallback {
    (err: Error | null, buckets: Bucket[], nextQuery?: {}, apiResponse?: unknown): void;
}
export interface GetBucketsRequest {
    prefix?: string;
    project?: string;
    autoPaginate?: boolean;
    maxApiCalls?: number;
    maxResults?: number;
    pageToken?: string;
    userProject?: string;
    softDeleted?: boolean;
    generation?: number;
    returnPartialSuccess?: boolean;
}
export interface HmacKeyResourceResponse {
    metadata: HmacKeyMetadata;
    secret: string;
}
export type CreateHmacKeyResponse = [HmacKey, string, HmacKeyResourceResponse];
export interface CreateHmacKeyOptions {
    projectId?: string;
    userProject?: string;
}
export interface CreateHmacKeyCallback {
    (err: Error | null, hmacKey?: HmacKey | null, secret?: string | null, apiResponse?: HmacKeyResourceResponse): void;
}
export interface GetHmacKeysOptions {
    projectId?: string;
    serviceAccountEmail?: string;
    showDeletedKeys?: boolean;
    autoPaginate?: boolean;
    maxApiCalls?: number;
    maxResults?: number;
    pageToken?: string;
    userProject?: string;
}
export interface GetHmacKeysCallback {
    (err: Error | null, hmacKeys: HmacKey[] | null, nextQuery?: {}, apiResponse?: unknown): void;
}
export declare enum ExceptionMessages {
    EXPIRATION_DATE_INVALID = "The expiration date provided was invalid.",
    EXPIRATION_DATE_PAST = "An expiration date cannot be in the past."
}
export declare enum StorageExceptionMessages {
    BUCKET_NAME_REQUIRED = "A bucket name is needed to use Cloud Storage.",
    BUCKET_NAME_REQUIRED_CREATE = "A name is required to create a bucket.",
    HMAC_SERVICE_ACCOUNT = "The first argument must be a service account email to create an HMAC key.",
    HMAC_ACCESS_ID = "An access ID is needed to create an HmacKey object."
}
export type GetHmacKeysResponse = [HmacKey[]];
export declare const PROTOCOL_REGEX: RegExp;
/**
 * Default behavior: Automatically retry retriable server errors.
 *
 * @const {boolean}
 */
export declare const AUTO_RETRY_DEFAULT = true;
/**
 * Default behavior: Only attempt to retry retriable errors 3 times.
 *
 * @const {number}
 */
export declare const MAX_RETRY_DEFAULT = 3;
/**
 * Default behavior: Wait twice as long as previous retry before retrying.
 *
 * @const {number}
 */
export declare const RETRY_DELAY_MULTIPLIER_DEFAULT = 2;
/**
 * Default behavior: If the operation doesn't succeed after 600 seconds,
 *  stop retrying.
 *
 * @const {number}
 */
export declare const TOTAL_TIMEOUT_DEFAULT = 600;
/**
 * Default behavior: Wait no more than 64 seconds between retries.
 *
 * @const {number}
 */
export declare const MAX_RETRY_DELAY_DEFAULT = 64;
/**
 * Returns true if the API request should be retried, given the error that was
 * given the first time the request was attempted.
 * @const
 * @param {error} err - The API error to check if it is appropriate to retry.
 * @return {boolean} True if the API request should be retried, false otherwise.
 */
export declare const RETRYABLE_ERR_FN_DEFAULT: (err?: ApiError) => boolean;
/*! Developer Documentation
 *
 * Invoke this method to create a new Storage object bound with pre-determined
 * configuration options. For each object that can be created (e.g., a bucket),
 * there is an equivalent static and instance method. While they are classes,
 * they can be instantiated without use of the `new` keyword.
 */
/**
 * Cloud Storage uses access control lists (ACLs) to manage object and
 * bucket access. ACLs are the mechanism you use to share objects with other
 * users and allow other users to access your buckets and objects.
 *
 * This object provides constants to refer to the three permission levels that
 * can be granted to an entity:
 *
 *   - `gcs.acl.OWNER_ROLE` - ("OWNER")
 *   - `gcs.acl.READER_ROLE` - ("READER")
 *   - `gcs.acl.WRITER_ROLE` - ("WRITER")
 *
 * See {@link https://cloud.google.com/storage/docs/access-control/lists| About Access Control Lists}
 *
 * @name Storage#acl
 * @type {object}
 * @property {string} OWNER_ROLE
 * @property {string} READER_ROLE
 * @property {string} WRITER_ROLE
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const albums = storage.bucket('albums');
 *
 * //-
 * // Make all of the files currently in a bucket publicly readable.
 * //-
 * const options = {
 *   entity: 'allUsers',
 *   role: storage.acl.READER_ROLE
 * };
 *
 * albums.acl.add(options, function(err, aclObject) {});
 *
 * //-
 * // Make any new objects added to a bucket publicly readable.
 * //-
 * albums.acl.default.add(options, function(err, aclObject) {});
 *
 * //-
 * // Grant a user ownership permissions to a bucket.
 * //-
 * albums.acl.add({
 *   entity: 'user-useremail@example.com',
 *   role: storage.acl.OWNER_ROLE
 * }, function(err, aclObject) {});
 *
 * //-
 * // If the callback is omitted, we'll return a Promise.
 * //-
 * albums.acl.add(options).then(function(data) {
 *   const aclObject = data[0];
 *   const apiResponse = data[1];
 * });
 * ```
 */
/**
 * Get {@link Bucket} objects for all of the buckets in your project as
 * a readable object stream.
 *
 * @method Storage#getBucketsStream
 * @param {GetBucketsRequest} [query] Query object for listing buckets.
 * @returns {ReadableStream} A readable stream that emits {@link Bucket}
 *     instances.
 *
 * @example
 * ```
 * storage.getBucketsStream()
 *   .on('error', console.error)
 *   .on('data', function(bucket) {
 *     // bucket is a Bucket object.
 *   })
 *   .on('end', function() {
 *     // All buckets retrieved.
 *   });
 *
 * //-
 * // If you anticipate many results, you can end a stream early to prevent
 * // unnecessary processing and API requests.
 * //-
 * storage.getBucketsStream()
 *   .on('data', function(bucket) {
 *     this.end();
 *   });
 * ```
 */
/**
 * Get {@link HmacKey} objects for all of the HMAC keys in the project in a
 * readable object stream.
 *
 * @method Storage#getHmacKeysStream
 * @param {GetHmacKeysOptions} [options] Configuration options.
 * @returns {ReadableStream} A readable stream that emits {@link HmacKey}
 *     instances.
 *
 * @example
 * ```
 * storage.getHmacKeysStream()
 *   .on('error', console.error)
 *   .on('data', function(hmacKey) {
 *     // hmacKey is an HmacKey object.
 *   })
 *   .on('end', function() {
 *     // All HmacKey retrieved.
 *   });
 *
 * //-
 * // If you anticipate many results, you can end a stream early to prevent
 * // unnecessary processing and API requests.
 * //-
 * storage.getHmacKeysStream()
 *   .on('data', function(bucket) {
 *     this.end();
 *   });
 * ```
 */
/**
 * <h4>ACLs</h4>
 * Cloud Storage uses access control lists (ACLs) to manage object and
 * bucket access. ACLs are the mechanism you use to share files with other users
 * and allow other users to access your buckets and files.
 *
 * To learn more about ACLs, read this overview on
 * {@link https://cloud.google.com/storage/docs/access-control| Access Control}.
 *
 * See {@link https://cloud.google.com/storage/docs/overview| Cloud Storage overview}
 * See {@link https://cloud.google.com/storage/docs/access-control| Access Control}
 *
 * @class
 */
export declare class Storage extends Service {
    /**
     * {@link Bucket} class.
     *
     * @name Storage.Bucket
     * @see Bucket
     * @type {Constructor}
     */
    static Bucket: typeof Bucket;
    /**
     * {@link Channel} class.
     *
     * @name Storage.Channel
     * @see Channel
     * @type {Constructor}
     */
    static Channel: typeof Channel;
    /**
     * {@link File} class.
     *
     * @name Storage.File
     * @see File
     * @type {Constructor}
     */
    static File: typeof File;
    /**
     * {@link HmacKey} class.
     *
     * @name Storage.HmacKey
     * @see HmacKey
     * @type {Constructor}
     */
    static HmacKey: typeof HmacKey;
    static acl: {
        OWNER_ROLE: string;
        READER_ROLE: string;
        WRITER_ROLE: string;
    };
    /**
     * Reference to {@link Storage.acl}.
     *
     * @name Storage#acl
     * @see Storage.acl
     */
    acl: typeof Storage.acl;
    crc32cGenerator: CRC32CValidatorGenerator;
    getBucketsStream(): Readable;
    getHmacKeysStream(): Readable;
    retryOptions: RetryOptions;
    /**
     * @callback Crc32cGeneratorToStringCallback
     * A method returning the CRC32C as a base64-encoded string.
     *
     * @returns {string}
     *
     * @example
     * Hashing the string 'data' should return 'rth90Q=='
     *
     * ```js
     * const buffer = Buffer.from('data');
     * crc32c.update(buffer);
     * crc32c.toString(); // 'rth90Q=='
     * ```
     **/
    /**
     * @callback Crc32cGeneratorValidateCallback
     * A method validating a base64-encoded CRC32C string.
     *
     * @param {string} [value] base64-encoded CRC32C string to validate
     * @returns {boolean}
     *
     * @example
     * Should return `true` if the value matches, `false` otherwise
     *
     * ```js
     * const buffer = Buffer.from('data');
     * crc32c.update(buffer);
     * crc32c.validate('DkjKuA=='); // false
     * crc32c.validate('rth90Q=='); // true
     * ```
     **/
    /**
     * @callback Crc32cGeneratorUpdateCallback
     * A method for passing `Buffer`s for CRC32C generation.
     *
     * @param {Buffer} [data] data to update CRC32C value with
     * @returns {undefined}
     *
     * @example
     * Hashing buffers from 'some ' and 'text\n'
     *
     * ```js
     * const buffer1 = Buffer.from('some ');
     * crc32c.update(buffer1);
     *
     * const buffer2 = Buffer.from('text\n');
     * crc32c.update(buffer2);
     *
     * crc32c.toString(); // 'DkjKuA=='
     * ```
     **/
    /**
     * @typedef {object} CRC32CValidator
     * @property {Crc32cGeneratorToStringCallback}
     * @property {Crc32cGeneratorValidateCallback}
     * @property {Crc32cGeneratorUpdateCallback}
     */
    /**
     * @callback Crc32cGeneratorCallback
     * @returns {CRC32CValidator}
     */
    /**
     * @typedef {object} StorageOptions
     * @property {string} [projectId] The project ID from the Google Developer's
     *     Console, e.g. 'grape-spaceship-123'. We will also check the environment
     *     variable `GCLOUD_PROJECT` for your project ID. If your app is running
     * in an environment which supports {@link
     * https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application
     * Application Default Credentials}, your project ID will be detected
     * automatically.
     * @property {string} [keyFilename] Full path to the a .json, .pem, or .p12 key
     *     downloaded from the Google Developers Console. If you provide a path to
     * a JSON file, the `projectId` option above is not necessary. NOTE: .pem and
     *     .p12 require you to specify the `email` option as well.
     * @property {string} [email] Account email address. Required when using a .pem
     *     or .p12 keyFilename.
     * @property {object} [credentials] Credentials object.
     * @property {string} [credentials.client_email]
     * @property {string} [credentials.private_key]
     * @property {object} [retryOptions] Options for customizing retries. Retriable server errors
     *     will be retried with exponential delay between them dictated by the formula
     *     max(maxRetryDelay, retryDelayMultiplier*retryNumber) until maxRetries or totalTimeout
     *     has been reached. Retries will only happen if autoRetry is set to true.
     * @property {boolean} [retryOptions.autoRetry=true] Automatically retry requests if the
     *     response is related to rate limits or certain intermittent server
     * errors. We will exponentially backoff subsequent requests by default.
     * @property {number} [retryOptions.retryDelayMultiplier = 2] the multiplier by which to
     *   increase the delay time between the completion of failed requests, and the
     *   initiation of the subsequent retrying request.
     * @property {number} [retryOptions.totalTimeout = 600] The total time, starting from
     *  when the initial request is sent, after which an error will
     *   be returned, regardless of the retrying attempts made meanwhile.
     * @property {number} [retryOptions.maxRetryDelay = 64] The maximum delay time between requests.
     *   When this value is reached, ``retryDelayMultiplier`` will no longer be used to
     *   increase delay time.
     * @property {number} [retryOptions.maxRetries=3] Maximum number of automatic retries
     *     attempted before returning the error.
     * @property {function} [retryOptions.retryableErrorFn] Function that returns true if a given
     *     error should be retried and false otherwise.
     * @property {enum} [retryOptions.idempotencyStrategy=IdempotencyStrategy.RetryConditional] Enumeration
     *     controls how conditionally idempotent operations are retried. Possible values are: RetryAlways -
     *     will respect other retry settings and attempt to retry conditionally idempotent operations. RetryConditional -
     *     will retry conditionally idempotent operations if the correct preconditions are set. RetryNever - never
     *     retry a conditionally idempotent operation.
     * @property {string} [userAgent] The value to be prepended to the User-Agent
     *     header in API requests.
     * @property {object} [authClient] `AuthClient` or `GoogleAuth` client to reuse instead of creating a new one.
     * @property {number} [timeout] The amount of time in milliseconds to wait per http request before timing out.
     * @property {object[]} [interceptors_] Array of custom request interceptors to be returned in the order they were assigned.
     * @property {string} [apiEndpoint = storage.google.com] The API endpoint of the service used to make requests.
     * @property {boolean} [useAuthWithCustomEndpoint = false] Controls whether or not to use authentication when using a custom endpoint.
     * @property {Crc32cGeneratorCallback} [callback] A function that generates a CRC32C Validator. Defaults to {@link CRC32C}
     */
    /**
     * Constructs the Storage client.
     *
     * @example
     * Create a client that uses Application Default Credentials
     * (ADC)
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * ```
     *
     * @example
     * Create a client with explicit credentials
     * ```
     * const storage = new Storage({
     *   projectId: 'your-project-id',
     *   keyFilename: '/path/to/keyfile.json'
     * });
     * ```
     *
     * @example
     * Create a client with credentials passed
     * by value as a JavaScript object
     * ```
     * const storage = new Storage({
     *   projectId: 'your-project-id',
     *   credentials: {
     *     type: 'service_account',
     *     project_id: 'xxxxxxx',
     *     private_key_id: 'xxxx',
     *     private_key:'-----BEGIN PRIVATE KEY-----xxxxxxx\n-----END PRIVATE KEY-----\n',
     *     client_email: 'xxxx',
     *     client_id: 'xxx',
     *     auth_uri: 'https://accounts.google.com/o/oauth2/auth',
     *     token_uri: 'https://oauth2.googleapis.com/token',
     *     auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
     *     client_x509_cert_url: 'xxx',
     *     }
     * });
     * ```
     *
     * @example
     * Create a client with credentials passed
     * by loading a JSON file directly from disk
     * ```
     * const storage = new Storage({
     *   projectId: 'your-project-id',
     *   credentials: require('/path/to-keyfile.json')
     * });
     * ```
     *
     * @example
     * Create a client with an `AuthClient` (e.g. `DownscopedClient`)
     * ```
     * const {DownscopedClient} = require('google-auth-library');
     * const authClient = new DownscopedClient({...});
     *
     * const storage = new Storage({authClient});
     * ```
     *
     * Additional samples:
     * - https://github.com/googleapis/google-auth-library-nodejs#sample-usage-1
     * - https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/downscopedclient.js
     *
     * @param {StorageOptions} [options] Configuration options.
     */
    constructor(options?: StorageOptions);
    private static sanitizeEndpoint;
    /**
     * Get a reference to a Cloud Storage bucket.
     *
     * @param {string} name Name of the bucket.
     * @param {object} [options] Configuration object.
     * @param {string} [options.kmsKeyName] A Cloud KMS key that will be used to
     *     encrypt objects inserted into this bucket, if no encryption method is
     *     specified.
     * @param {string} [options.userProject] User project to be billed for all
     *     requests made from this Bucket object.
     * @returns {Bucket}
     * @see Bucket
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const albums = storage.bucket('albums');
     * const photos = storage.bucket('photos');
     * ```
     */
    bucket(name: string, options?: BucketOptions): Bucket;
    /**
     * Reference a channel to receive notifications about changes to your bucket.
     *
     * @param {string} id The ID of the channel.
     * @param {string} resourceId The resource ID of the channel.
     * @returns {Channel}
     * @see Channel
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const channel = storage.channel('id', 'resource-id');
     * ```
     */
    channel(id: string, resourceId: string): Channel;
    createBucket(name: string, metadata?: CreateBucketRequest): Promise<CreateBucketResponse>;
    createBucket(name: string, callback: BucketCallback): void;
    createBucket(name: string, metadata: CreateBucketRequest, callback: BucketCallback): void;
    createBucket(name: string, metadata: CreateBucketRequest, callback: BucketCallback): void;
    createHmacKey(serviceAccountEmail: string, options?: CreateHmacKeyOptions): Promise<CreateHmacKeyResponse>;
    createHmacKey(serviceAccountEmail: string, callback: CreateHmacKeyCallback): void;
    createHmacKey(serviceAccountEmail: string, options: CreateHmacKeyOptions, callback: CreateHmacKeyCallback): void;
    getBuckets(options?: GetBucketsRequest): Promise<GetBucketsResponse>;
    getBuckets(options: GetBucketsRequest, callback: GetBucketsCallback): void;
    getBuckets(callback: GetBucketsCallback): void;
    /**
     * Query object for listing HMAC keys.
     *
     * @typedef {object} GetHmacKeysOptions
     * @property {string} [projectId] The project ID of the project that owns
     *     the service account of the requested HMAC key. If not provided,
     *     the project ID used to instantiate the Storage client will be used.
     * @property {string} [serviceAccountEmail] If present, only HMAC keys for the
     *     given service account are returned.
     * @property {boolean} [showDeletedKeys=false] If true, include keys in the DELETE
     *     state. Default is false.
     * @property {boolean} [autoPaginate=true] Have pagination handled
     *     automatically.
     * @property {number} [maxApiCalls] Maximum number of API calls to make.
     * @property {number} [maxResults] Maximum number of items plus prefixes to
     *     return per call.
     *     Note: By default will handle pagination automatically
     *     if more than 1 page worth of results are requested per call.
     *     When `autoPaginate` is set to `false` the smaller of `maxResults`
     *     or 1 page of results will be returned per call.
     * @property {string} [pageToken] A previously-returned page token
     *     representing part of the larger set of results to view.
     * @property {string} [userProject] This parameter is currently ignored.
     */
    /**
     * @typedef {array} GetHmacKeysResponse
     * @property {HmacKey[]} 0 Array of {@link HmacKey} instances.
     * @param {object} nextQuery 1 A query object to receive more results.
     * @param {object} apiResponse 2 The full API response.
     */
    /**
     * @callback GetHmacKeysCallback
     * @param {?Error} err Request error, if any.
     * @param {HmacKey[]} hmacKeys Array of {@link HmacKey} instances.
     * @param {object} nextQuery A query object to receive more results.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Retrieves a list of HMAC keys matching the criteria.
     *
     * The authenticated user must have storage.hmacKeys.list permission for the project in which the key exists.
     *
     * @param {GetHmacKeysOption} options Configuration options.
     * @param {GetHmacKeysCallback} callback Callback function.
     * @return {Promise<GetHmacKeysResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * storage.getHmacKeys(function(err, hmacKeys) {
     *   if (!err) {
     *     // hmacKeys is an array of HmacKey objects.
     *   }
     * });
     *
     * //-
     * // To control how many API requests are made and page through the results
     * // manually, set `autoPaginate` to `false`.
     * //-
     * const callback = function(err, hmacKeys, nextQuery, apiResponse) {
     *   if (nextQuery) {
     *     // More results exist.
     *     storage.getHmacKeys(nextQuery, callback);
     *   }
     *
     *   // The `metadata` property is populated for you with the metadata at the
     *   // time of fetching.
     *   hmacKeys[0].metadata;
     * };
     *
     * storage.getHmacKeys({
     *   autoPaginate: false
     * }, callback);
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * storage.getHmacKeys().then(function(data) {
     *   const hmacKeys = data[0];
     * });
     * ```
     */
    getHmacKeys(options?: GetHmacKeysOptions): Promise<GetHmacKeysResponse>;
    getHmacKeys(callback: GetHmacKeysCallback): void;
    getHmacKeys(options: GetHmacKeysOptions, callback: GetHmacKeysCallback): void;
    getServiceAccount(options?: GetServiceAccountOptions): Promise<GetServiceAccountResponse>;
    getServiceAccount(options?: GetServiceAccountOptions): Promise<GetServiceAccountResponse>;
    getServiceAccount(options: GetServiceAccountOptions, callback: GetServiceAccountCallback): void;
    getServiceAccount(callback: GetServiceAccountCallback): void;
    /**
     * Get a reference to an HmacKey object.
     * Note: this does not fetch the HMAC key's metadata. Use HmacKey#get() to
     * retrieve and populate the metadata.
     *
     * To get a reference to an HMAC key that's not created for a service
     * account in the same project used to instantiate the Storage client,
     * supply the project's ID as `projectId` in the `options` argument.
     *
     * @param {string} accessId The HMAC key's access ID.
     * @param {HmacKeyOptions} options HmacKey constructor options.
     * @returns {HmacKey}
     * @see HmacKey
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const hmacKey = storage.hmacKey('ACCESS_ID');
     * ```
     */
    hmacKey(accessId: string, options?: HmacKeyOptions): HmacKey;
}
export {};
