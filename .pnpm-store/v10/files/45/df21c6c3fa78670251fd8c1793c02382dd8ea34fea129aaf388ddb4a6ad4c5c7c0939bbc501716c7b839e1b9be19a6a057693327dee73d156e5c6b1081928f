import { GaxiosOptions, GaxiosPromise, GaxiosResponse } from 'gaxios';
import { GoogleAuthOptions } from 'google-auth-library';
import { Writable, WritableOptions } from 'stream';
import { RetryOptions, PreconditionOptions } from './storage.js';
import { GCCL_GCS_CMD_KEY } from './nodejs-common/util.js';
import { FileMetadata } from './file.js';
export declare const PROTOCOL_REGEX: RegExp;
export interface ErrorWithCode extends Error {
    code: number;
    status?: number | string;
}
export type CreateUriCallback = (err: Error | null, uri?: string) => void;
export interface Encryption {
    key: {};
    hash: {};
}
export type PredefinedAcl = 'authenticatedRead' | 'bucketOwnerFullControl' | 'bucketOwnerRead' | 'private' | 'projectPrivate' | 'publicRead';
export interface QueryParameters extends PreconditionOptions {
    contentEncoding?: string;
    kmsKeyName?: string;
    predefinedAcl?: PredefinedAcl;
    projection?: 'full' | 'noAcl';
    userProject?: string;
}
export interface UploadConfig extends Pick<WritableOptions, 'highWaterMark'> {
    /**
     * The API endpoint used for the request.
     * Defaults to `storage.googleapis.com`.
     *
     * **Warning**:
     * If this value does not match the current GCP universe an emulator context
     * will be assumed and authentication will be bypassed.
     */
    apiEndpoint?: string;
    /**
     * The name of the destination bucket.
     */
    bucket: string;
    /**
     * The name of the destination file.
     */
    file: string;
    /**
     * The GoogleAuthOptions passed to google-auth-library
     */
    authConfig?: GoogleAuthOptions;
    /**
     * If you want to re-use an auth client from google-auto-auth, pass an
     * instance here.
     * Defaults to GoogleAuth and gets automatically overridden if an
     * emulator context is detected.
     */
    authClient?: {
        request: <T>(opts: GaxiosOptions) => Promise<GaxiosResponse<T>> | GaxiosPromise<T>;
    };
    /**
     * Create a separate request per chunk.
     *
     * This value is in bytes and should be a multiple of 256 KiB (2^18).
     * We recommend using at least 8 MiB for the chunk size.
     *
     * @link https://cloud.google.com/storage/docs/performing-resumable-uploads#chunked-upload
     */
    chunkSize?: number;
    /**
     * For each API request we send, you may specify custom request options that
     * we'll add onto the request. The request options follow the gaxios API:
     * https://github.com/googleapis/gaxios#request-options.
     */
    customRequestOptions?: GaxiosOptions;
    /**
     * This will cause the upload to fail if the current generation of the remote
     * object does not match the one provided here.
     */
    generation?: number;
    /**
     * Set to `true` if the upload is only a subset of the overall object to upload.
     * This can be used when planning to continue the upload an object in another
     * session.
     *
     * **Must be used with {@link UploadConfig.chunkSize} != `0`**.
     *
     * If this is a continuation of a previous upload, {@link UploadConfig.offset}
     * should be set.
     *
     * @see {@link checkUploadStatus} for checking the status of an existing upload.
     */
    isPartialUpload?: boolean;
    /**
     * A customer-supplied encryption key. See
     * https://cloud.google.com/storage/docs/encryption#customer-supplied.
     */
    key?: string | Buffer;
    /**
     * Resource name of the Cloud KMS key, of the form
     * `projects/my-project/locations/global/keyRings/my-kr/cryptoKeys/my-key`,
     * that will be used to encrypt the object. Overrides the object metadata's
     * `kms_key_name` value, if any.
     */
    kmsKeyName?: string;
    /**
     * Any metadata you wish to set on the object.
     */
    metadata?: ConfigMetadata;
    /**
     * The starting byte in relation to the final uploaded object.
     * **Must be used with {@link UploadConfig.uri}**.
     *
     * If resuming an interrupted stream, do not supply this argument unless you
     * know the exact number of bytes the service has AND the provided stream's
     * first byte is a continuation from that provided offset. If resuming an
     * interrupted stream and this option has not been provided, we will treat
     * the provided upload stream as the object to upload - where the first byte
     * of the upload stream is the first byte of the object to upload; skipping
     * any bytes that are already present on the server.
     *
     * @see {@link checkUploadStatus} for checking the status of an existing upload.
     * @see {@link https://cloud.google.com/storage/docs/json_api/v1/how-tos/resumable-upload#resume-upload.}
     */
    offset?: number;
    /**
     * Set an Origin header when creating the resumable upload URI.
     */
    origin?: string;
    /**
     * Specify query parameters that go along with the initial upload request. See
     * https://cloud.google.com/storage/docs/json_api/v1/objects/insert#parameters
     */
    params?: QueryParameters;
    /**
     * Apply a predefined set of access controls to the created file.
     */
    predefinedAcl?: PredefinedAcl;
    /**
     * Make the uploaded file private. (Alias for config.predefinedAcl =
     * 'private')
     */
    private?: boolean;
    /**
     * Make the uploaded file public. (Alias for config.predefinedAcl =
     * 'publicRead')
     */
    public?: boolean;
    /**
     * The service domain for a given Cloud universe.
     */
    universeDomain?: string;
    /**
     * If you already have a resumable URI from a previously-created resumable
     * upload, just pass it in here and we'll use that.
     *
     * If resuming an interrupted stream and the {@link UploadConfig.offset}
     * option has not been provided, we will treat the provided upload stream as
     * the object to upload - where the first byte of the upload stream is the
     * first byte of the object to upload; skipping any bytes that are already
     * present on the server.
     *
     * @see {@link checkUploadStatus} for checking the status of an existing upload.
     */
    uri?: string;
    /**
     * If the bucket being accessed has requesterPays functionality enabled, this
     * can be set to control which project is billed for the access of this file.
     */
    userProject?: string;
    /**
     * Configuration options for retrying retryable errors.
     */
    retryOptions: RetryOptions;
    [GCCL_GCS_CMD_KEY]?: string;
}
export interface ConfigMetadata {
    [key: string]: any;
    /**
     * Set the length of the object being uploaded. If uploading a partial
     * object, this is the overall size of the finalized object.
     */
    contentLength?: number;
    /**
     * Set the content type of the incoming data.
     */
    contentType?: string;
}
export interface GoogleInnerError {
    reason?: string;
}
export interface ApiError extends Error {
    code?: number;
    errors?: GoogleInnerError[];
}
export interface CheckUploadStatusConfig {
    /**
     * Set to `false` to disable retries within this method.
     *
     * @defaultValue `true`
     */
    retry?: boolean;
}
export declare class Upload extends Writable {
    #private;
    bucket: string;
    file: string;
    apiEndpoint: string;
    baseURI: string;
    authConfig?: {
        scopes?: string[];
    };
    authClient: {
        request: <T>(opts: GaxiosOptions) => Promise<GaxiosResponse<T>> | GaxiosPromise<T>;
    };
    cacheKey: string;
    chunkSize?: number;
    customRequestOptions: GaxiosOptions;
    generation?: number;
    key?: string | Buffer;
    kmsKeyName?: string;
    metadata: ConfigMetadata;
    offset?: number;
    origin?: string;
    params: QueryParameters;
    predefinedAcl?: PredefinedAcl;
    private?: boolean;
    public?: boolean;
    uri?: string;
    userProject?: string;
    encryption?: Encryption;
    uriProvidedManually: boolean;
    numBytesWritten: number;
    numRetries: number;
    contentLength: number | '*';
    retryOptions: RetryOptions;
    timeOfFirstRequest: number;
    isPartialUpload: boolean;
    private currentInvocationId;
    /**
     * A cache of buffers written to this instance, ready for consuming
     */
    private writeBuffers;
    private numChunksReadInRequest;
    /**
     * An array of buffers used for caching the most recent upload chunk.
     * We should not assume that the server received all bytes sent in the request.
     *  - https://cloud.google.com/storage/docs/performing-resumable-uploads#chunked-upload
     */
    private localWriteCache;
    private localWriteCacheByteLength;
    private upstreamEnded;
    constructor(cfg: UploadConfig);
    /**
     * Prevent 'finish' event until the upload has succeeded.
     *
     * @param fireFinishEvent The finish callback
     */
    _final(fireFinishEvent?: () => void): void;
    /**
     * Handles incoming data from upstream
     *
     * @param chunk The chunk to append to the buffer
     * @param encoding The encoding of the chunk
     * @param readCallback A callback for when the buffer has been read downstream
     */
    _write(chunk: Buffer | string, encoding: BufferEncoding, readCallback?: () => void): void;
    /**
     * Prepends the local buffer to write buffer and resets it.
     *
     * @param keepLastBytes number of bytes to keep from the end of the local buffer.
     */
    private prependLocalBufferToUpstream;
    /**
     * Retrieves data from upstream's buffer.
     *
     * @param limit The maximum amount to return from the buffer.
     */
    private pullFromChunkBuffer;
    /**
     * A handler for determining if data is ready to be read from upstream.
     *
     * @returns If there will be more chunks to read in the future
     */
    private waitForNextChunk;
    /**
     * Reads data from upstream up to the provided `limit`.
     * Ends when the limit has reached or no data is expected to be pushed from upstream.
     *
     * @param limit The most amount of data this iterator should return. `Infinity` by default.
     */
    private upstreamIterator;
    createURI(): Promise<string>;
    createURI(callback: CreateUriCallback): void;
    protected createURIAsync(): Promise<string>;
    private continueUploading;
    startUploading(): Promise<void>;
    private responseHandler;
    /**
     * Check the status of an existing resumable upload.
     *
     * @param cfg A configuration to use. `uri` is required.
     * @returns the current upload status
     */
    checkUploadStatus(config?: CheckUploadStatusConfig): Promise<GaxiosResponse<FileMetadata | void>>;
    private getAndSetOffset;
    private makeRequest;
    private makeRequestStream;
    /**
     * @return {bool} is the request good?
     */
    private onResponse;
    /**
     * @param resp GaxiosResponse object from previous attempt
     */
    private attemptDelayedRetry;
    /**
     * The amount of time to wait before retrying the request, in milliseconds.
     * If negative, do not retry.
     *
     * @returns the amount of time to wait, in milliseconds.
     */
    private getRetryDelay;
    private sanitizeEndpoint;
    /**
     * Check if a given status code is 2xx
     *
     * @param status The status code to check
     * @returns if the status is 2xx
     */
    isSuccessfulResponse(status: number): boolean;
}
export declare function upload(cfg: UploadConfig): Upload;
export declare function createURI(cfg: UploadConfig): Promise<string>;
export declare function createURI(cfg: UploadConfig, callback: CreateUriCallback): void;
/**
 * Check the status of an existing resumable upload.
 *
 * @param cfg A configuration to use. `uri` is required.
 * @returns the current upload status
 */
export declare function checkUploadStatus(cfg: UploadConfig & Required<Pick<UploadConfig, 'uri'>>): Promise<GaxiosResponse<void | FileMetadata>>;
