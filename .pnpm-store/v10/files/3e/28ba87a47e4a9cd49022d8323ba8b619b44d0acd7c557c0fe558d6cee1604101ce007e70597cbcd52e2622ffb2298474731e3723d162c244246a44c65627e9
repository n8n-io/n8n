import { ApiError, BodyResponseCallback, DecorateRequestOptions, DeleteCallback, ExistsCallback, GetConfig, MetadataCallback, ServiceObject, SetMetadataResponse } from './nodejs-common/index.js';
import { RequestResponse } from './nodejs-common/service-object.js';
import * as http from 'http';
import { Acl, AclMetadata } from './acl.js';
import { Channel } from './channel.js';
import { File, FileOptions, CreateResumableUploadOptions, CreateWriteStreamOptions } from './file.js';
import { Iam } from './iam.js';
import { Notification } from './notification.js';
import { Storage, Cors, PreconditionOptions, BucketOptions } from './storage.js';
import { GetSignedUrlResponse, GetSignedUrlCallback, SignerGetSignedUrlConfig, URLSigner, Query } from './signer.js';
import { Readable } from 'stream';
import { CRC32CValidatorGenerator } from './crc32c.js';
import { URL } from 'url';
import { BaseMetadata, SetMetadataOptions } from './nodejs-common/service-object.js';
export type GetFilesResponse = [
    File[],
    (GetFilesOptions | {}) & Partial<Pick<GetFilesOptions, 'pageToken'>>,
    unknown
];
export interface GetFilesCallback {
    (err: Error | null, files?: File[], nextQuery?: {}, apiResponse?: unknown): void;
}
interface WatchAllOptions {
    delimiter?: string;
    maxResults?: number;
    pageToken?: string;
    prefix?: string;
    projection?: string;
    userProject?: string;
    versions?: boolean;
}
export interface AddLifecycleRuleOptions extends PreconditionOptions {
    append?: boolean;
}
export interface LifecycleAction {
    type: 'Delete' | 'SetStorageClass' | 'AbortIncompleteMultipartUpload';
    storageClass?: string;
}
export interface LifecycleCondition {
    age?: number;
    createdBefore?: Date | string;
    customTimeBefore?: Date | string;
    daysSinceCustomTime?: number;
    daysSinceNoncurrentTime?: number;
    isLive?: boolean;
    matchesPrefix?: string[];
    matchesSuffix?: string[];
    matchesStorageClass?: string[];
    noncurrentTimeBefore?: Date | string;
    numNewerVersions?: number;
}
export interface LifecycleRule {
    action: LifecycleAction;
    condition: LifecycleCondition;
}
export interface LifecycleCondition {
    age?: number;
    createdBefore?: Date | string;
    customTimeBefore?: Date | string;
    daysSinceCustomTime?: number;
    daysSinceNoncurrentTime?: number;
    isLive?: boolean;
    matchesPrefix?: string[];
    matchesSuffix?: string[];
    matchesStorageClass?: string[];
    noncurrentTimeBefore?: Date | string;
    numNewerVersions?: number;
}
export interface LifecycleRule {
    action: LifecycleAction;
    condition: LifecycleCondition;
}
export interface EnableLoggingOptions extends PreconditionOptions {
    bucket?: string | Bucket;
    prefix: string;
}
export interface GetFilesOptions {
    autoPaginate?: boolean;
    delimiter?: string;
    endOffset?: string;
    includeFoldersAsPrefixes?: boolean;
    includeTrailingDelimiter?: boolean;
    prefix?: string;
    matchGlob?: string;
    maxApiCalls?: number;
    maxResults?: number;
    pageToken?: string;
    softDeleted?: boolean;
    startOffset?: string;
    userProject?: string;
    versions?: boolean;
}
export interface CombineOptions extends PreconditionOptions {
    kmsKeyName?: string;
    userProject?: string;
}
export interface CombineCallback {
    (err: Error | null, newFile: File | null, apiResponse: unknown): void;
}
export type CombineResponse = [File, unknown];
export interface CreateChannelConfig extends WatchAllOptions {
    address: string;
}
export interface CreateChannelOptions {
    userProject?: string;
}
export type CreateChannelResponse = [Channel, unknown];
export interface CreateChannelCallback {
    (err: Error | null, channel: Channel | null, apiResponse: unknown): void;
}
export interface CreateNotificationOptions {
    customAttributes?: {
        [key: string]: string;
    };
    eventTypes?: string[];
    objectNamePrefix?: string;
    payloadFormat?: string;
    userProject?: string;
}
export interface CreateNotificationCallback {
    (err: Error | null, notification: Notification | null, apiResponse: unknown): void;
}
export type CreateNotificationResponse = [Notification, unknown];
export interface DeleteBucketOptions {
    ignoreNotFound?: boolean;
    userProject?: string;
}
export type DeleteBucketResponse = [unknown];
export interface DeleteBucketCallback extends DeleteCallback {
    (err: Error | null, apiResponse: unknown): void;
}
export interface DeleteFilesOptions extends GetFilesOptions, PreconditionOptions {
    force?: boolean;
}
export interface DeleteFilesCallback {
    (err: Error | Error[] | null, apiResponse?: object): void;
}
export type DeleteLabelsResponse = [unknown];
export type DeleteLabelsCallback = SetLabelsCallback;
export type DeleteLabelsOptions = PreconditionOptions;
export type DisableRequesterPaysOptions = PreconditionOptions;
export type DisableRequesterPaysResponse = [unknown];
export interface DisableRequesterPaysCallback {
    (err?: Error | null, apiResponse?: object): void;
}
export type EnableRequesterPaysResponse = [unknown];
export interface EnableRequesterPaysCallback {
    (err?: Error | null, apiResponse?: unknown): void;
}
export type EnableRequesterPaysOptions = PreconditionOptions;
export interface BucketExistsOptions extends GetConfig {
    userProject?: string;
}
export type BucketExistsResponse = [boolean];
export type BucketExistsCallback = ExistsCallback;
export interface GetBucketOptions extends GetConfig {
    userProject?: string;
}
export type GetBucketResponse = [Bucket, unknown];
export interface GetBucketCallback {
    (err: ApiError | null, bucket: Bucket | null, apiResponse: unknown): void;
}
export interface GetLabelsOptions {
    userProject?: string;
}
export type GetLabelsResponse = [unknown];
export interface GetLabelsCallback {
    (err: Error | null, labels: object | null): void;
}
export interface BucketMetadata extends BaseMetadata {
    acl?: AclMetadata[] | null;
    autoclass?: {
        enabled?: boolean;
        toggleTime?: string;
        terminalStorageClass?: string;
        terminalStorageClassUpdateTime?: string;
    };
    billing?: {
        requesterPays?: boolean;
    };
    cors?: Cors[];
    customPlacementConfig?: {
        dataLocations?: string[];
    };
    defaultEventBasedHold?: boolean;
    defaultObjectAcl?: AclMetadata[];
    encryption?: {
        defaultKmsKeyName?: string;
    } | null;
    hierarchicalNamespace?: {
        enabled?: boolean;
    };
    iamConfiguration?: {
        publicAccessPrevention?: string;
        uniformBucketLevelAccess?: {
            enabled?: boolean;
            lockedTime?: string;
        };
    };
    labels?: {
        [key: string]: string | null;
    };
    lifecycle?: {
        rule?: LifecycleRule[];
    } | null;
    location?: string;
    locationType?: string;
    logging?: {
        logBucket?: string;
        logObjectPrefix?: string;
    };
    metageneration?: string;
    name?: string;
    objectRetention?: {
        mode?: string;
    };
    owner?: {
        entity?: string;
        entityId?: string;
    };
    projectNumber?: string | number;
    retentionPolicy?: {
        effectiveTime?: string;
        isLocked?: boolean;
        retentionPeriod?: string | number;
    } | null;
    rpo?: string;
    softDeletePolicy?: {
        retentionDurationSeconds?: string | number;
        readonly effectiveTime?: string;
    };
    storageClass?: string;
    timeCreated?: string;
    updated?: string;
    versioning?: {
        enabled?: boolean;
    };
    website?: {
        mainPageSuffix?: string;
        notFoundPage?: string;
    };
}
export type GetBucketMetadataResponse = [BucketMetadata, unknown];
export interface GetBucketMetadataCallback {
    (err: ApiError | null, metadata: BucketMetadata | null, apiResponse: unknown): void;
}
export interface GetBucketMetadataOptions {
    userProject?: string;
}
export interface GetBucketSignedUrlConfig extends Pick<SignerGetSignedUrlConfig, 'host' | 'signingEndpoint'> {
    action: 'list';
    version?: 'v2' | 'v4';
    cname?: string;
    virtualHostedStyle?: boolean;
    expires: string | number | Date;
    extensionHeaders?: http.OutgoingHttpHeaders;
    queryParams?: Query;
}
export declare enum BucketActionToHTTPMethod {
    list = "GET"
}
export declare enum AvailableServiceObjectMethods {
    setMetadata = 0,
    delete = 1
}
export interface GetNotificationsOptions {
    userProject?: string;
}
export interface GetNotificationsCallback {
    (err: Error | null, notifications: Notification[] | null, apiResponse: unknown): void;
}
export type GetNotificationsResponse = [Notification[], unknown];
export interface MakeBucketPrivateOptions {
    includeFiles?: boolean;
    force?: boolean;
    metadata?: BucketMetadata;
    userProject?: string;
    preconditionOpts?: PreconditionOptions;
}
export type MakeBucketPrivateResponse = [File[]];
export interface MakeBucketPrivateCallback {
    (err?: Error | null, files?: File[]): void;
}
export interface MakeBucketPublicOptions {
    includeFiles?: boolean;
    force?: boolean;
}
export interface MakeBucketPublicCallback {
    (err?: Error | null, files?: File[]): void;
}
export type MakeBucketPublicResponse = [File[]];
export interface SetBucketMetadataOptions extends PreconditionOptions {
    userProject?: string;
}
export type SetBucketMetadataResponse = [BucketMetadata];
export interface SetBucketMetadataCallback {
    (err?: Error | null, metadata?: BucketMetadata): void;
}
export interface BucketLockCallback {
    (err?: Error | null, apiResponse?: unknown): void;
}
export type BucketLockResponse = [unknown];
export interface Labels {
    [key: string]: string;
}
export interface SetLabelsOptions extends PreconditionOptions {
    userProject?: string;
}
export type SetLabelsResponse = [unknown];
export interface SetLabelsCallback {
    (err?: Error | null, metadata?: unknown): void;
}
export interface SetBucketStorageClassOptions extends PreconditionOptions {
    userProject?: string;
}
export interface SetBucketStorageClassCallback {
    (err?: Error | null): void;
}
export type UploadResponse = [File, unknown];
export interface UploadCallback {
    (err: Error | null, file?: File | null, apiResponse?: unknown): void;
}
export interface UploadOptions extends CreateResumableUploadOptions, CreateWriteStreamOptions {
    destination?: string | File;
    encryptionKey?: string | Buffer;
    kmsKeyName?: string;
    onUploadProgress?: (progressEvent: any) => void;
}
export interface MakeAllFilesPublicPrivateOptions {
    force?: boolean;
    private?: boolean;
    public?: boolean;
    userProject?: string;
}
interface MakeAllFilesPublicPrivateCallback {
    (err?: Error | Error[] | null, files?: File[]): void;
}
type MakeAllFilesPublicPrivateResponse = [File[]];
export declare enum BucketExceptionMessages {
    PROVIDE_SOURCE_FILE = "You must provide at least one source file.",
    DESTINATION_FILE_NOT_SPECIFIED = "A destination file must be specified.",
    CHANNEL_ID_REQUIRED = "An ID is required to create a channel.",
    TOPIC_NAME_REQUIRED = "A valid topic name is required.",
    CONFIGURATION_OBJECT_PREFIX_REQUIRED = "A configuration object with a prefix is required.",
    SPECIFY_FILE_NAME = "A file name must be specified.",
    METAGENERATION_NOT_PROVIDED = "A metageneration must be provided.",
    SUPPLY_NOTIFICATION_ID = "You must supply a notification ID."
}
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
 * A function that generates a CRC32C Validator. Defaults to {@link CRC32C}
 *
 * @name Bucket#crc32cGenerator
 * @type {CRC32CValidator}
 */
/**
 * Get and set IAM policies for your bucket.
 *
 * @name Bucket#iam
 * @mixes Iam
 *
 * See {@link https://cloud.google.com/storage/docs/access-control/iam#short_title_iam_management| Cloud Storage IAM Management}
 * See {@link https://cloud.google.com/iam/docs/granting-changing-revoking-access| Granting, Changing, and Revoking Access}
 * See {@link https://cloud.google.com/iam/docs/understanding-roles| IAM Roles}
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const bucket = storage.bucket('albums');
 *
 * //-
 * // Get the IAM policy for your bucket.
 * //-
 * bucket.iam.getPolicy(function(err, policy) {
 *   console.log(policy);
 * });
 *
 * //-
 * // If the callback is omitted, we'll return a Promise.
 * //-
 * bucket.iam.getPolicy().then(function(data) {
 *   const policy = data[0];
 *   const apiResponse = data[1];
 * });
 *
 * ```
 * @example <caption>include:samples/iam.js</caption>
 * region_tag:storage_view_bucket_iam_members
 * Example of retrieving a bucket's IAM policy:
 *
 * @example <caption>include:samples/iam.js</caption>
 * region_tag:storage_add_bucket_iam_member
 * Example of adding to a bucket's IAM policy:
 *
 * @example <caption>include:samples/iam.js</caption>
 * region_tag:storage_remove_bucket_iam_member
 * Example of removing from a bucket's IAM policy:
 */
/**
 * Cloud Storage uses access control lists (ACLs) to manage object and
 * bucket access. ACLs are the mechanism you use to share objects with other
 * users and allow other users to access your buckets and objects.
 *
 * An ACL consists of one or more entries, where each entry grants permissions
 * to an entity. Permissions define the actions that can be performed against
 * an object or bucket (for example, `READ` or `WRITE`); the entity defines
 * who the permission applies to (for example, a specific user or group of
 * users).
 *
 * The `acl` object on a Bucket instance provides methods to get you a list of
 * the ACLs defined on your bucket, as well as set, update, and delete them.
 *
 * Buckets also have
 * {@link https://cloud.google.com/storage/docs/access-control/lists#default| default ACLs}
 * for all created files. Default ACLs specify permissions that all new
 * objects added to the bucket will inherit by default. You can add, delete,
 * get, and update entities and permissions for these as well with
 * {@link Bucket#acl.default}.
 *
 * See {@link http://goo.gl/6qBBPO| About Access Control Lists}
 * See {@link https://cloud.google.com/storage/docs/access-control/lists#default| Default ACLs}
 *
 * @name Bucket#acl
 * @mixes Acl
 * @property {Acl} default Cloud Storage Buckets have
 * {@link https://cloud.google.com/storage/docs/access-control/lists#default| default ACLs}
 * for all created files. You can add, delete, get, and update entities and
 * permissions for these as well. The method signatures and examples are all
 * the same, after only prefixing the method call with `default`.
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 *
 * //-
 * // Make a bucket's contents publicly readable.
 * //-
 * const myBucket = storage.bucket('my-bucket');
 *
 * const options = {
 *   entity: 'allUsers',
 *   role: storage.acl.READER_ROLE
 * };
 *
 * myBucket.acl.add(options, function(err, aclObject) {});
 *
 * //-
 * // If the callback is omitted, we'll return a Promise.
 * //-
 * myBucket.acl.add(options).then(function(data) {
 *   const aclObject = data[0];
 *   const apiResponse = data[1];
 * });
 *
 * ```
 * @example <caption>include:samples/acl.js</caption>
 * region_tag:storage_print_bucket_acl
 * Example of printing a bucket's ACL:
 *
 * @example <caption>include:samples/acl.js</caption>
 * region_tag:storage_print_bucket_acl_for_user
 * Example of printing a bucket's ACL for a specific user:
 *
 * @example <caption>include:samples/acl.js</caption>
 * region_tag:storage_add_bucket_owner
 * Example of adding an owner to a bucket:
 *
 * @example <caption>include:samples/acl.js</caption>
 * region_tag:storage_remove_bucket_owner
 * Example of removing an owner from a bucket:
 *
 * @example <caption>include:samples/acl.js</caption>
 * region_tag:storage_add_bucket_default_owner
 * Example of adding a default owner to a bucket:
 *
 * @example <caption>include:samples/acl.js</caption>
 * region_tag:storage_remove_bucket_default_owner
 * Example of removing a default owner from a bucket:
 */
/**
 * The API-formatted resource description of the bucket.
 *
 * Note: This is not guaranteed to be up-to-date when accessed. To get the
 * latest record, call the `getMetadata()` method.
 *
 * @name Bucket#metadata
 * @type {object}
 */
/**
 * The bucket's name.
 * @name Bucket#name
 * @type {string}
 */
/**
 * Get {@link File} objects for the files currently in the bucket as a
 * readable object stream.
 *
 * @method Bucket#getFilesStream
 * @param {GetFilesOptions} [query] Query object for listing files.
 * @returns {ReadableStream} A readable stream that emits {@link File} instances.
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const bucket = storage.bucket('albums');
 *
 * bucket.getFilesStream()
 *   .on('error', console.error)
 *   .on('data', function(file) {
 *     // file is a File object.
 *   })
 *   .on('end', function() {
 *     // All files retrieved.
 *   });
 *
 * //-
 * // If you anticipate many results, you can end a stream early to prevent
 * // unnecessary processing and API requests.
 * //-
 * bucket.getFilesStream()
 *   .on('data', function(file) {
 *     this.end();
 *   });
 *
 * //-
 * // If you're filtering files with a delimiter, you should use
 * // {@link Bucket#getFiles} and set `autoPaginate: false` in order to
 * // preserve the `apiResponse` argument.
 * //-
 * const prefixes = [];
 *
 * function callback(err, files, nextQuery, apiResponse) {
 *   prefixes = prefixes.concat(apiResponse.prefixes);
 *
 *   if (nextQuery) {
 *     bucket.getFiles(nextQuery, callback);
 *   } else {
 *     // prefixes = The finished array of prefixes.
 *   }
 * }
 *
 * bucket.getFiles({
 *   autoPaginate: false,
 *   delimiter: '/'
 * }, callback);
 * ```
 */
/**
 * Create a Bucket object to interact with a Cloud Storage bucket.
 *
 * @class
 * @hideconstructor
 *
 * @param {Storage} storage A {@link Storage} instance.
 * @param {string} name The name of the bucket.
 * @param {object} [options] Configuration object.
 * @param {string} [options.userProject] User project.
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const bucket = storage.bucket('albums');
 * ```
 */
declare class Bucket extends ServiceObject<Bucket, BucketMetadata> {
    name: string;
    /**
     * A reference to the {@link Storage} associated with this {@link Bucket}
     * instance.
     * @name Bucket#storage
     * @type {Storage}
     */
    storage: Storage;
    /**
     * A user project to apply to each request from this bucket.
     * @name Bucket#userProject
     * @type {string}
     */
    userProject?: string;
    acl: Acl;
    iam: Iam;
    crc32cGenerator: CRC32CValidatorGenerator;
    getFilesStream(query?: GetFilesOptions): Readable;
    signer?: URLSigner;
    private instanceRetryValue?;
    instancePreconditionOpts?: PreconditionOptions;
    constructor(storage: Storage, name: string, options?: BucketOptions);
    /**
     * The bucket's Cloud Storage URI (`gs://`)
     *
     * @example
     * ```ts
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     *
     * // `gs://my-bucket`
     * const href = bucket.cloudStorageURI.href;
     * ```
     */
    get cloudStorageURI(): URL;
    addLifecycleRule(rule: LifecycleRule | LifecycleRule[], options?: AddLifecycleRuleOptions): Promise<SetBucketMetadataResponse>;
    addLifecycleRule(rule: LifecycleRule | LifecycleRule[], options: AddLifecycleRuleOptions, callback: SetBucketMetadataCallback): void;
    addLifecycleRule(rule: LifecycleRule | LifecycleRule[], callback: SetBucketMetadataCallback): void;
    combine(sources: string[] | File[], destination: string | File, options?: CombineOptions): Promise<CombineResponse>;
    combine(sources: string[] | File[], destination: string | File, options: CombineOptions, callback: CombineCallback): void;
    combine(sources: string[] | File[], destination: string | File, callback: CombineCallback): void;
    createChannel(id: string, config: CreateChannelConfig, options?: CreateChannelOptions): Promise<CreateChannelResponse>;
    createChannel(id: string, config: CreateChannelConfig, callback: CreateChannelCallback): void;
    createChannel(id: string, config: CreateChannelConfig, options: CreateChannelOptions, callback: CreateChannelCallback): void;
    createNotification(topic: string, options?: CreateNotificationOptions): Promise<CreateNotificationResponse>;
    createNotification(topic: string, options: CreateNotificationOptions, callback: CreateNotificationCallback): void;
    createNotification(topic: string, callback: CreateNotificationCallback): void;
    deleteFiles(query?: DeleteFilesOptions): Promise<void>;
    deleteFiles(callback: DeleteFilesCallback): void;
    deleteFiles(query: DeleteFilesOptions, callback: DeleteFilesCallback): void;
    deleteLabels(labels?: string | string[]): Promise<DeleteLabelsResponse>;
    deleteLabels(options: DeleteLabelsOptions): Promise<DeleteLabelsResponse>;
    deleteLabels(callback: DeleteLabelsCallback): void;
    deleteLabels(labels: string | string[], options: DeleteLabelsOptions): Promise<DeleteLabelsResponse>;
    deleteLabels(labels: string | string[], callback: DeleteLabelsCallback): void;
    deleteLabels(labels: string | string[], options: DeleteLabelsOptions, callback: DeleteLabelsCallback): void;
    disableRequesterPays(options?: DisableRequesterPaysOptions): Promise<DisableRequesterPaysResponse>;
    disableRequesterPays(callback: DisableRequesterPaysCallback): void;
    disableRequesterPays(options: DisableRequesterPaysOptions, callback: DisableRequesterPaysCallback): void;
    enableLogging(config: EnableLoggingOptions): Promise<SetBucketMetadataResponse>;
    enableLogging(config: EnableLoggingOptions, callback: SetBucketMetadataCallback): void;
    enableRequesterPays(options?: EnableRequesterPaysOptions): Promise<EnableRequesterPaysResponse>;
    enableRequesterPays(callback: EnableRequesterPaysCallback): void;
    enableRequesterPays(options: EnableRequesterPaysOptions, callback: EnableRequesterPaysCallback): void;
    /**
     * Create a {@link File} object. See {@link File} to see how to handle
     * the different use cases you may have.
     *
     * @param {string} name The name of the file in this bucket.
     * @param {FileOptions} [options] Configuration options.
     * @param {string|number} [options.generation] Only use a specific revision of
     *     this file.
     * @param {string} [options.encryptionKey] A custom encryption key. See
     *     {@link https://cloud.google.com/storage/docs/encryption#customer-supplied| Customer-supplied Encryption Keys}.
     * @param {string} [options.kmsKeyName] The name of the Cloud KMS key that will
     *     be used to encrypt the object. Must be in the format:
     *     `projects/my-project/locations/location/keyRings/my-kr/cryptoKeys/my-key`.
     *     KMS key ring must use the same location as the bucket.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for all requests made from File object.
     * @returns {File}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     * const file = bucket.file('my-existing-file.png');
     * ```
     */
    file(name: string, options?: FileOptions): File;
    getFiles(query?: GetFilesOptions): Promise<GetFilesResponse>;
    getFiles(query: GetFilesOptions, callback: GetFilesCallback): void;
    getFiles(callback: GetFilesCallback): void;
    getLabels(options?: GetLabelsOptions): Promise<GetLabelsResponse>;
    getLabels(callback: GetLabelsCallback): void;
    getLabels(options: GetLabelsOptions, callback: GetLabelsCallback): void;
    getNotifications(options?: GetNotificationsOptions): Promise<GetNotificationsResponse>;
    getNotifications(callback: GetNotificationsCallback): void;
    getNotifications(options: GetNotificationsOptions, callback: GetNotificationsCallback): void;
    getSignedUrl(cfg: GetBucketSignedUrlConfig): Promise<GetSignedUrlResponse>;
    getSignedUrl(cfg: GetBucketSignedUrlConfig, callback: GetSignedUrlCallback): void;
    lock(metageneration: number | string): Promise<BucketLockResponse>;
    lock(metageneration: number | string, callback: BucketLockCallback): void;
    makePrivate(options?: MakeBucketPrivateOptions): Promise<MakeBucketPrivateResponse>;
    makePrivate(callback: MakeBucketPrivateCallback): void;
    makePrivate(options: MakeBucketPrivateOptions, callback: MakeBucketPrivateCallback): void;
    makePublic(options?: MakeBucketPublicOptions): Promise<MakeBucketPublicResponse>;
    makePublic(callback: MakeBucketPublicCallback): void;
    makePublic(options: MakeBucketPublicOptions, callback: MakeBucketPublicCallback): void;
    /**
     * Get a reference to a Cloud Pub/Sub Notification.
     *
     * @param {string} id ID of notification.
     * @returns {Notification}
     * @see Notification
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * const notification = bucket.notification('1');
     * ```
     */
    notification(id: string): Notification;
    removeRetentionPeriod(options?: SetBucketMetadataOptions): Promise<SetBucketMetadataResponse>;
    removeRetentionPeriod(callback: SetBucketMetadataCallback): void;
    removeRetentionPeriod(options: SetBucketMetadataOptions, callback: SetBucketMetadataCallback): void;
    request(reqOpts: DecorateRequestOptions): Promise<RequestResponse>;
    request(reqOpts: DecorateRequestOptions, callback: BodyResponseCallback): void;
    setLabels(labels: Labels, options?: SetLabelsOptions): Promise<SetLabelsResponse>;
    setLabels(labels: Labels, callback: SetLabelsCallback): void;
    setLabels(labels: Labels, options: SetLabelsOptions, callback: SetLabelsCallback): void;
    setMetadata(metadata: BucketMetadata, options?: SetMetadataOptions): Promise<SetMetadataResponse<BucketMetadata>>;
    setMetadata(metadata: BucketMetadata, callback: MetadataCallback<BucketMetadata>): void;
    setMetadata(metadata: BucketMetadata, options: SetMetadataOptions, callback: MetadataCallback<BucketMetadata>): void;
    setRetentionPeriod(duration: number, options?: SetBucketMetadataOptions): Promise<SetBucketMetadataResponse>;
    setRetentionPeriod(duration: number, callback: SetBucketMetadataCallback): void;
    setRetentionPeriod(duration: number, options: SetBucketMetadataOptions, callback: SetBucketMetadataCallback): void;
    setCorsConfiguration(corsConfiguration: Cors[], options?: SetBucketMetadataOptions): Promise<SetBucketMetadataResponse>;
    setCorsConfiguration(corsConfiguration: Cors[], callback: SetBucketMetadataCallback): void;
    setCorsConfiguration(corsConfiguration: Cors[], options: SetBucketMetadataOptions, callback: SetBucketMetadataCallback): void;
    setStorageClass(storageClass: string, options?: SetBucketStorageClassOptions): Promise<SetBucketMetadataResponse>;
    setStorageClass(storageClass: string, callback: SetBucketStorageClassCallback): void;
    setStorageClass(storageClass: string, options: SetBucketStorageClassOptions, callback: SetBucketStorageClassCallback): void;
    /**
     * Set a user project to be billed for all requests made from this Bucket
     * object and any files referenced from this Bucket object.
     *
     * @param {string} userProject The user project.
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     *
     * bucket.setUserProject('grape-spaceship-123');
     * ```
     */
    setUserProject(userProject: string): void;
    upload(pathString: string, options?: UploadOptions): Promise<UploadResponse>;
    upload(pathString: string, options: UploadOptions, callback: UploadCallback): void;
    upload(pathString: string, callback: UploadCallback): void;
    makeAllFilesPublicPrivate_(options?: MakeAllFilesPublicPrivateOptions): Promise<MakeAllFilesPublicPrivateResponse>;
    makeAllFilesPublicPrivate_(callback: MakeAllFilesPublicPrivateCallback): void;
    makeAllFilesPublicPrivate_(options: MakeAllFilesPublicPrivateOptions, callback: MakeAllFilesPublicPrivateCallback): void;
    getId(): string;
    disableAutoRetryConditionallyIdempotent_(coreOpts: any, methodType: AvailableServiceObjectMethods, localPreconditionOptions?: PreconditionOptions): void;
}
/**
 * Reference to the {@link Bucket} class.
 * @name module:@google-cloud/storage.Bucket
 * @see Bucket
 */
export { Bucket };
