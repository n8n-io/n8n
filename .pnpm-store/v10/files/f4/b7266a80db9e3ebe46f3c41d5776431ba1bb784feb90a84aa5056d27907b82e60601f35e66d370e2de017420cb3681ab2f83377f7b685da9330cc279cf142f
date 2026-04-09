/*!
 * Copyright 2022 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _XMLMultiPartUploadHelper_instances, _XMLMultiPartUploadHelper_setGoogApiClientHeaders, _XMLMultiPartUploadHelper_handleErrorResponse;
import { FileExceptionMessages, RequestError, } from './file.js';
import pLimit from 'p-limit';
import * as path from 'path';
import { createReadStream, existsSync, promises as fsp } from 'fs';
import { CRC32C } from './crc32c.js';
import { GoogleAuth } from 'google-auth-library';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import AsyncRetry from 'async-retry';
import { createHash } from 'crypto';
import { GCCL_GCS_CMD_KEY } from './nodejs-common/util.js';
import { getRuntimeTrackingString, getUserAgentString } from './util.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getPackageJSON } from './package-json-helper.cjs';
const packageJson = getPackageJSON();
/**
 * Default number of concurrently executing promises to use when calling uploadManyFiles.
 *
 */
const DEFAULT_PARALLEL_UPLOAD_LIMIT = 5;
/**
 * Default number of concurrently executing promises to use when calling downloadManyFiles.
 *
 */
const DEFAULT_PARALLEL_DOWNLOAD_LIMIT = 5;
/**
 * Default number of concurrently executing promises to use when calling downloadFileInChunks.
 *
 */
const DEFAULT_PARALLEL_CHUNKED_DOWNLOAD_LIMIT = 5;
/**
 * The minimum size threshold in bytes at which to apply a chunked download strategy when calling downloadFileInChunks.
 *
 */
const DOWNLOAD_IN_CHUNKS_FILE_SIZE_THRESHOLD = 32 * 1024 * 1024;
/**
 * The chunk size in bytes to use when calling downloadFileInChunks.
 *
 */
const DOWNLOAD_IN_CHUNKS_DEFAULT_CHUNK_SIZE = 32 * 1024 * 1024;
/**
 * The chunk size in bytes to use when calling uploadFileInChunks.
 *
 */
const UPLOAD_IN_CHUNKS_DEFAULT_CHUNK_SIZE = 32 * 1024 * 1024;
/**
 * Default number of concurrently executing promises to use when calling uploadFileInChunks.
 *
 */
const DEFAULT_PARALLEL_CHUNKED_UPLOAD_LIMIT = 5;
const EMPTY_REGEX = '(?:)';
/**
 * The `gccl-gcs-cmd` value for the `X-Goog-API-Client` header.
 * Example: `gccl-gcs-cmd/tm.upload_many`
 *
 * @see {@link GCCL_GCS_CMD}.
 * @see {@link GCCL_GCS_CMD_KEY}.
 */
const GCCL_GCS_CMD_FEATURE = {
    UPLOAD_MANY: 'tm.upload_many',
    DOWNLOAD_MANY: 'tm.download_many',
    UPLOAD_SHARDED: 'tm.upload_sharded',
    DOWNLOAD_SHARDED: 'tm.download_sharded',
};
const defaultMultiPartGenerator = (bucket, fileName, uploadId, partsMap) => {
    return new XMLMultiPartUploadHelper(bucket, fileName, uploadId, partsMap);
};
export class MultiPartUploadError extends Error {
    constructor(message, uploadId, partsMap) {
        super(message);
        this.uploadId = uploadId;
        this.partsMap = partsMap;
    }
}
/**
 * Class representing an implementation of MPU in the XML API. This class is not meant for public usage.
 *
 * @private
 *
 */
class XMLMultiPartUploadHelper {
    constructor(bucket, fileName, uploadId, partsMap) {
        _XMLMultiPartUploadHelper_instances.add(this);
        this.authClient = bucket.storage.authClient || new GoogleAuth();
        this.uploadId = uploadId || '';
        this.bucket = bucket;
        this.fileName = fileName;
        this.baseUrl = `https://${bucket.name}.${new URL(this.bucket.storage.apiEndpoint).hostname}/${fileName}`;
        this.xmlBuilder = new XMLBuilder({ arrayNodeName: 'Part' });
        this.xmlParser = new XMLParser();
        this.partsMap = partsMap || new Map();
        this.retryOptions = {
            retries: this.bucket.storage.retryOptions.maxRetries,
            factor: this.bucket.storage.retryOptions.retryDelayMultiplier,
            maxTimeout: this.bucket.storage.retryOptions.maxRetryDelay * 1000,
            maxRetryTime: this.bucket.storage.retryOptions.totalTimeout * 1000,
        };
    }
    /**
     * Initiates a multipart upload (MPU) to the XML API and stores the resultant upload id.
     *
     * @returns {Promise<void>}
     */
    async initiateUpload(headers = {}) {
        const url = `${this.baseUrl}?uploads`;
        return AsyncRetry(async (bail) => {
            try {
                const res = await this.authClient.request({
                    headers: __classPrivateFieldGet(this, _XMLMultiPartUploadHelper_instances, "m", _XMLMultiPartUploadHelper_setGoogApiClientHeaders).call(this, headers),
                    method: 'POST',
                    url,
                });
                if (res.data && res.data.error) {
                    throw res.data.error;
                }
                const parsedXML = this.xmlParser.parse(res.data);
                this.uploadId = parsedXML.InitiateMultipartUploadResult.UploadId;
            }
            catch (e) {
                __classPrivateFieldGet(this, _XMLMultiPartUploadHelper_instances, "m", _XMLMultiPartUploadHelper_handleErrorResponse).call(this, e, bail);
            }
        }, this.retryOptions);
    }
    /**
     * Uploads the provided chunk of data to the XML API using the previously created upload id.
     *
     * @param {number} partNumber the sequence number of this chunk.
     * @param {Buffer} chunk the chunk of data to be uploaded.
     * @param {string | false} validation whether or not to include the md5 hash in the headers to cause the server
     * to validate the chunk was not corrupted.
     * @returns {Promise<void>}
     */
    async uploadPart(partNumber, chunk, validation) {
        const url = `${this.baseUrl}?partNumber=${partNumber}&uploadId=${this.uploadId}`;
        let headers = __classPrivateFieldGet(this, _XMLMultiPartUploadHelper_instances, "m", _XMLMultiPartUploadHelper_setGoogApiClientHeaders).call(this);
        if (validation === 'md5') {
            const hash = createHash('md5').update(chunk).digest('base64');
            headers = {
                'Content-MD5': hash,
            };
        }
        return AsyncRetry(async (bail) => {
            try {
                const res = await this.authClient.request({
                    url,
                    method: 'PUT',
                    body: chunk,
                    headers,
                });
                if (res.data && res.data.error) {
                    throw res.data.error;
                }
                this.partsMap.set(partNumber, res.headers['etag']);
            }
            catch (e) {
                __classPrivateFieldGet(this, _XMLMultiPartUploadHelper_instances, "m", _XMLMultiPartUploadHelper_handleErrorResponse).call(this, e, bail);
            }
        }, this.retryOptions);
    }
    /**
     * Sends the final request of the MPU to tell GCS the upload is now complete.
     *
     * @returns {Promise<void>}
     */
    async completeUpload() {
        const url = `${this.baseUrl}?uploadId=${this.uploadId}`;
        const sortedMap = new Map([...this.partsMap.entries()].sort((a, b) => a[0] - b[0]));
        const parts = [];
        for (const entry of sortedMap.entries()) {
            parts.push({ PartNumber: entry[0], ETag: entry[1] });
        }
        const body = `<CompleteMultipartUpload>${this.xmlBuilder.build(parts)}</CompleteMultipartUpload>`;
        return AsyncRetry(async (bail) => {
            try {
                const res = await this.authClient.request({
                    headers: __classPrivateFieldGet(this, _XMLMultiPartUploadHelper_instances, "m", _XMLMultiPartUploadHelper_setGoogApiClientHeaders).call(this),
                    url,
                    method: 'POST',
                    body,
                });
                if (res.data && res.data.error) {
                    throw res.data.error;
                }
                return res;
            }
            catch (e) {
                __classPrivateFieldGet(this, _XMLMultiPartUploadHelper_instances, "m", _XMLMultiPartUploadHelper_handleErrorResponse).call(this, e, bail);
                return;
            }
        }, this.retryOptions);
    }
    /**
     * Aborts an multipart upload that is in progress. Once aborted, any parts in the process of being uploaded fail,
     * and future requests using the upload ID fail.
     *
     * @returns {Promise<void>}
     */
    async abortUpload() {
        const url = `${this.baseUrl}?uploadId=${this.uploadId}`;
        return AsyncRetry(async (bail) => {
            try {
                const res = await this.authClient.request({
                    url,
                    method: 'DELETE',
                });
                if (res.data && res.data.error) {
                    throw res.data.error;
                }
            }
            catch (e) {
                __classPrivateFieldGet(this, _XMLMultiPartUploadHelper_instances, "m", _XMLMultiPartUploadHelper_handleErrorResponse).call(this, e, bail);
                return;
            }
        }, this.retryOptions);
    }
}
_XMLMultiPartUploadHelper_instances = new WeakSet(), _XMLMultiPartUploadHelper_setGoogApiClientHeaders = function _XMLMultiPartUploadHelper_setGoogApiClientHeaders(headers = {}) {
    let headerFound = false;
    let userAgentFound = false;
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLocaleLowerCase().trim() === 'x-goog-api-client') {
            headerFound = true;
            // Prepend command feature to value, if not already there
            if (!value.includes(GCCL_GCS_CMD_FEATURE.UPLOAD_SHARDED)) {
                headers[key] =
                    `${value} gccl-gcs-cmd/${GCCL_GCS_CMD_FEATURE.UPLOAD_SHARDED}`;
            }
        }
        else if (key.toLocaleLowerCase().trim() === 'user-agent') {
            userAgentFound = true;
        }
    }
    // If the header isn't present, add it
    if (!headerFound) {
        headers['x-goog-api-client'] = `${getRuntimeTrackingString()} gccl/${packageJson.version} gccl-gcs-cmd/${GCCL_GCS_CMD_FEATURE.UPLOAD_SHARDED}`;
    }
    // If the User-Agent isn't present, add it
    if (!userAgentFound) {
        headers['User-Agent'] = getUserAgentString();
    }
    return headers;
}, _XMLMultiPartUploadHelper_handleErrorResponse = function _XMLMultiPartUploadHelper_handleErrorResponse(err, bail) {
    if (this.bucket.storage.retryOptions.autoRetry &&
        this.bucket.storage.retryOptions.retryableErrorFn(err)) {
        throw err;
    }
    else {
        bail(err);
    }
};
/**
 * Create a TransferManager object to perform parallel transfer operations on a Cloud Storage bucket.
 *
 * @class
 * @hideconstructor
 *
 * @param {Bucket} bucket A {@link Bucket} instance
 *
 */
export class TransferManager {
    constructor(bucket) {
        this.bucket = bucket;
    }
    /**
     * @typedef {object} UploadManyFilesOptions
     * @property {number} [concurrencyLimit] The number of concurrently executing promises
     * to use when uploading the files.
     * @property {Function} [customDestinationBuilder] A function that will take the current path of a local file
     * and return a string representing a custom path to be used to upload the file to GCS.
     * @property {boolean} [skipIfExists] Do not upload the file if it already exists in
     * the bucket. This will set the precondition ifGenerationMatch = 0.
     * @property {string} [prefix] A prefix to append to all of the uploaded files.
     * @property {object} [passthroughOptions] {@link UploadOptions} Options to be passed through
     * to each individual upload operation.
     *
     */
    /**
     * Upload multiple files in parallel to the bucket. This is a convenience method
     * that utilizes {@link Bucket#upload} to perform the upload.
     *
     * @param {array | string} [filePathsOrDirectory] An array of fully qualified paths to the files or a directory name.
     * If a directory name is provided, the directory will be recursively walked and all files will be added to the upload list.
     * to be uploaded to the bucket
     * @param {UploadManyFilesOptions} [options] Configuration options.
     * @returns {Promise<UploadResponse[]>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * const transferManager = new TransferManager(bucket);
     *
     * //-
     * // Upload multiple files in parallel.
     * //-
     * const response = await transferManager.uploadManyFiles(['/local/path/file1.txt, 'local/path/file2.txt']);
     * // Your bucket now contains:
     * // - "local/path/file1.txt" (with the contents of '/local/path/file1.txt')
     * // - "local/path/file2.txt" (with the contents of '/local/path/file2.txt')
     * const response = await transferManager.uploadManyFiles('/local/directory');
     * // Your bucket will now contain all files contained in '/local/directory' maintaining the subdirectory structure.
     * ```
     *
     */
    async uploadManyFiles(filePathsOrDirectory, options = {}) {
        var _a;
        if (options.skipIfExists && ((_a = options.passthroughOptions) === null || _a === void 0 ? void 0 : _a.preconditionOpts)) {
            options.passthroughOptions.preconditionOpts.ifGenerationMatch = 0;
        }
        else if (options.skipIfExists &&
            options.passthroughOptions === undefined) {
            options.passthroughOptions = {
                preconditionOpts: {
                    ifGenerationMatch: 0,
                },
            };
        }
        const limit = pLimit(options.concurrencyLimit || DEFAULT_PARALLEL_UPLOAD_LIMIT);
        const promises = [];
        let allPaths = [];
        if (!Array.isArray(filePathsOrDirectory)) {
            for await (const curPath of this.getPathsFromDirectory(filePathsOrDirectory)) {
                allPaths.push(curPath);
            }
        }
        else {
            allPaths = filePathsOrDirectory;
        }
        for (const filePath of allPaths) {
            const stat = await fsp.lstat(filePath);
            if (stat.isDirectory()) {
                continue;
            }
            const passThroughOptionsCopy = {
                ...options.passthroughOptions,
                [GCCL_GCS_CMD_KEY]: GCCL_GCS_CMD_FEATURE.UPLOAD_MANY,
            };
            passThroughOptionsCopy.destination = options.customDestinationBuilder
                ? options.customDestinationBuilder(filePath, options)
                : filePath.split(path.sep).join(path.posix.sep);
            if (options.prefix) {
                passThroughOptionsCopy.destination = path.posix.join(...options.prefix.split(path.sep), passThroughOptionsCopy.destination);
            }
            promises.push(limit(() => this.bucket.upload(filePath, passThroughOptionsCopy)));
        }
        return Promise.all(promises);
    }
    /**
     * @typedef {object} DownloadManyFilesOptions
     * @property {number} [concurrencyLimit] The number of concurrently executing promises
     * to use when downloading the files.
     * @property {string} [prefix] A prefix to append to all of the downloaded files.
     * @property {string} [stripPrefix] A prefix to remove from all of the downloaded files.
     * @property {object} [passthroughOptions] {@link DownloadOptions} Options to be passed through
     * to each individual download operation.
     * @property {boolean} [skipIfExists] Do not download the file if it already exists in
     * the destination.
     *
     */
    /**
     * Download multiple files in parallel to the local filesystem. This is a convenience method
     * that utilizes {@link File#download} to perform the download.
     *
     * @param {array | string} [filesOrFolder] An array of file name strings or file objects to be downloaded. If
     * a string is provided this will be treated as a GCS prefix and all files with that prefix will be downloaded.
     * @param {DownloadManyFilesOptions} [options] Configuration options. Setting options.prefix or options.stripPrefix
     * or options.passthroughOptions.destination will cause the downloaded files to be written to the file system
     * instead of being returned as a buffer.
     * @returns {Promise<DownloadResponse[]>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * const transferManager = new TransferManager(bucket);
     *
     * //-
     * // Download multiple files in parallel.
     * //-
     * const response = await transferManager.downloadManyFiles(['file1.txt', 'file2.txt']);
     * // The following files have been downloaded:
     * // - "file1.txt" (with the contents from my-bucket.file1.txt)
     * // - "file2.txt" (with the contents from my-bucket.file2.txt)
     * const response = await transferManager.downloadManyFiles([bucket.File('file1.txt'), bucket.File('file2.txt')]);
     * // The following files have been downloaded:
     * // - "file1.txt" (with the contents from my-bucket.file1.txt)
     * // - "file2.txt" (with the contents from my-bucket.file2.txt)
     * const response = await transferManager.downloadManyFiles('test-folder');
     * // All files with GCS prefix of 'test-folder' have been downloaded.
     * ```
     *
     */
    async downloadManyFiles(filesOrFolder, options = {}) {
        const limit = pLimit(options.concurrencyLimit || DEFAULT_PARALLEL_DOWNLOAD_LIMIT);
        const promises = [];
        let files = [];
        if (!Array.isArray(filesOrFolder)) {
            const directoryFiles = await this.bucket.getFiles({
                prefix: filesOrFolder,
            });
            files = directoryFiles[0];
        }
        else {
            files = filesOrFolder.map(curFile => {
                if (typeof curFile === 'string') {
                    return this.bucket.file(curFile);
                }
                return curFile;
            });
        }
        const stripRegexString = options.stripPrefix
            ? `^${options.stripPrefix}`
            : EMPTY_REGEX;
        const regex = new RegExp(stripRegexString, 'g');
        for (const file of files) {
            const passThroughOptionsCopy = {
                ...options.passthroughOptions,
                [GCCL_GCS_CMD_KEY]: GCCL_GCS_CMD_FEATURE.DOWNLOAD_MANY,
            };
            if (options.prefix || passThroughOptionsCopy.destination) {
                passThroughOptionsCopy.destination = path.join(options.prefix || '', passThroughOptionsCopy.destination || '', file.name);
            }
            if (options.stripPrefix) {
                passThroughOptionsCopy.destination = file.name.replace(regex, '');
            }
            if (options.skipIfExists &&
                existsSync(passThroughOptionsCopy.destination || '')) {
                continue;
            }
            promises.push(limit(async () => {
                const destination = passThroughOptionsCopy.destination;
                if (destination && destination.endsWith(path.sep)) {
                    await fsp.mkdir(destination, { recursive: true });
                    return Promise.resolve([
                        Buffer.alloc(0),
                    ]);
                }
                return file.download(passThroughOptionsCopy);
            }));
        }
        return Promise.all(promises);
    }
    /**
     * @typedef {object} DownloadFileInChunksOptions
     * @property {number} [concurrencyLimit] The number of concurrently executing promises
     * to use when downloading the file.
     * @property {number} [chunkSizeBytes] The size in bytes of each chunk to be downloaded.
     * @property {string | boolean} [validation] Whether or not to perform a CRC32C validation check when download is complete.
     * @property {boolean} [noReturnData] Whether or not to return the downloaded data. A `true` value here would be useful for files with a size that will not fit into memory.
     *
     */
    /**
     * Download a large file in chunks utilizing parallel download operations. This is a convenience method
     * that utilizes {@link File#download} to perform the download.
     *
     * @param {File | string} fileOrName {@link File} to download.
     * @param {DownloadFileInChunksOptions} [options] Configuration options.
     * @returns {Promise<void | DownloadResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * const transferManager = new TransferManager(bucket);
     *
     * //-
     * // Download a large file in chunks utilizing parallel operations.
     * //-
     * const response = await transferManager.downloadFileInChunks(bucket.file('large-file.txt');
     * // Your local directory now contains:
     * // - "large-file.txt" (with the contents from my-bucket.large-file.txt)
     * ```
     *
     */
    async downloadFileInChunks(fileOrName, options = {}) {
        let chunkSize = options.chunkSizeBytes || DOWNLOAD_IN_CHUNKS_DEFAULT_CHUNK_SIZE;
        let limit = pLimit(options.concurrencyLimit || DEFAULT_PARALLEL_CHUNKED_DOWNLOAD_LIMIT);
        const noReturnData = Boolean(options.noReturnData);
        const promises = [];
        const file = typeof fileOrName === 'string'
            ? this.bucket.file(fileOrName)
            : fileOrName;
        const fileInfo = await file.get();
        const size = parseInt(fileInfo[0].metadata.size.toString());
        // If the file size does not meet the threshold download it as a single chunk.
        if (size < DOWNLOAD_IN_CHUNKS_FILE_SIZE_THRESHOLD) {
            limit = pLimit(1);
            chunkSize = size;
        }
        let start = 0;
        const filePath = options.destination || path.basename(file.name);
        const fileToWrite = await fsp.open(filePath, 'w');
        while (start < size) {
            const chunkStart = start;
            let chunkEnd = start + chunkSize - 1;
            chunkEnd = chunkEnd > size ? size : chunkEnd;
            promises.push(limit(async () => {
                const resp = await file.download({
                    start: chunkStart,
                    end: chunkEnd,
                    [GCCL_GCS_CMD_KEY]: GCCL_GCS_CMD_FEATURE.DOWNLOAD_SHARDED,
                });
                const result = await fileToWrite.write(resp[0], 0, resp[0].length, chunkStart);
                if (noReturnData)
                    return;
                return result.buffer;
            }));
            start += chunkSize;
        }
        let chunks;
        try {
            chunks = await Promise.all(promises);
        }
        finally {
            await fileToWrite.close();
        }
        if (options.validation === 'crc32c' && fileInfo[0].metadata.crc32c) {
            const downloadedCrc32C = await CRC32C.fromFile(filePath);
            if (!downloadedCrc32C.validate(fileInfo[0].metadata.crc32c)) {
                const mismatchError = new RequestError(FileExceptionMessages.DOWNLOAD_MISMATCH);
                mismatchError.code = 'CONTENT_DOWNLOAD_MISMATCH';
                throw mismatchError;
            }
        }
        if (noReturnData)
            return;
        return [Buffer.concat(chunks, size)];
    }
    /**
     * @typedef {object} UploadFileInChunksOptions
     * @property {number} [concurrencyLimit] The number of concurrently executing promises
     * to use when uploading the file.
     * @property {number} [chunkSizeBytes] The size in bytes of each chunk to be uploaded.
     * @property {string} [uploadName] Name of the file when saving to GCS. If omitted the name is taken from the file path.
     * @property {number} [maxQueueSize] The number of chunks to be uploaded to hold in memory concurrently. If not specified
     * defaults to the specified concurrency limit.
     * @property {string} [uploadId] If specified attempts to resume a previous upload.
     * @property {Map} [partsMap] If specified alongside uploadId, attempts to resume a previous upload from the last chunk
     * specified in partsMap
     * @property {object} [headers] headers to be sent when initiating the multipart upload.
     * See {@link https://cloud.google.com/storage/docs/xml-api/post-object-multipart#request_headers| Request Headers: Initiate a Multipart Upload}
     * @property {boolean} [autoAbortFailure] boolean to indicate if an in progress upload session will be automatically aborted upon failure. If not set,
     * failures will be automatically aborted.
     *
     */
    /**
     * Upload a large file in chunks utilizing parallel upload operations. If the upload fails, an uploadId and
     * map containing all the successfully uploaded parts will be returned to the caller. These arguments can be used to
     * resume the upload.
     *
     * @param {string} [filePath] The path of the file to be uploaded
     * @param {UploadFileInChunksOptions} [options] Configuration options.
     * @param {MultiPartHelperGenerator} [generator] A function that will return a type that implements the MPU interface. Most users will not need to use this.
     * @returns {Promise<void>} If successful a promise resolving to void, otherwise a error containing the message, uploadId, and parts map.
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * const transferManager = new TransferManager(bucket);
     *
     * //-
     * // Upload a large file in chunks utilizing parallel operations.
     * //-
     * const response = await transferManager.uploadFileInChunks('large-file.txt');
     * // Your bucket now contains:
     * // - "large-file.txt"
     * ```
     *
     *
     */
    async uploadFileInChunks(filePath, options = {}, generator = defaultMultiPartGenerator) {
        const chunkSize = options.chunkSizeBytes || UPLOAD_IN_CHUNKS_DEFAULT_CHUNK_SIZE;
        const limit = pLimit(options.concurrencyLimit || DEFAULT_PARALLEL_CHUNKED_UPLOAD_LIMIT);
        const maxQueueSize = options.maxQueueSize ||
            options.concurrencyLimit ||
            DEFAULT_PARALLEL_CHUNKED_UPLOAD_LIMIT;
        const fileName = options.uploadName || path.basename(filePath);
        const mpuHelper = generator(this.bucket, fileName, options.uploadId, options.partsMap);
        let partNumber = 1;
        let promises = [];
        try {
            if (options.uploadId === undefined) {
                await mpuHelper.initiateUpload(options.headers);
            }
            const startOrResumptionByte = mpuHelper.partsMap.size * chunkSize;
            const readStream = createReadStream(filePath, {
                highWaterMark: chunkSize,
                start: startOrResumptionByte,
            });
            // p-limit only limits the number of running promises. We do not want to hold an entire
            // large file in memory at once so promises acts a queue that will hold only maxQueueSize in memory.
            for await (const curChunk of readStream) {
                if (promises.length >= maxQueueSize) {
                    await Promise.all(promises);
                    promises = [];
                }
                promises.push(limit(() => mpuHelper.uploadPart(partNumber++, curChunk, options.validation)));
            }
            await Promise.all(promises);
            return await mpuHelper.completeUpload();
        }
        catch (e) {
            if ((options.autoAbortFailure === undefined || options.autoAbortFailure) &&
                mpuHelper.uploadId) {
                try {
                    await mpuHelper.abortUpload();
                    return;
                }
                catch (e) {
                    throw new MultiPartUploadError(e.message, mpuHelper.uploadId, mpuHelper.partsMap);
                }
            }
            throw new MultiPartUploadError(e.message, mpuHelper.uploadId, mpuHelper.partsMap);
        }
    }
    async *getPathsFromDirectory(directory) {
        const filesAndSubdirectories = await fsp.readdir(directory, {
            withFileTypes: true,
        });
        for (const curFileOrDirectory of filesAndSubdirectories) {
            const fullPath = path.join(directory, curFileOrDirectory.name);
            curFileOrDirectory.isDirectory()
                ? yield* this.getPathsFromDirectory(fullPath)
                : yield fullPath;
        }
    }
}
