import { BodyResponseCallback, DecorateRequestOptions, GetConfig, MetadataCallback, ServiceObject, SetMetadataResponse } from './nodejs-common/index.js';
import * as resumableUpload from './resumable-upload.js';
import { Writable, Readable, PipelineSource } from 'stream';
import * as http from 'http';
import { PreconditionOptions, Storage } from './storage.js';
import { AvailableServiceObjectMethods, Bucket } from './bucket.js';
import { Acl, AclMetadata } from './acl.js';
import { GetSignedUrlResponse, GetSignedUrlCallback, URLSigner, SignerGetSignedUrlConfig, Query } from './signer.js';
import { Duplexify, GCCL_GCS_CMD_KEY } from './nodejs-common/util.js';
import { CRC32C, CRC32CValidatorGenerator } from './crc32c.js';
import { URL } from 'url';
import { BaseMetadata, DeleteCallback, DeleteOptions, GetResponse, InstanceResponseCallback, RequestResponse, SetMetadataOptions } from './nodejs-common/service-object.js';
import * as r from 'teeny-request';
export type GetExpirationDateResponse = [Date];
export interface GetExpirationDateCallback {
    (err: Error | null, expirationDate?: Date | null, apiResponse?: unknown): void;
}
export interface PolicyDocument {
    string: string;
    base64: string;
    signature: string;
}
export type SaveData = string | Buffer | Uint8Array | PipelineSource<string | Buffer | Uint8Array>;
export type GenerateSignedPostPolicyV2Response = [PolicyDocument];
export interface GenerateSignedPostPolicyV2Callback {
    (err: Error | null, policy?: PolicyDocument): void;
}
export interface GenerateSignedPostPolicyV2Options {
    equals?: string[] | string[][];
    expires: string | number | Date;
    startsWith?: string[] | string[][];
    acl?: string;
    successRedirect?: string;
    successStatus?: string;
    contentLengthRange?: {
        min?: number;
        max?: number;
    };
    /**
     * @example
     * 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'
     */
    signingEndpoint?: string;
}
export interface PolicyFields {
    [key: string]: string;
}
export interface GenerateSignedPostPolicyV4Options {
    expires: string | number | Date;
    bucketBoundHostname?: string;
    virtualHostedStyle?: boolean;
    conditions?: object[];
    fields?: PolicyFields;
    /**
     * @example
     * 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'
     */
    signingEndpoint?: string;
}
export interface GenerateSignedPostPolicyV4Callback {
    (err: Error | null, output?: SignedPostPolicyV4Output): void;
}
export type GenerateSignedPostPolicyV4Response = [SignedPostPolicyV4Output];
export interface SignedPostPolicyV4Output {
    url: string;
    fields: PolicyFields;
}
export interface GetSignedUrlConfig extends Pick<SignerGetSignedUrlConfig, 'host' | 'signingEndpoint'> {
    action: 'read' | 'write' | 'delete' | 'resumable';
    version?: 'v2' | 'v4';
    virtualHostedStyle?: boolean;
    cname?: string;
    contentMd5?: string;
    contentType?: string;
    expires: string | number | Date;
    accessibleAt?: string | number | Date;
    extensionHeaders?: http.OutgoingHttpHeaders;
    promptSaveAs?: string;
    responseDisposition?: string;
    responseType?: string;
    queryParams?: Query;
}
export interface GetFileMetadataOptions {
    userProject?: string;
}
export type GetFileMetadataResponse = [FileMetadata, unknown];
export interface GetFileMetadataCallback {
    (err: Error | null, metadata?: FileMetadata, apiResponse?: unknown): void;
}
export interface GetFileOptions extends GetConfig {
    userProject?: string;
    generation?: number;
    restoreToken?: string;
    softDeleted?: boolean;
}
export type GetFileResponse = [File, unknown];
export interface GetFileCallback {
    (err: Error | null, file?: File, apiResponse?: unknown): void;
}
export interface FileExistsOptions {
    userProject?: string;
}
export type FileExistsResponse = [boolean];
export interface FileExistsCallback {
    (err: Error | null, exists?: boolean): void;
}
export interface DeleteFileOptions {
    ignoreNotFound?: boolean;
    userProject?: string;
}
export type DeleteFileResponse = [unknown];
export interface DeleteFileCallback {
    (err: Error | null, apiResponse?: unknown): void;
}
export type PredefinedAcl = 'authenticatedRead' | 'bucketOwnerFullControl' | 'bucketOwnerRead' | 'private' | 'projectPrivate' | 'publicRead';
type PublicResumableUploadOptions = 'chunkSize' | 'highWaterMark' | 'isPartialUpload' | 'metadata' | 'origin' | 'offset' | 'predefinedAcl' | 'private' | 'public' | 'uri' | 'userProject';
export interface CreateResumableUploadOptions extends Pick<resumableUpload.UploadConfig, PublicResumableUploadOptions> {
    /**
     * A CRC32C to resume from when continuing a previous upload. It is recommended
     * to capture the `crc32c` event from previous upload sessions to provide in
     * subsequent requests in order to accurately track the upload. This is **required**
     * when validating a final portion of the uploaded object.
     *
     * @see {@link CRC32C.from} for possible values.
     */
    resumeCRC32C?: Parameters<(typeof CRC32C)['from']>[0];
    preconditionOpts?: PreconditionOptions;
    [GCCL_GCS_CMD_KEY]?: resumableUpload.UploadConfig[typeof GCCL_GCS_CMD_KEY];
}
export type CreateResumableUploadResponse = [string];
export interface CreateResumableUploadCallback {
    (err: Error | null, uri?: string): void;
}
export interface CreateWriteStreamOptions extends CreateResumableUploadOptions {
    contentType?: string;
    gzip?: string | boolean;
    resumable?: boolean;
    timeout?: number;
    validation?: string | boolean;
}
export interface MakeFilePrivateOptions {
    metadata?: FileMetadata;
    strict?: boolean;
    userProject?: string;
    preconditionOpts?: PreconditionOptions;
}
export type MakeFilePrivateResponse = [unknown];
export type MakeFilePrivateCallback = SetFileMetadataCallback;
export interface IsPublicCallback {
    (err: Error | null, resp?: boolean): void;
}
export type IsPublicResponse = [boolean];
export type MakeFilePublicResponse = [unknown];
export interface MakeFilePublicCallback {
    (err?: Error | null, apiResponse?: unknown): void;
}
export type MoveResponse = [unknown];
export interface MoveCallback {
    (err: Error | null, destinationFile?: File | null, apiResponse?: unknown): void;
}
export interface MoveOptions {
    userProject?: string;
    preconditionOpts?: PreconditionOptions;
}
export type MoveFileAtomicOptions = MoveOptions;
export type MoveFileAtomicCallback = MoveCallback;
export type MoveFileAtomicResponse = MoveResponse;
export type RenameOptions = MoveOptions;
export type RenameResponse = MoveResponse;
export type RenameCallback = MoveCallback;
export type RotateEncryptionKeyOptions = string | Buffer | EncryptionKeyOptions;
export interface EncryptionKeyOptions {
    encryptionKey?: string | Buffer;
    kmsKeyName?: string;
    preconditionOpts?: PreconditionOptions;
}
export type RotateEncryptionKeyCallback = CopyCallback;
export type RotateEncryptionKeyResponse = CopyResponse;
export declare enum ActionToHTTPMethod {
    read = "GET",
    write = "PUT",
    delete = "DELETE",
    resumable = "POST"
}
/**
 * @deprecated - no longer used
 */
export declare const STORAGE_POST_POLICY_BASE_URL = "https://storage.googleapis.com";
export interface FileOptions {
    crc32cGenerator?: CRC32CValidatorGenerator;
    encryptionKey?: string | Buffer;
    generation?: number | string;
    restoreToken?: string;
    kmsKeyName?: string;
    preconditionOpts?: PreconditionOptions;
    userProject?: string;
}
export interface CopyOptions {
    cacheControl?: string;
    contentEncoding?: string;
    contentType?: string;
    contentDisposition?: string;
    destinationKmsKeyName?: string;
    metadata?: {
        [key: string]: string | boolean | number | null;
    };
    predefinedAcl?: string;
    token?: string;
    userProject?: string;
    preconditionOpts?: PreconditionOptions;
}
export type CopyResponse = [File, unknown];
export interface CopyCallback {
    (err: Error | null, file?: File | null, apiResponse?: unknown): void;
}
export type DownloadResponse = [Buffer];
export type DownloadCallback = (err: RequestError | null, contents: Buffer) => void;
export interface DownloadOptions extends CreateReadStreamOptions {
    destination?: string;
    encryptionKey?: string | Buffer;
}
export interface CreateReadStreamOptions {
    userProject?: string;
    validation?: 'md5' | 'crc32c' | false | true;
    start?: number;
    end?: number;
    decompress?: boolean;
    [GCCL_GCS_CMD_KEY]?: string;
}
export interface SaveOptions extends CreateWriteStreamOptions {
    onUploadProgress?: (progressEvent: any) => void;
}
export interface SaveCallback {
    (err?: Error | null): void;
}
export interface SetFileMetadataOptions {
    userProject?: string;
}
export interface SetFileMetadataCallback {
    (err?: Error | null, apiResponse?: unknown): void;
}
export type SetFileMetadataResponse = [unknown];
export type SetStorageClassResponse = [unknown];
export interface SetStorageClassOptions {
    userProject?: string;
    preconditionOpts?: PreconditionOptions;
}
export interface SetStorageClassCallback {
    (err?: Error | null, apiResponse?: unknown): void;
}
export interface RestoreOptions extends PreconditionOptions {
    generation: number;
    restoreToken?: string;
    projection?: 'full' | 'noAcl';
}
export interface FileMetadata extends BaseMetadata {
    acl?: AclMetadata[] | null;
    bucket?: string;
    cacheControl?: string;
    componentCount?: number;
    contentDisposition?: string;
    contentEncoding?: string;
    contentLanguage?: string;
    contentType?: string;
    crc32c?: string;
    customerEncryption?: {
        encryptionAlgorithm?: string;
        keySha256?: string;
    };
    customTime?: string;
    eventBasedHold?: boolean | null;
    readonly eventBasedHoldReleaseTime?: string;
    generation?: string | number;
    restoreToken?: string;
    hardDeleteTime?: string;
    kmsKeyName?: string;
    md5Hash?: string;
    mediaLink?: string;
    metadata?: {
        [key: string]: string | boolean | number | null;
    };
    metageneration?: string | number;
    name?: string;
    owner?: {
        entity?: string;
        entityId?: string;
    };
    retention?: {
        retainUntilTime?: string;
        mode?: string;
    } | null;
    retentionExpirationTime?: string;
    size?: string | number;
    softDeleteTime?: string;
    storageClass?: string;
    temporaryHold?: boolean | null;
    timeCreated?: string;
    timeDeleted?: string;
    timeStorageClassUpdated?: string;
    updated?: string;
}
export declare class RequestError extends Error {
    code?: string;
    errors?: Error[];
}
export declare enum FileExceptionMessages {
    EXPIRATION_TIME_NA = "An expiration time is not available.",
    DESTINATION_NO_NAME = "Destination file should have a name.",
    INVALID_VALIDATION_FILE_RANGE = "Cannot use validation with file ranges (start/end).",
    MD5_NOT_AVAILABLE = "MD5 verification was specified, but is not available for the requested object. MD5 is not available for composite objects.",
    EQUALS_CONDITION_TWO_ELEMENTS = "Equals condition must be an array of 2 elements.",
    STARTS_WITH_TWO_ELEMENTS = "StartsWith condition must be an array of 2 elements.",
    CONTENT_LENGTH_RANGE_MIN_MAX = "ContentLengthRange must have numeric min & max fields.",
    DOWNLOAD_MISMATCH = "The downloaded data did not match the data from the server. To be sure the content is the same, you should download the file again.",
    UPLOAD_MISMATCH_DELETE_FAIL = "The uploaded data did not match the data from the server.\n    As a precaution, we attempted to delete the file, but it was not successful.\n    To be sure the content is the same, you should try removing the file manually,\n    then uploading the file again.\n    \n\nThe delete attempt failed with this message:\n\n  ",
    UPLOAD_MISMATCH = "The uploaded data did not match the data from the server.\n    As a precaution, the file has been deleted.\n    To be sure the content is the same, you should try uploading the file again.",
    MD5_RESUMED_UPLOAD = "MD5 cannot be used with a continued resumable upload as MD5 cannot be extended from an existing value",
    MISSING_RESUME_CRC32C_FINAL_UPLOAD = "The CRC32C is missing for the final portion of a resumed upload, which is required for validation. Please provide `resumeCRC32C` if validation is required, or disable `validation`."
}
/**
 * A File object is created from your {@link Bucket} object using
 * {@link Bucket#file}.
 *
 * @class
 */
declare class File extends ServiceObject<File, FileMetadata> {
    #private;
    acl: Acl;
    crc32cGenerator: CRC32CValidatorGenerator;
    bucket: Bucket;
    storage: Storage;
    kmsKeyName?: string;
    userProject?: string;
    signer?: URLSigner;
    name: string;
    generation?: number;
    restoreToken?: string;
    parent: Bucket;
    private encryptionKey?;
    private encryptionKeyBase64?;
    private encryptionKeyHash?;
    private encryptionKeyInterceptor?;
    private instanceRetryValue?;
    instancePreconditionOpts?: PreconditionOptions;
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
     * The `acl` object on a File instance provides methods to get you a list of
     * the ACLs defined on your bucket, as well as set, update, and delete them.
     *
     * See {@link http://goo.gl/6qBBPO| About Access Control lists}
     *
     * @name File#acl
     * @mixes Acl
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     * //-
     * // Make a file publicly readable.
     * //-
     * const options = {
     *   entity: 'allUsers',
     *   role: storage.acl.READER_ROLE
     * };
     *
     * file.acl.add(options, function(err, aclObject) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * file.acl.add(options).then(function(data) {
     *   const aclObject = data[0];
     *   const apiResponse = data[1];
     * });
     * ```
     */
    /**
     * The API-formatted resource description of the file.
     *
     * Note: This is not guaranteed to be up-to-date when accessed. To get the
     * latest record, call the `getMetadata()` method.
     *
     * @name File#metadata
     * @type {object}
     */
    /**
     * The file's name.
     * @name File#name
     * @type {string}
     */
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
     * @typedef {object} FileOptions Options passed to the File constructor.
     * @property {string} [encryptionKey] A custom encryption key.
     * @property {number} [generation] Generation to scope the file to.
     * @property {string} [kmsKeyName] Cloud KMS Key used to encrypt this
     *     object, if the object is encrypted by such a key. Limited availability;
     *     usable only by enabled projects.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for all requests made from File object.
     * @property {Crc32cGeneratorCallback} [callback] A function that generates a CRC32C Validator. Defaults to {@link CRC32C}
     */
    /**
     * Constructs a file object.
     *
     * @param {Bucket} bucket The Bucket instance this file is
     *     attached to.
     * @param {string} name The name of the remote file.
     * @param {FileOptions} [options] Configuration options.
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     * ```
     */
    constructor(bucket: Bucket, name: string, options?: FileOptions);
    /**
     * The object's Cloud Storage URI (`gs://`)
     *
     * @example
     * ```ts
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * const file = bucket.file('image.png');
     *
     * // `gs://my-bucket/image.png`
     * const href = file.cloudStorageURI.href;
     * ```
     */
    get cloudStorageURI(): URL;
    /**
     * A helper method for determining if a request should be retried based on preconditions.
     * This should only be used for methods where the idempotency is determined by
     * `ifGenerationMatch`
     * @private
     *
     * A request should not be retried under the following conditions:
     * - if precondition option `ifGenerationMatch` is not set OR
     * - if `idempotencyStrategy` is set to `RetryNever`
     */
    private shouldRetryBasedOnPreconditionAndIdempotencyStrat;
    copy(destination: string | Bucket | File, options?: CopyOptions): Promise<CopyResponse>;
    copy(destination: string | Bucket | File, callback: CopyCallback): void;
    copy(destination: string | Bucket | File, options: CopyOptions, callback: CopyCallback): void;
    /**
     * @typedef {object} CreateReadStreamOptions Configuration options for File#createReadStream.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     * @property {string|boolean} [validation] Possible values: `"md5"`,
     *     `"crc32c"`, or `false`. By default, data integrity is validated with a
     *     CRC32c checksum. You may use MD5 if preferred, but that hash is not
     *     supported for composite objects. An error will be raised if MD5 is
     *     specified but is not available. You may also choose to skip validation
     *     completely, however this is **not recommended**.
     * @property {number} [start] A byte offset to begin the file's download
     *     from. Default is 0. NOTE: Byte ranges are inclusive; that is,
     *     `options.start = 0` and `options.end = 999` represent the first 1000
     *     bytes in a file or object. NOTE: when specifying a byte range, data
     *     integrity is not available.
     * @property {number} [end] A byte offset to stop reading the file at.
     *     NOTE: Byte ranges are inclusive; that is, `options.start = 0` and
     *     `options.end = 999` represent the first 1000 bytes in a file or object.
     *     NOTE: when specifying a byte range, data integrity is not available.
     * @property {boolean} [decompress=true] Disable auto decompression of the
     *     received data. By default this option is set to `true`.
     *     Applicable in cases where the data was uploaded with
     *     `gzip: true` option. See {@link File#createWriteStream}.
     */
    /**
     * Create a readable stream to read the contents of the remote file. It can be
     * piped to a writable stream or listened to for 'data' events to read a
     * file's contents.
     *
     * In the unlikely event there is a mismatch between what you downloaded and
     * the version in your Bucket, your error handler will receive an error with
     * code "CONTENT_DOWNLOAD_MISMATCH". If you receive this error, the best
     * recourse is to try downloading the file again.
     *
     * NOTE: Readable streams will emit the `end` event when the file is fully
     * downloaded.
     *
     * @param {CreateReadStreamOptions} [options] Configuration options.
     * @returns {ReadableStream}
     *
     * @example
     * ```
     * //-
     * // <h4>Downloading a File</h4>
     * //
     * // The example below demonstrates how we can reference a remote file, then
     * // pipe its contents to a local file. This is effectively creating a local
     * // backup of your remote data.
     * //-
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     *
     * const fs = require('fs');
     * const remoteFile = bucket.file('image.png');
     * const localFilename = '/Users/stephen/Photos/image.png';
     *
     * remoteFile.createReadStream()
     *   .on('error', function(err) {})
     *   .on('response', function(response) {
     *     // Server connected and responded with the specified status and headers.
     *    })
     *   .on('end', function() {
     *     // The file is fully downloaded.
     *   })
     *   .pipe(fs.createWriteStream(localFilename));
     *
     * //-
     * // To limit the downloaded data to only a byte range, pass an options
     * // object.
     * //-
     * const logFile = myBucket.file('access_log');
     * logFile.createReadStream({
     *     start: 10000,
     *     end: 20000
     *   })
     *   .on('error', function(err) {})
     *   .pipe(fs.createWriteStream('/Users/stephen/logfile.txt'));
     *
     * //-
     * // To read a tail byte range, specify only `options.end` as a negative
     * // number.
     * //-
     * const logFile = myBucket.file('access_log');
     * logFile.createReadStream({
     *     end: -100
     *   })
     *   .on('error', function(err) {})
     *   .pipe(fs.createWriteStream('/Users/stephen/logfile.txt'));
     * ```
     */
    createReadStream(options?: CreateReadStreamOptions): Readable;
    createResumableUpload(options?: CreateResumableUploadOptions): Promise<CreateResumableUploadResponse>;
    createResumableUpload(options: CreateResumableUploadOptions, callback: CreateResumableUploadCallback): void;
    createResumableUpload(callback: CreateResumableUploadCallback): void;
    /**
     * @typedef {object} CreateWriteStreamOptions Configuration options for File#createWriteStream().
     * @property {string} [contentType] Alias for
     *     `options.metadata.contentType`. If set to `auto`, the file name is used
     *     to determine the contentType.
     * @property {string|boolean} [gzip] If true, automatically gzip the file.
     *     If set to `auto`, the contentType is used to determine if the file
     * should be gzipped. This will set `options.metadata.contentEncoding` to
     * `gzip` if necessary.
     * @property {object} [metadata] See the examples below or
     *     {@link https://cloud.google.com/storage/docs/json_api/v1/objects/insert#request_properties_JSON| Objects: insert request body}
     *     for more details.
     * @property {number} [offset] The starting byte of the upload stream, for
     *     resuming an interrupted upload. Defaults to 0.
     * @property {string} [predefinedAcl] Apply a predefined set of access
     * controls to this object.
     *
     * Acceptable values are:
     * - **`authenticatedRead`** - Object owner gets `OWNER` access, and
     *   `allAuthenticatedUsers` get `READER` access.
     *
     * - **`bucketOwnerFullControl`** - Object owner gets `OWNER` access, and
     *   project team owners get `OWNER` access.
     *
     * - **`bucketOwnerRead`** - Object owner gets `OWNER` access, and project
     *   team owners get `READER` access.
     *
     * - **`private`** - Object owner gets `OWNER` access.
     *
     * - **`projectPrivate`** - Object owner gets `OWNER` access, and project
     *   team members get access according to their roles.
     *
     * - **`publicRead`** - Object owner gets `OWNER` access, and `allUsers`
     *   get `READER` access.
     * @property {boolean} [private] Make the uploaded file private. (Alias for
     *     `options.predefinedAcl = 'private'`)
     * @property {boolean} [public] Make the uploaded file public. (Alias for
     *     `options.predefinedAcl = 'publicRead'`)
     * @property {boolean} [resumable] Force a resumable upload. NOTE: When
     *     working with streams, the file format and size is unknown until it's
     *     completely consumed. Because of this, it's best for you to be explicit
     *     for what makes sense given your input.
     * @property {number} [timeout=60000] Set the HTTP request timeout in
     *     milliseconds. This option is not available for resumable uploads.
     *     Default: `60000`
     * @property {string} [uri] The URI for an already-created resumable
     *     upload. See {@link File#createResumableUpload}.
     * @property {string} [userProject] The ID of the project which will be
     *     billed for the request.
     * @property {string|boolean} [validation] Possible values: `"md5"`,
     *     `"crc32c"`, or `false`. By default, data integrity is validated with a
     *     CRC32c checksum. You may use MD5 if preferred, but that hash is not
     *     supported for composite objects. An error will be raised if MD5 is
     *     specified but is not available. You may also choose to skip validation
     *     completely, however this is **not recommended**. In addition to specifying
     *     validation type, providing `metadata.crc32c` or `metadata.md5Hash` will
     *     cause the server to perform validation in addition to client validation.
     *     NOTE: Validation is automatically skipped for objects that were
     *     uploaded using the `gzip` option and have already compressed content.
     */
    /**
     * Create a writable stream to overwrite the contents of the file in your
     * bucket.
     *
     * A File object can also be used to create files for the first time.
     *
     * Resumable uploads are automatically enabled and must be shut off explicitly
     * by setting `options.resumable` to `false`.
     *
     *
     * <p class="notice">
     *   There is some overhead when using a resumable upload that can cause
     *   noticeable performance degradation while uploading a series of small
     *   files. When uploading files less than 10MB, it is recommended that the
     *   resumable feature is disabled.
     * </p>
     *
     * NOTE: Writable streams will emit the `finish` event when the file is fully
     * uploaded.
     *
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/how-tos/upload Upload Options (Simple or Resumable)}
     * See {@link https://cloud.google.com/storage/docs/json_api/v1/objects/insert Objects: insert API Documentation}
     *
     * @param {CreateWriteStreamOptions} [options] Configuration options.
     * @returns {WritableStream}
     *
     * @example
     * ```
     * const fs = require('fs');
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const file = myBucket.file('my-file');
     *
     * //-
     * // <h4>Uploading a File</h4>
     * //
     * // Now, consider a case where we want to upload a file to your bucket. You
     * // have the option of using {@link Bucket#upload}, but that is just
     * // a convenience method which will do the following.
     * //-
     * fs.createReadStream('/Users/stephen/Photos/birthday-at-the-zoo/panda.jpg')
     *   .pipe(file.createWriteStream())
     *   .on('error', function(err) {})
     *   .on('finish', function() {
     *     // The file upload is complete.
     *   });
     *
     * //-
     * // <h4>Uploading a File with gzip compression</h4>
     * //-
     * fs.createReadStream('/Users/stephen/site/index.html')
     *   .pipe(file.createWriteStream({ gzip: true }))
     *   .on('error', function(err) {})
     *   .on('finish', function() {
     *     // The file upload is complete.
     *   });
     *
     * //-
     * // Downloading the file with `createReadStream` will automatically decode
     * // the file.
     * //-
     *
     * //-
     * // <h4>Uploading a File with Metadata</h4>
     * //
     * // One last case you may run into is when you want to upload a file to your
     * // bucket and set its metadata at the same time. Like above, you can use
     * // {@link Bucket#upload} to do this, which is just a wrapper around
     * // the following.
     * //-
     * fs.createReadStream('/Users/stephen/Photos/birthday-at-the-zoo/panda.jpg')
     *   .pipe(file.createWriteStream({
     *     metadata: {
     *       contentType: 'image/jpeg',
     *       metadata: {
     *         custom: 'metadata'
     *       }
     *     }
     *   }))
     *   .on('error', function(err) {})
     *   .on('finish', function() {
     *     // The file upload is complete.
     *   });
     * ```
     *
     * //-
     * // <h4>Continuing a Resumable Upload</h4>
     * //
     * // One can capture a `uri` from a resumable upload to reuse later.
     * // Additionally, for validation, one can also capture and pass `crc32c`.
     * //-
     * let uri: string | undefined = undefined;
     * let resumeCRC32C: string | undefined = undefined;
     *
     * fs.createWriteStream()
     *   .on('uri', link => {uri = link})
     *   .on('crc32', crc32c => {resumeCRC32C = crc32c});
     *
     * // later...
     * fs.createWriteStream({uri, resumeCRC32C});
     */
    createWriteStream(options?: CreateWriteStreamOptions): Writable;
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
    download(options?: DownloadOptions): Promise<DownloadResponse>;
    download(options: DownloadOptions, callback: DownloadCallback): void;
    download(callback: DownloadCallback): void;
    /**
     * The Storage API allows you to use a custom key for server-side encryption.
     *
     * See {@link https://cloud.google.com/storage/docs/encryption#customer-supplied| Customer-supplied Encryption Keys}
     *
     * @param {string|buffer} encryptionKey An AES-256 encryption key.
     * @returns {File}
     *
     * @example
     * ```
     * const crypto = require('crypto');
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const myBucket = storage.bucket('my-bucket');
     *
     * const encryptionKey = crypto.randomBytes(32);
     *
     * const fileWithCustomEncryption = myBucket.file('my-file');
     * fileWithCustomEncryption.setEncryptionKey(encryptionKey);
     *
     * const fileWithoutCustomEncryption = myBucket.file('my-file');
     *
     * fileWithCustomEncryption.save('data', function(err) {
     *   // Try to download with the File object that hasn't had
     *   // `setEncryptionKey()` called:
     *   fileWithoutCustomEncryption.download(function(err) {
     *     // We will receive an error:
     *     //   err.message === 'Bad Request'
     *
     *     // Try again with the File object we called `setEncryptionKey()` on:
     *     fileWithCustomEncryption.download(function(err, contents) {
     *       // contents.toString() === 'data'
     *     });
     *   });
     * });
     *
     * ```
     * @example <caption>include:samples/encryption.js</caption>
     * region_tag:storage_upload_encrypted_file
     * Example of uploading an encrypted file:
     *
     * @example <caption>include:samples/encryption.js</caption>
     * region_tag:storage_download_encrypted_file
     * Example of downloading an encrypted file:
     */
    setEncryptionKey(encryptionKey: string | Buffer): this;
    /**
     * Gets a reference to a Cloud Storage {@link File} file from the provided URL in string format.
     * @param {string} publicUrlOrGsUrl the URL as a string. Must be of the format gs://bucket/file
     *  or https://storage.googleapis.com/bucket/file.
     * @param {Storage} storageInstance an instance of a Storage object.
     * @param {FileOptions} [options] Configuration options
     * @returns {File}
     */
    static from(publicUrlOrGsUrl: string, storageInstance: Storage, options?: FileOptions): File;
    get(options?: GetFileOptions): Promise<GetResponse<File>>;
    get(callback: InstanceResponseCallback<File>): void;
    get(options: GetFileOptions, callback: InstanceResponseCallback<File>): void;
    getExpirationDate(): Promise<GetExpirationDateResponse>;
    getExpirationDate(callback: GetExpirationDateCallback): void;
    generateSignedPostPolicyV2(options: GenerateSignedPostPolicyV2Options): Promise<GenerateSignedPostPolicyV2Response>;
    generateSignedPostPolicyV2(options: GenerateSignedPostPolicyV2Options, callback: GenerateSignedPostPolicyV2Callback): void;
    generateSignedPostPolicyV2(callback: GenerateSignedPostPolicyV2Callback): void;
    generateSignedPostPolicyV4(options: GenerateSignedPostPolicyV4Options): Promise<GenerateSignedPostPolicyV4Response>;
    generateSignedPostPolicyV4(options: GenerateSignedPostPolicyV4Options, callback: GenerateSignedPostPolicyV4Callback): void;
    generateSignedPostPolicyV4(callback: GenerateSignedPostPolicyV4Callback): void;
    getSignedUrl(cfg: GetSignedUrlConfig): Promise<GetSignedUrlResponse>;
    getSignedUrl(cfg: GetSignedUrlConfig, callback: GetSignedUrlCallback): void;
    isPublic(): Promise<IsPublicResponse>;
    isPublic(callback: IsPublicCallback): void;
    makePrivate(options?: MakeFilePrivateOptions): Promise<MakeFilePrivateResponse>;
    makePrivate(callback: MakeFilePrivateCallback): void;
    makePrivate(options: MakeFilePrivateOptions, callback: MakeFilePrivateCallback): void;
    makePublic(): Promise<MakeFilePublicResponse>;
    makePublic(callback: MakeFilePublicCallback): void;
    /**
     * The public URL of this File
     * Use {@link File#makePublic} to enable anonymous access via the returned URL.
     *
     * @returns {string}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     * const file = bucket.file('my-file');
     *
     * // publicUrl will be "https://storage.googleapis.com/albums/my-file"
     * const publicUrl = file.publicUrl();
     * ```
     */
    publicUrl(): string;
    moveFileAtomic(destination: string | File, options?: MoveFileAtomicOptions): Promise<MoveFileAtomicResponse>;
    moveFileAtomic(destination: string | File, callback: MoveFileAtomicCallback): void;
    moveFileAtomic(destination: string | File, options: MoveFileAtomicOptions, callback: MoveFileAtomicCallback): void;
    move(destination: string | Bucket | File, options?: MoveOptions): Promise<MoveResponse>;
    move(destination: string | Bucket | File, callback: MoveCallback): void;
    move(destination: string | Bucket | File, options: MoveOptions, callback: MoveCallback): void;
    rename(destinationFile: string | File, options?: RenameOptions): Promise<RenameResponse>;
    rename(destinationFile: string | File, callback: RenameCallback): void;
    rename(destinationFile: string | File, options: RenameOptions, callback: RenameCallback): void;
    /**
     * @typedef {object} RestoreOptions Options for File#restore(). See an
     *     {@link https://cloud.google.com/storage/docs/json_api/v1/objects#resource| Object resource}.
     * @param {string} [userProject] The ID of the project which will be
     *     billed for the request.
     * @param {number} [generation] If present, selects a specific revision of this object.
     * @param {string} [restoreToken] Returns an option that must be specified when getting a soft-deleted object from an HNS-enabled
     *  bucket that has a naming and generation conflict with another object in the same bucket.
     * @param {string} [projection] Specifies the set of properties to return. If used, must be 'full' or 'noAcl'.
     * @param {string | number} [ifGenerationMatch] Request proceeds if the generation of the target resource
     *  matches the value used in the precondition.
     *  If the values don't match, the request fails with a 412 Precondition Failed response.
     * @param {string | number} [ifGenerationNotMatch] Request proceeds if the generation of the target resource does
     *  not match the value used in the precondition. If the values match, the request fails with a 304 Not Modified response.
     * @param {string | number} [ifMetagenerationMatch] Request proceeds if the meta-generation of the target resource
     *  matches the value used in the precondition.
     *  If the values don't match, the request fails with a 412 Precondition Failed response.
     * @param {string | number} [ifMetagenerationNotMatch]  Request proceeds if the meta-generation of the target resource does
     *  not match the value used in the precondition. If the values match, the request fails with a 304 Not Modified response.
     */
    /**
     * Restores a soft-deleted file
     * @param {RestoreOptions} options Restore options.
     * @returns {Promise<File>}
     */
    restore(options: RestoreOptions): Promise<File>;
    request(reqOpts: DecorateRequestOptions): Promise<RequestResponse>;
    request(reqOpts: DecorateRequestOptions, callback: BodyResponseCallback): void;
    rotateEncryptionKey(options?: RotateEncryptionKeyOptions): Promise<RotateEncryptionKeyResponse>;
    rotateEncryptionKey(callback: RotateEncryptionKeyCallback): void;
    rotateEncryptionKey(options: RotateEncryptionKeyOptions, callback: RotateEncryptionKeyCallback): void;
    save(data: SaveData, options?: SaveOptions): Promise<void>;
    save(data: SaveData, callback: SaveCallback): void;
    save(data: SaveData, options: SaveOptions, callback: SaveCallback): void;
    setMetadata(metadata: FileMetadata, options?: SetMetadataOptions): Promise<SetMetadataResponse<FileMetadata>>;
    setMetadata(metadata: FileMetadata, callback: MetadataCallback<FileMetadata>): void;
    setMetadata(metadata: FileMetadata, options: SetMetadataOptions, callback: MetadataCallback<FileMetadata>): void;
    setStorageClass(storageClass: string, options?: SetStorageClassOptions): Promise<SetStorageClassResponse>;
    setStorageClass(storageClass: string, options: SetStorageClassOptions, callback: SetStorageClassCallback): void;
    setStorageClass(storageClass: string, callback?: SetStorageClassCallback): void;
    /**
     * Set a user project to be billed for all requests made from this File
     * object.
     *
     * @param {string} userProject The user project.
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     * const file = bucket.file('my-file');
     *
     * file.setUserProject('grape-spaceship-123');
     * ```
     */
    setUserProject(userProject: string): void;
    /**
     * This creates a resumable-upload upload stream.
     *
     * @param {Duplexify} stream - Duplexify stream of data to pipe to the file.
     * @param {object=} options - Configuration object.
     *
     * @private
     */
    startResumableUpload_(dup: Duplexify, options?: CreateResumableUploadOptions): void;
    /**
     * Takes a readable stream and pipes it to a remote file. Unlike
     * `startResumableUpload_`, which uses the resumable upload technique, this
     * method uses a simple upload (all or nothing).
     *
     * @param {Duplexify} dup - Duplexify stream of data to pipe to the file.
     * @param {object=} options - Configuration object.
     *
     * @private
     */
    startSimpleUpload_(dup: Duplexify, options?: CreateWriteStreamOptions): void;
    disableAutoRetryConditionallyIdempotent_(coreOpts: any, methodType: AvailableServiceObjectMethods, localPreconditionOptions?: PreconditionOptions): void;
    private getBufferFromReadable;
}
/**
 * Reference to the {@link File} class.
 * @name module:@google-cloud/storage.File
 * @see File
 */
export { File };
