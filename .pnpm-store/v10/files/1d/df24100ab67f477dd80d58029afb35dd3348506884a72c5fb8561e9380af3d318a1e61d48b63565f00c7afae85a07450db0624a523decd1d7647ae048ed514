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
import { Bucket, UploadOptions, UploadResponse } from './bucket.js';
import { DownloadOptions, DownloadResponse, File } from './file.js';
import { GaxiosResponse } from 'gaxios';
export interface UploadManyFilesOptions {
    concurrencyLimit?: number;
    customDestinationBuilder?(path: string, options: UploadManyFilesOptions): string;
    skipIfExists?: boolean;
    prefix?: string;
    passthroughOptions?: Omit<UploadOptions, 'destination'>;
}
export interface DownloadManyFilesOptions {
    concurrencyLimit?: number;
    prefix?: string;
    stripPrefix?: string;
    passthroughOptions?: DownloadOptions;
}
export interface DownloadFileInChunksOptions {
    concurrencyLimit?: number;
    chunkSizeBytes?: number;
    destination?: string;
    validation?: 'crc32c' | false;
    noReturnData?: boolean;
}
export interface UploadFileInChunksOptions {
    concurrencyLimit?: number;
    chunkSizeBytes?: number;
    uploadName?: string;
    maxQueueSize?: number;
    uploadId?: string;
    autoAbortFailure?: boolean;
    partsMap?: Map<number, string>;
    validation?: 'md5' | false;
    headers?: {
        [key: string]: string;
    };
}
export interface MultiPartUploadHelper {
    bucket: Bucket;
    fileName: string;
    uploadId?: string;
    partsMap?: Map<number, string>;
    initiateUpload(headers?: {
        [key: string]: string;
    }): Promise<void>;
    uploadPart(partNumber: number, chunk: Buffer, validation?: 'md5' | false): Promise<void>;
    completeUpload(): Promise<GaxiosResponse | undefined>;
    abortUpload(): Promise<void>;
}
export type MultiPartHelperGenerator = (bucket: Bucket, fileName: string, uploadId?: string, partsMap?: Map<number, string>) => MultiPartUploadHelper;
export declare class MultiPartUploadError extends Error {
    private uploadId;
    private partsMap;
    constructor(message: string, uploadId: string, partsMap: Map<number, string>);
}
/**
 * Create a TransferManager object to perform parallel transfer operations on a Cloud Storage bucket.
 *
 * @class
 * @hideconstructor
 *
 * @param {Bucket} bucket A {@link Bucket} instance
 *
 */
export declare class TransferManager {
    bucket: Bucket;
    constructor(bucket: Bucket);
    /**
     * @typedef {object} UploadManyFilesOptions
     * @property {number} [concurrencyLimit] The number of concurrently executing promises
     * to use when uploading the files.
     * @property {Function} [customDestinationBuilder] A fuction that will take the current path of a local file
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
    uploadManyFiles(filePathsOrDirectory: string[] | string, options?: UploadManyFilesOptions): Promise<UploadResponse[]>;
    /**
     * @typedef {object} DownloadManyFilesOptions
     * @property {number} [concurrencyLimit] The number of concurrently executing promises
     * to use when downloading the files.
     * @property {string} [prefix] A prefix to append to all of the downloaded files.
     * @property {string} [stripPrefix] A prefix to remove from all of the downloaded files.
     * @property {object} [passthroughOptions] {@link DownloadOptions} Options to be passed through
     * to each individual download operation.
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
    downloadManyFiles(filesOrFolder: File[] | string[] | string, options?: DownloadManyFilesOptions): Promise<void | DownloadResponse[]>;
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
    downloadFileInChunks(fileOrName: File | string, options?: DownloadFileInChunksOptions): Promise<void | DownloadResponse>;
    /**
     * @typedef {object} UploadFileInChunksOptions
     * @property {number} [concurrencyLimit] The number of concurrently executing promises
     * to use when uploading the file.
     * @property {number} [chunkSizeBytes] The size in bytes of each chunk to be uploaded.
     * @property {string} [uploadName] Name of the file when saving to GCS. If ommitted the name is taken from the file path.
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
     * Upload a large file in chunks utilizing parallel upload opertions. If the upload fails, an uploadId and
     * map containing all the successfully uploaded parts will be returned to the caller. These arguments can be used to
     * resume the upload.
     *
     * @param {string} [filePath] The path of the file to be uploaded
     * @param {UploadFileInChunksOptions} [options] Configuration options.
     * @param {MultiPartHelperGenerator} [generator] A function that will return a type that implements the MPU interface. Most users will not need to use this.
     * @returns {Promise<void>} If successful a promise resolving to void, otherwise a error containing the message, uploadid, and parts map.
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
    uploadFileInChunks(filePath: string, options?: UploadFileInChunksOptions, generator?: MultiPartHelperGenerator): Promise<GaxiosResponse | undefined>;
    private getPathsFromDirectory;
}
