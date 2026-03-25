// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { __asyncDelegator, __asyncGenerator, __asyncValues, __await } from "tslib";
import { getDefaultProxySettings } from "@azure/core-rest-pipeline";
import { isTokenCredential } from "@azure/core-auth";
import { isNode } from "@azure/core-util";
import { randomUUID } from "@azure/core-util";
import { BlobDownloadResponse } from "./BlobDownloadResponse";
import { BlobQueryResponse } from "./BlobQueryResponse";
import { AnonymousCredential } from "./credentials/AnonymousCredential";
import { StorageSharedKeyCredential } from "./credentials/StorageSharedKeyCredential";
import { ensureCpkIfSpecified, toAccessTier } from "./models";
import { rangeResponseFromModel } from "./PageBlobRangeResponse";
import { newPipeline, isPipelineLike } from "./Pipeline";
import { BlobBeginCopyFromUrlPoller } from "./pollers/BlobStartCopyFromUrlPoller";
import { rangeToString } from "./Range";
import { StorageClient } from "./StorageClient";
import { Batch } from "./utils/Batch";
import { BufferScheduler } from "../../storage-common/src";
import { BlobDoesNotUseCustomerSpecifiedEncryption, BlobUsesCustomerSpecifiedEncryptionMsg, BLOCK_BLOB_MAX_BLOCKS, BLOCK_BLOB_MAX_STAGE_BLOCK_BYTES, BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES, DEFAULT_BLOB_DOWNLOAD_BLOCK_BYTES, DEFAULT_BLOCK_BUFFER_SIZE_BYTES, DEFAULT_MAX_DOWNLOAD_RETRY_REQUESTS, ETagAny, URLConstants, } from "./utils/constants";
import { tracingClient } from "./utils/tracing";
import { appendToURLPath, appendToURLQuery, assertResponse, extractConnectionStringParts, ExtractPageRangeInfoItems, generateBlockID, getURLParameter, httpAuthorizationToString, isIpEndpointStyle, parseObjectReplicationRecord, setURLParameter, toBlobTags, toBlobTagsString, toQuerySerialization, toTags, } from "./utils/utils.common";
import { fsCreateReadStream, fsStat, readStreamToLocalFile, streamToBuffer, } from "./utils/utils.node";
import { generateBlobSASQueryParameters, generateBlobSASQueryParametersInternal, } from "./sas/BlobSASSignatureValues";
import { BlobLeaseClient } from "./BlobLeaseClient";
/**
 * A BlobClient represents a URL to an Azure Storage blob; the blob may be a block blob,
 * append blob, or page blob.
 */
export class BlobClient extends StorageClient {
    /**
     * The name of the blob.
     */
    get name() {
        return this._name;
    }
    /**
     * The name of the storage container the blob is associated with.
     */
    get containerName() {
        return this._containerName;
    }
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, blobNameOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        options = options || {};
        let pipeline;
        let url;
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            options = blobNameOrOptions;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            // The second parameter is undefined. Use anonymous credential.
            url = urlOrConnectionString;
            if (blobNameOrOptions && typeof blobNameOrOptions !== "string") {
                options = blobNameOrOptions;
            }
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string" &&
            blobNameOrOptions &&
            typeof blobNameOrOptions === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const blobName = blobNameOrOptions;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName and blobName parameters");
        }
        super(url, pipeline);
        ({ blobName: this._name, containerName: this._containerName } =
            this.getBlobAndContainerNamesFromUrl());
        this.blobContext = this.storageClientContext.blob;
        this._snapshot = getURLParameter(this.url, URLConstants.Parameters.SNAPSHOT);
        this._versionId = getURLParameter(this.url, URLConstants.Parameters.VERSIONID);
    }
    /**
     * Creates a new BlobClient object identical to the source but with the specified snapshot timestamp.
     * Provide "" will remove the snapshot and return a Client to the base blob.
     *
     * @param snapshot - The snapshot timestamp.
     * @returns A new BlobClient object identical to the source but with the specified snapshot timestamp
     */
    withSnapshot(snapshot) {
        return new BlobClient(setURLParameter(this.url, URLConstants.Parameters.SNAPSHOT, snapshot.length === 0 ? undefined : snapshot), this.pipeline);
    }
    /**
     * Creates a new BlobClient object pointing to a version of this blob.
     * Provide "" will remove the versionId and return a Client to the base blob.
     *
     * @param versionId - The versionId.
     * @returns A new BlobClient object pointing to the version of this blob.
     */
    withVersion(versionId) {
        return new BlobClient(setURLParameter(this.url, URLConstants.Parameters.VERSIONID, versionId.length === 0 ? undefined : versionId), this.pipeline);
    }
    /**
     * Creates a AppendBlobClient object.
     *
     */
    getAppendBlobClient() {
        return new AppendBlobClient(this.url, this.pipeline);
    }
    /**
     * Creates a BlockBlobClient object.
     *
     */
    getBlockBlobClient() {
        return new BlockBlobClient(this.url, this.pipeline);
    }
    /**
     * Creates a PageBlobClient object.
     *
     */
    getPageBlobClient() {
        return new PageBlobClient(this.url, this.pipeline);
    }
    /**
     * Reads or downloads a blob from the system, including its metadata and properties.
     * You can also call Get Blob to read a snapshot.
     *
     * * In Node.js, data returns in a Readable stream readableStreamBody
     * * In browsers, data returns in a promise blobBody
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-blob
     *
     * @param offset - From which position of the blob to download, greater than or equal to 0
     * @param count - How much data to be downloaded, greater than 0. Will download to the end when undefined
     * @param options - Optional options to Blob Download operation.
     *
     *
     * Example usage (Node.js):
     *
     * ```js
     * // Download and convert a blob to a string
     * const downloadBlockBlobResponse = await blobClient.download();
     * const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
     * console.log("Downloaded blob content:", downloaded.toString());
     *
     * async function streamToBuffer(readableStream) {
     * return new Promise((resolve, reject) => {
     * const chunks = [];
     * readableStream.on("data", (data) => {
     * chunks.push(data instanceof Buffer ? data : Buffer.from(data));
     * });
     * readableStream.on("end", () => {
     * resolve(Buffer.concat(chunks));
     * });
     * readableStream.on("error", reject);
     * });
     * }
     * ```
     *
     * Example usage (browser):
     *
     * ```js
     * // Download and convert a blob to a string
     * const downloadBlockBlobResponse = await blobClient.download();
     * const downloaded = await blobToString(await downloadBlockBlobResponse.blobBody);
     * console.log(
     *   "Downloaded blob content",
     *   downloaded
     * );
     *
     * async function blobToString(blob: Blob): Promise<string> {
     *   const fileReader = new FileReader();
     *   return new Promise<string>((resolve, reject) => {
     *     fileReader.onloadend = (ev: any) => {
     *       resolve(ev.target!.result);
     *     };
     *     fileReader.onerror = reject;
     *     fileReader.readAsText(blob);
     *   });
     * }
     * ```
     */
    async download(offset = 0, count, options = {}) {
        options.conditions = options.conditions || {};
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-download", options, async (updatedOptions) => {
            var _a;
            const res = assertResponse(await this.blobContext.download({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                requestOptions: {
                    onDownloadProgress: isNode ? undefined : options.onProgress, // for Node.js, progress is reported by RetriableReadableStream
                },
                range: offset === 0 && !count ? undefined : rangeToString({ offset, count }),
                rangeGetContentMD5: options.rangeGetContentMD5,
                rangeGetContentCRC64: options.rangeGetContentCrc64,
                snapshot: options.snapshot,
                cpkInfo: options.customerProvidedKey,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const wrappedRes = Object.assign(Object.assign({}, res), { _response: res._response, objectReplicationDestinationPolicyId: res.objectReplicationPolicyId, objectReplicationSourceProperties: parseObjectReplicationRecord(res.objectReplicationRules) });
            // Return browser response immediately
            if (!isNode) {
                return wrappedRes;
            }
            // We support retrying when download stream unexpected ends in Node.js runtime
            // Following code shouldn't be bundled into browser build, however some
            // bundlers may try to bundle following code and "FileReadResponse.ts".
            // In this case, "FileDownloadResponse.browser.ts" will be used as a shim of "FileDownloadResponse.ts"
            // The config is in package.json "browser" field
            if (options.maxRetryRequests === undefined || options.maxRetryRequests < 0) {
                // TODO: Default value or make it a required parameter?
                options.maxRetryRequests = DEFAULT_MAX_DOWNLOAD_RETRY_REQUESTS;
            }
            if (res.contentLength === undefined) {
                throw new RangeError(`File download response doesn't contain valid content length header`);
            }
            if (!res.etag) {
                throw new RangeError(`File download response doesn't contain valid etag header`);
            }
            return new BlobDownloadResponse(wrappedRes, async (start) => {
                var _a;
                const updatedDownloadOptions = {
                    leaseAccessConditions: options.conditions,
                    modifiedAccessConditions: {
                        ifMatch: options.conditions.ifMatch || res.etag,
                        ifModifiedSince: options.conditions.ifModifiedSince,
                        ifNoneMatch: options.conditions.ifNoneMatch,
                        ifUnmodifiedSince: options.conditions.ifUnmodifiedSince,
                        ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions,
                    },
                    range: rangeToString({
                        count: offset + res.contentLength - start,
                        offset: start,
                    }),
                    rangeGetContentMD5: options.rangeGetContentMD5,
                    rangeGetContentCRC64: options.rangeGetContentCrc64,
                    snapshot: options.snapshot,
                    cpkInfo: options.customerProvidedKey,
                };
                // Debug purpose only
                // console.log(
                //   `Read from internal stream, range: ${
                //     updatedOptions.range
                //   }, options: ${JSON.stringify(updatedOptions)}`
                // );
                return (await this.blobContext.download(Object.assign({ abortSignal: options.abortSignal }, updatedDownloadOptions))).readableStreamBody;
            }, offset, res.contentLength, {
                maxRetryRequests: options.maxRetryRequests,
                onProgress: options.onProgress,
            });
        });
    }
    /**
     * Returns true if the Azure blob resource represented by this client exists; false otherwise.
     *
     * NOTE: use this function with care since an existing blob might be deleted by other clients or
     * applications. Vice versa new blobs might be added by other clients or applications after this
     * function completes.
     *
     * @param options - options to Exists operation.
     */
    async exists(options = {}) {
        return tracingClient.withSpan("BlobClient-exists", options, async (updatedOptions) => {
            try {
                ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
                await this.getProperties({
                    abortSignal: options.abortSignal,
                    customerProvidedKey: options.customerProvidedKey,
                    conditions: options.conditions,
                    tracingOptions: updatedOptions.tracingOptions,
                });
                return true;
            }
            catch (e) {
                if (e.statusCode === 404) {
                    // Expected exception when checking blob existence
                    return false;
                }
                else if (e.statusCode === 409 &&
                    (e.details.errorCode === BlobUsesCustomerSpecifiedEncryptionMsg ||
                        e.details.errorCode === BlobDoesNotUseCustomerSpecifiedEncryption)) {
                    // Expected exception when checking blob existence
                    return true;
                }
                throw e;
            }
        });
    }
    /**
     * Returns all user-defined metadata, standard HTTP properties, and system properties
     * for the blob. It does not return the content of the blob.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-blob-properties
     *
     * WARNING: The `metadata` object returned in the response will have its keys in lowercase, even if
     * they originally contained uppercase characters. This differs from the metadata keys returned by
     * the methods of {@link ContainerClient} that list blobs using the `includeMetadata` option, which
     * will retain their original casing.
     *
     * @param options - Optional options to Get Properties operation.
     */
    async getProperties(options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-getProperties", options, async (updatedOptions) => {
            var _a;
            const res = assertResponse(await this.blobContext.getProperties({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return Object.assign(Object.assign({}, res), { _response: res._response, objectReplicationDestinationPolicyId: res.objectReplicationPolicyId, objectReplicationSourceProperties: parseObjectReplicationRecord(res.objectReplicationRules) });
        });
    }
    /**
     * Marks the specified blob or snapshot for deletion. The blob is later deleted
     * during garbage collection. Note that in order to delete a blob, you must delete
     * all of its snapshots. You can delete both at the same time with the Delete
     * Blob operation.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-blob
     *
     * @param options - Optional options to Blob Delete operation.
     */
    async delete(options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("BlobClient-delete", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.delete({
                abortSignal: options.abortSignal,
                deleteSnapshots: options.deleteSnapshots,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Marks the specified blob or snapshot for deletion if it exists. The blob is later deleted
     * during garbage collection. Note that in order to delete a blob, you must delete
     * all of its snapshots. You can delete both at the same time with the Delete
     * Blob operation.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-blob
     *
     * @param options - Optional options to Blob Delete operation.
     */
    async deleteIfExists(options = {}) {
        return tracingClient.withSpan("BlobClient-deleteIfExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const res = assertResponse(await this.delete(updatedOptions));
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "BlobNotFound") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                throw e;
            }
        });
    }
    /**
     * Restores the contents and metadata of soft deleted blob and any associated
     * soft deleted snapshots. Undelete Blob is supported only on version 2017-07-29
     * or later.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/undelete-blob
     *
     * @param options - Optional options to Blob Undelete operation.
     */
    async undelete(options = {}) {
        return tracingClient.withSpan("BlobClient-undelete", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.undelete({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets system properties on the blob.
     *
     * If no value provided, or no value provided for the specified blob HTTP headers,
     * these blob HTTP headers without a value will be cleared.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-properties
     *
     * @param blobHTTPHeaders - If no value provided, or no value provided for
     *                                                   the specified blob HTTP headers, these blob HTTP
     *                                                   headers without a value will be cleared.
     *                                                   A common header to set is `blobContentType`
     *                                                   enabling the browser to provide functionality
     *                                                   based on file type.
     * @param options - Optional options to Blob Set HTTP Headers operation.
     */
    async setHTTPHeaders(blobHTTPHeaders, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-setHTTPHeaders", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.setHttpHeaders({
                abortSignal: options.abortSignal,
                blobHttpHeaders: blobHTTPHeaders,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                // cpkInfo: options.customerProvidedKey, // CPK is not included in Swagger, should change this back when this issue is fixed in Swagger.
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets user-defined metadata for the specified blob as one or more name-value pairs.
     *
     * If no option provided, or no metadata defined in the parameter, the blob
     * metadata will be removed.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-metadata
     *
     * @param metadata - Replace existing metadata with this value.
     *                               If no value provided the existing metadata will be removed.
     * @param options - Optional options to Set Metadata operation.
     */
    async setMetadata(metadata, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-setMetadata", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.setMetadata({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets tags on the underlying blob.
     * A blob can have up to 10 tags. Tag keys must be between 1 and 128 characters.  Tag values must be between 0 and 256 characters.
     * Valid tag key and value characters include lower and upper case letters, digits (0-9),
     * space (' '), plus ('+'), minus ('-'), period ('.'), foward slash ('/'), colon (':'), equals ('='), and underscore ('_').
     *
     * @param tags -
     * @param options -
     */
    async setTags(tags, options = {}) {
        return tracingClient.withSpan("BlobClient-setTags", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.setTags({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
                tags: toBlobTags(tags),
            }));
        });
    }
    /**
     * Gets the tags associated with the underlying blob.
     *
     * @param options -
     */
    async getTags(options = {}) {
        return tracingClient.withSpan("BlobClient-getTags", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this.blobContext.getTags({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: response._response, tags: toTags({ blobTagSet: response.blobTagSet }) || {} });
            return wrappedResponse;
        });
    }
    /**
     * Get a {@link BlobLeaseClient} that manages leases on the blob.
     *
     * @param proposeLeaseId - Initial proposed lease Id.
     * @returns A new BlobLeaseClient object for managing leases on the blob.
     */
    getBlobLeaseClient(proposeLeaseId) {
        return new BlobLeaseClient(this, proposeLeaseId);
    }
    /**
     * Creates a read-only snapshot of a blob.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/snapshot-blob
     *
     * @param options - Optional options to the Blob Create Snapshot operation.
     */
    async createSnapshot(options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-createSnapshot", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.createSnapshot({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Asynchronously copies a blob to a destination within the storage account.
     * This method returns a long running operation poller that allows you to wait
     * indefinitely until the copy is completed.
     * You can also cancel a copy before it is completed by calling `cancelOperation` on the poller.
     * Note that the onProgress callback will not be invoked if the operation completes in the first
     * request, and attempting to cancel a completed copy will result in an error being thrown.
     *
     * In version 2012-02-12 and later, the source for a Copy Blob operation can be
     * a committed blob in any Azure storage account.
     * Beginning with version 2015-02-21, the source for a Copy Blob operation can be
     * an Azure file in any Azure storage account.
     * Only storage accounts created on or after June 7th, 2012 allow the Copy Blob
     * operation to copy from another storage account.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/copy-blob
     *
     * Example using automatic polling:
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url');
     * const result = await copyPoller.pollUntilDone();
     * ```
     *
     * Example using manual polling:
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url');
     * while (!poller.isDone()) {
     *    await poller.poll();
     * }
     * const result = copyPoller.getResult();
     * ```
     *
     * Example using progress updates:
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url', {
     *   onProgress(state) {
     *     console.log(`Progress: ${state.copyProgress}`);
     *   }
     * });
     * const result = await copyPoller.pollUntilDone();
     * ```
     *
     * Example using a changing polling interval (default 15 seconds):
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url', {
     *   intervalInMs: 1000 // poll blob every 1 second for copy progress
     * });
     * const result = await copyPoller.pollUntilDone();
     * ```
     *
     * Example using copy cancellation:
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url');
     * // cancel operation after starting it.
     * try {
     *   await copyPoller.cancelOperation();
     *   // calls to get the result now throw PollerCancelledError
     *   await copyPoller.getResult();
     * } catch (err) {
     *   if (err.name === 'PollerCancelledError') {
     *     console.log('The copy was cancelled.');
     *   }
     * }
     * ```
     *
     * @param copySource - url to the source Azure Blob/File.
     * @param options - Optional options to the Blob Start Copy From URL operation.
     */
    async beginCopyFromURL(copySource, options = {}) {
        const client = {
            abortCopyFromURL: (...args) => this.abortCopyFromURL(...args),
            getProperties: (...args) => this.getProperties(...args),
            startCopyFromURL: (...args) => this.startCopyFromURL(...args),
        };
        const poller = new BlobBeginCopyFromUrlPoller({
            blobClient: client,
            copySource,
            intervalInMs: options.intervalInMs,
            onProgress: options.onProgress,
            resumeFrom: options.resumeFrom,
            startCopyFromURLOptions: options,
        });
        // Trigger the startCopyFromURL call by calling poll.
        // Any errors from this method should be surfaced to the user.
        await poller.poll();
        return poller;
    }
    /**
     * Aborts a pending asynchronous Copy Blob operation, and leaves a destination blob with zero
     * length and full metadata. Version 2012-02-12 and newer.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/abort-copy-blob
     *
     * @param copyId - Id of the Copy From URL operation.
     * @param options - Optional options to the Blob Abort Copy From URL operation.
     */
    async abortCopyFromURL(copyId, options = {}) {
        return tracingClient.withSpan("BlobClient-abortCopyFromURL", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.abortCopyFromURL(copyId, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The synchronous Copy From URL operation copies a blob or an internet resource to a new blob. It will not
     * return a response until the copy is complete.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/copy-blob-from-url
     *
     * @param copySource - The source URL to copy from, Shared Access Signature(SAS) maybe needed for authentication
     * @param options -
     */
    async syncCopyFromURL(copySource, options = {}) {
        options.conditions = options.conditions || {};
        options.sourceConditions = options.sourceConditions || {};
        return tracingClient.withSpan("BlobClient-syncCopyFromURL", options, async (updatedOptions) => {
            var _a, _b, _c, _d, _e, _f, _g;
            return assertResponse(await this.blobContext.copyFromURL(copySource, {
                abortSignal: options.abortSignal,
                metadata: options.metadata,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                sourceModifiedAccessConditions: {
                    sourceIfMatch: (_b = options.sourceConditions) === null || _b === void 0 ? void 0 : _b.ifMatch,
                    sourceIfModifiedSince: (_c = options.sourceConditions) === null || _c === void 0 ? void 0 : _c.ifModifiedSince,
                    sourceIfNoneMatch: (_d = options.sourceConditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch,
                    sourceIfUnmodifiedSince: (_e = options.sourceConditions) === null || _e === void 0 ? void 0 : _e.ifUnmodifiedSince,
                },
                sourceContentMD5: options.sourceContentMD5,
                copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization),
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                immutabilityPolicyExpiry: (_f = options.immutabilityPolicy) === null || _f === void 0 ? void 0 : _f.expiriesOn,
                immutabilityPolicyMode: (_g = options.immutabilityPolicy) === null || _g === void 0 ? void 0 : _g.policyMode,
                legalHold: options.legalHold,
                encryptionScope: options.encryptionScope,
                copySourceTags: options.copySourceTags,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets the tier on a blob. The operation is allowed on a page blob in a premium
     * storage account and on a block blob in a blob storage account (locally redundant
     * storage only). A premium page blob's tier determines the allowed size, IOPS,
     * and bandwidth of the blob. A block blob's tier determines Hot/Cool/Archive
     * storage type. This operation does not update the blob's ETag.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-tier
     *
     * @param tier - The tier to be set on the blob. Valid values are Hot, Cool, or Archive.
     * @param options - Optional options to the Blob Set Tier operation.
     */
    async setAccessTier(tier, options = {}) {
        return tracingClient.withSpan("BlobClient-setAccessTier", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.setTier(toAccessTier(tier), {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                rehydratePriority: options.rehydratePriority,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    async downloadToBuffer(param1, param2, param3, param4 = {}) {
        var _a;
        let buffer;
        let offset = 0;
        let count = 0;
        let options = param4;
        if (param1 instanceof Buffer) {
            buffer = param1;
            offset = param2 || 0;
            count = typeof param3 === "number" ? param3 : 0;
        }
        else {
            offset = typeof param1 === "number" ? param1 : 0;
            count = typeof param2 === "number" ? param2 : 0;
            options = param3 || {};
        }
        let blockSize = (_a = options.blockSize) !== null && _a !== void 0 ? _a : 0;
        if (blockSize < 0) {
            throw new RangeError("blockSize option must be >= 0");
        }
        if (blockSize === 0) {
            blockSize = DEFAULT_BLOB_DOWNLOAD_BLOCK_BYTES;
        }
        if (offset < 0) {
            throw new RangeError("offset option must be >= 0");
        }
        if (count && count <= 0) {
            throw new RangeError("count option must be greater than 0");
        }
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("BlobClient-downloadToBuffer", options, async (updatedOptions) => {
            // Customer doesn't specify length, get it
            if (!count) {
                const response = await this.getProperties(Object.assign(Object.assign({}, options), { tracingOptions: updatedOptions.tracingOptions }));
                count = response.contentLength - offset;
                if (count < 0) {
                    throw new RangeError(`offset ${offset} shouldn't be larger than blob size ${response.contentLength}`);
                }
            }
            // Allocate the buffer of size = count if the buffer is not provided
            if (!buffer) {
                try {
                    buffer = Buffer.alloc(count);
                }
                catch (error) {
                    throw new Error(`Unable to allocate the buffer of size: ${count}(in bytes). Please try passing your own buffer to the "downloadToBuffer" method or try using other methods like "download" or "downloadToFile".\t ${error.message}`);
                }
            }
            if (buffer.length < count) {
                throw new RangeError(`The buffer's size should be equal to or larger than the request count of bytes: ${count}`);
            }
            let transferProgress = 0;
            const batch = new Batch(options.concurrency);
            for (let off = offset; off < offset + count; off = off + blockSize) {
                batch.addOperation(async () => {
                    // Exclusive chunk end position
                    let chunkEnd = offset + count;
                    if (off + blockSize < chunkEnd) {
                        chunkEnd = off + blockSize;
                    }
                    const response = await this.download(off, chunkEnd - off, {
                        abortSignal: options.abortSignal,
                        conditions: options.conditions,
                        maxRetryRequests: options.maxRetryRequestsPerBlock,
                        customerProvidedKey: options.customerProvidedKey,
                        tracingOptions: updatedOptions.tracingOptions,
                    });
                    const stream = response.readableStreamBody;
                    await streamToBuffer(stream, buffer, off - offset, chunkEnd - offset);
                    // Update progress after block is downloaded, in case of block trying
                    // Could provide finer grained progress updating inside HTTP requests,
                    // only if convenience layer download try is enabled
                    transferProgress += chunkEnd - off;
                    if (options.onProgress) {
                        options.onProgress({ loadedBytes: transferProgress });
                    }
                });
            }
            await batch.do();
            return buffer;
        });
    }
    /**
     * ONLY AVAILABLE IN NODE.JS RUNTIME.
     *
     * Downloads an Azure Blob to a local file.
     * Fails if the the given file path already exits.
     * Offset and count are optional, pass 0 and undefined respectively to download the entire blob.
     *
     * @param filePath -
     * @param offset - From which position of the block blob to download.
     * @param count - How much data to be downloaded. Will download to the end when passing undefined.
     * @param options - Options to Blob download options.
     * @returns The response data for blob download operation,
     *                                                 but with readableStreamBody set to undefined since its
     *                                                 content is already read and written into a local file
     *                                                 at the specified path.
     */
    async downloadToFile(filePath, offset = 0, count, options = {}) {
        return tracingClient.withSpan("BlobClient-downloadToFile", options, async (updatedOptions) => {
            const response = await this.download(offset, count, Object.assign(Object.assign({}, options), { tracingOptions: updatedOptions.tracingOptions }));
            if (response.readableStreamBody) {
                await readStreamToLocalFile(response.readableStreamBody, filePath);
            }
            // The stream is no longer accessible so setting it to undefined.
            response.blobDownloadStream = undefined;
            return response;
        });
    }
    getBlobAndContainerNamesFromUrl() {
        let containerName;
        let blobName;
        try {
            //  URL may look like the following
            // "https://myaccount.blob.core.windows.net/mycontainer/blob?sasString";
            // "https://myaccount.blob.core.windows.net/mycontainer/blob";
            // "https://myaccount.blob.core.windows.net/mycontainer/blob/a.txt?sasString";
            // "https://myaccount.blob.core.windows.net/mycontainer/blob/a.txt";
            // IPv4/IPv6 address hosts, Endpoints - `http://127.0.0.1:10000/devstoreaccount1/containername/blob`
            // http://localhost:10001/devstoreaccount1/containername/blob
            const parsedUrl = new URL(this.url);
            if (parsedUrl.host.split(".")[1] === "blob") {
                // "https://myaccount.blob.core.windows.net/containername/blob".
                // .getPath() -> /containername/blob
                const pathComponents = parsedUrl.pathname.match("/([^/]*)(/(.*))?");
                containerName = pathComponents[1];
                blobName = pathComponents[3];
            }
            else if (isIpEndpointStyle(parsedUrl)) {
                // IPv4/IPv6 address hosts... Example - http://192.0.0.10:10001/devstoreaccount1/containername/blob
                // Single word domain without a [dot] in the endpoint... Example - http://localhost:10001/devstoreaccount1/containername/blob
                // .getPath() -> /devstoreaccount1/containername/blob
                const pathComponents = parsedUrl.pathname.match("/([^/]*)/([^/]*)(/(.*))?");
                containerName = pathComponents[2];
                blobName = pathComponents[4];
            }
            else {
                // "https://customdomain.com/containername/blob".
                // .getPath() -> /containername/blob
                const pathComponents = parsedUrl.pathname.match("/([^/]*)(/(.*))?");
                containerName = pathComponents[1];
                blobName = pathComponents[3];
            }
            // decode the encoded blobName, containerName - to get all the special characters that might be present in them
            containerName = decodeURIComponent(containerName);
            blobName = decodeURIComponent(blobName);
            // Azure Storage Server will replace "\" with "/" in the blob names
            //   doing the same in the SDK side so that the user doesn't have to replace "\" instances in the blobName
            blobName = blobName.replace(/\\/g, "/");
            if (!containerName) {
                throw new Error("Provided containerName is invalid.");
            }
            return { blobName, containerName };
        }
        catch (error) {
            throw new Error("Unable to extract blobName and containerName with provided information.");
        }
    }
    /**
     * Asynchronously copies a blob to a destination within the storage account.
     * In version 2012-02-12 and later, the source for a Copy Blob operation can be
     * a committed blob in any Azure storage account.
     * Beginning with version 2015-02-21, the source for a Copy Blob operation can be
     * an Azure file in any Azure storage account.
     * Only storage accounts created on or after June 7th, 2012 allow the Copy Blob
     * operation to copy from another storage account.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/copy-blob
     *
     * @param copySource - url to the source Azure Blob/File.
     * @param options - Optional options to the Blob Start Copy From URL operation.
     */
    async startCopyFromURL(copySource, options = {}) {
        return tracingClient.withSpan("BlobClient-startCopyFromURL", options, async (updatedOptions) => {
            var _a, _b, _c;
            options.conditions = options.conditions || {};
            options.sourceConditions = options.sourceConditions || {};
            return assertResponse(await this.blobContext.startCopyFromURL(copySource, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                sourceModifiedAccessConditions: {
                    sourceIfMatch: options.sourceConditions.ifMatch,
                    sourceIfModifiedSince: options.sourceConditions.ifModifiedSince,
                    sourceIfNoneMatch: options.sourceConditions.ifNoneMatch,
                    sourceIfUnmodifiedSince: options.sourceConditions.ifUnmodifiedSince,
                    sourceIfTags: options.sourceConditions.tagConditions,
                },
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                rehydratePriority: options.rehydratePriority,
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                sealBlob: options.sealBlob,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Only available for BlobClient constructed with a shared key credential.
     *
     * Generates a Blob Service Shared Access Signature (SAS) URI based on the client properties
     * and parameters passed in. The SAS is signed by the shared key credential of the client.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateSasUrl(options) {
        return new Promise((resolve) => {
            if (!(this.credential instanceof StorageSharedKeyCredential)) {
                throw new RangeError("Can only generate the SAS when the client is initialized with a shared key credential");
            }
            const sas = generateBlobSASQueryParameters(Object.assign({ containerName: this._containerName, blobName: this._name, snapshotTime: this._snapshot, versionId: this._versionId }, options), this.credential).toString();
            resolve(appendToURLQuery(this.url, sas));
        });
    }
    /**
     * Only available for BlobClient constructed with a shared key credential.
     *
     * Generates string to sign for a Blob Service Shared Access Signature (SAS) URI based on
     * the client properties and parameters passed in. The SAS is signed by the shared key credential of the client.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    generateSasStringToSign(options) {
        if (!(this.credential instanceof StorageSharedKeyCredential)) {
            throw new RangeError("Can only generate the SAS when the client is initialized with a shared key credential");
        }
        return generateBlobSASQueryParametersInternal(Object.assign({ containerName: this._containerName, blobName: this._name, snapshotTime: this._snapshot, versionId: this._versionId }, options), this.credential).stringToSign;
    }
    /**
     *
     * Generates a Blob Service Shared Access Signature (SAS) URI based on
     * the client properties and parameters passed in. The SAS is signed by the input user delegation key.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @param userDelegationKey -  Return value of `blobServiceClient.getUserDelegationKey()`
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateUserDelegationSasUrl(options, userDelegationKey) {
        return new Promise((resolve) => {
            const sas = generateBlobSASQueryParameters(Object.assign({ containerName: this._containerName, blobName: this._name, snapshotTime: this._snapshot, versionId: this._versionId }, options), userDelegationKey, this.accountName).toString();
            resolve(appendToURLQuery(this.url, sas));
        });
    }
    /**
     * Only available for BlobClient constructed with a shared key credential.
     *
     * Generates string to sign for a Blob Service Shared Access Signature (SAS) URI based on
     * the client properties and parameters passed in. The SAS is signed by the input user delegation key.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @param userDelegationKey -  Return value of `blobServiceClient.getUserDelegationKey()`
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateUserDelegationSasStringToSign(options, userDelegationKey) {
        return generateBlobSASQueryParametersInternal(Object.assign({ containerName: this._containerName, blobName: this._name, snapshotTime: this._snapshot, versionId: this._versionId }, options), userDelegationKey, this.accountName).stringToSign;
    }
    /**
     * Delete the immutablility policy on the blob.
     *
     * @param options - Optional options to delete immutability policy on the blob.
     */
    async deleteImmutabilityPolicy(options = {}) {
        return tracingClient.withSpan("BlobClient-deleteImmutabilityPolicy", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.deleteImmutabilityPolicy({
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Set immutability policy on the blob.
     *
     * @param options - Optional options to set immutability policy on the blob.
     */
    async setImmutabilityPolicy(immutabilityPolicy, options = {}) {
        return tracingClient.withSpan("BlobClient-setImmutabilityPolicy", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.setImmutabilityPolicy({
                immutabilityPolicyExpiry: immutabilityPolicy.expiriesOn,
                immutabilityPolicyMode: immutabilityPolicy.policyMode,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Set legal hold on the blob.
     *
     * @param options - Optional options to set legal hold on the blob.
     */
    async setLegalHold(legalHoldEnabled, options = {}) {
        return tracingClient.withSpan("BlobClient-setLegalHold", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.setLegalHold(legalHoldEnabled, {
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Get Account Information operation returns the sku name and account kind
     * for the specified account.
     * The Get Account Information operation is available on service versions beginning
     * with version 2018-03-28.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-account-information
     *
     * @param options - Options to the Service Get Account Info operation.
     * @returns Response data for the Service Get Account Info operation.
     */
    async getAccountInfo(options = {}) {
        return tracingClient.withSpan("BlobClient-getAccountInfo", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.getAccountInfo({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
}
/**
 * AppendBlobClient defines a set of operations applicable to append blobs.
 */
export class AppendBlobClient extends BlobClient {
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, blobNameOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        // In TypeScript we cannot simply pass all parameters to super() like below so have to duplicate the code instead.
        //   super(s, credentialOrPipelineOrContainerNameOrOptions, blobNameOrOptions, options);
        let pipeline;
        let url;
        options = options || {};
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)      url = urlOrConnectionString;
            url = urlOrConnectionString;
            options = blobNameOrOptions;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            // The second parameter is undefined. Use anonymous credential.
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string" &&
            blobNameOrOptions &&
            typeof blobNameOrOptions === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const blobName = blobNameOrOptions;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName and blobName parameters");
        }
        super(url, pipeline);
        this.appendBlobContext = this.storageClientContext.appendBlob;
    }
    /**
     * Creates a new AppendBlobClient object identical to the source but with the
     * specified snapshot timestamp.
     * Provide "" will remove the snapshot and return a Client to the base blob.
     *
     * @param snapshot - The snapshot timestamp.
     * @returns A new AppendBlobClient object identical to the source but with the specified snapshot timestamp.
     */
    withSnapshot(snapshot) {
        return new AppendBlobClient(setURLParameter(this.url, URLConstants.Parameters.SNAPSHOT, snapshot.length === 0 ? undefined : snapshot), this.pipeline);
    }
    /**
     * Creates a 0-length append blob. Call AppendBlock to append data to an append blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param options - Options to the Append Block Create operation.
     *
     *
     * Example usage:
     *
     * ```js
     * const appendBlobClient = containerClient.getAppendBlobClient("<blob name>");
     * await appendBlobClient.create();
     * ```
     */
    async create(options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("AppendBlobClient-create", options, async (updatedOptions) => {
            var _a, _b, _c;
            return assertResponse(await this.appendBlobContext.create(0, {
                abortSignal: options.abortSignal,
                blobHttpHeaders: options.blobHTTPHeaders,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                blobTagsString: toBlobTagsString(options.tags),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Creates a 0-length append blob. Call AppendBlock to append data to an append blob.
     * If the blob with the same name already exists, the content of the existing blob will remain unchanged.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param options -
     */
    async createIfNotExists(options = {}) {
        const conditions = { ifNoneMatch: ETagAny };
        return tracingClient.withSpan("AppendBlobClient-createIfNotExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const res = assertResponse(await this.create(Object.assign(Object.assign({}, updatedOptions), { conditions })));
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "BlobAlreadyExists") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                throw e;
            }
        });
    }
    /**
     * Seals the append blob, making it read only.
     *
     * @param options -
     */
    async seal(options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("AppendBlobClient-seal", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.appendBlobContext.seal({
                abortSignal: options.abortSignal,
                appendPositionAccessConditions: options.conditions,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Commits a new block of data to the end of the existing append blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/append-block
     *
     * @param body - Data to be appended.
     * @param contentLength - Length of the body in bytes.
     * @param options - Options to the Append Block operation.
     *
     *
     * Example usage:
     *
     * ```js
     * const content = "Hello World!";
     *
     * // Create a new append blob and append data to the blob.
     * const newAppendBlobClient = containerClient.getAppendBlobClient("<blob name>");
     * await newAppendBlobClient.create();
     * await newAppendBlobClient.appendBlock(content, content.length);
     *
     * // Append data to an existing append blob.
     * const existingAppendBlobClient = containerClient.getAppendBlobClient("<blob name>");
     * await existingAppendBlobClient.appendBlock(content, content.length);
     * ```
     */
    async appendBlock(body, contentLength, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("AppendBlobClient-appendBlock", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.appendBlobContext.appendBlock(contentLength, body, {
                abortSignal: options.abortSignal,
                appendPositionAccessConditions: options.conditions,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                requestOptions: {
                    onUploadProgress: options.onProgress,
                },
                transactionalContentMD5: options.transactionalContentMD5,
                transactionalContentCrc64: options.transactionalContentCrc64,
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Append Block operation commits a new block of data to the end of an existing append blob
     * where the contents are read from a source url.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/append-block-from-url
     *
     * @param sourceURL -
     *                 The url to the blob that will be the source of the copy. A source blob in the same storage account can
     *                 be authenticated via Shared Key. However, if the source is a blob in another account, the source blob
     *                 must either be public or must be authenticated via a shared access signature. If the source blob is
     *                 public, no authentication is required to perform the operation.
     * @param sourceOffset - Offset in source to be appended
     * @param count - Number of bytes to be appended as a block
     * @param options -
     */
    async appendBlockFromURL(sourceURL, sourceOffset, count, options = {}) {
        options.conditions = options.conditions || {};
        options.sourceConditions = options.sourceConditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("AppendBlobClient-appendBlockFromURL", options, async (updatedOptions) => {
            var _a, _b, _c, _d, _e;
            return assertResponse(await this.appendBlobContext.appendBlockFromUrl(sourceURL, 0, {
                abortSignal: options.abortSignal,
                sourceRange: rangeToString({ offset: sourceOffset, count }),
                sourceContentMD5: options.sourceContentMD5,
                sourceContentCrc64: options.sourceContentCrc64,
                leaseAccessConditions: options.conditions,
                appendPositionAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                sourceModifiedAccessConditions: {
                    sourceIfMatch: (_b = options.sourceConditions) === null || _b === void 0 ? void 0 : _b.ifMatch,
                    sourceIfModifiedSince: (_c = options.sourceConditions) === null || _c === void 0 ? void 0 : _c.ifModifiedSince,
                    sourceIfNoneMatch: (_d = options.sourceConditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch,
                    sourceIfUnmodifiedSince: (_e = options.sourceConditions) === null || _e === void 0 ? void 0 : _e.ifUnmodifiedSince,
                },
                copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
}
/**
 * BlockBlobClient defines a set of operations applicable to block blobs.
 */
export class BlockBlobClient extends BlobClient {
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, blobNameOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        // In TypeScript we cannot simply pass all parameters to super() like below so have to duplicate the code instead.
        //   super(s, credentialOrPipelineOrContainerNameOrOptions, blobNameOrOptions, options);
        let pipeline;
        let url;
        options = options || {};
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            options = blobNameOrOptions;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            // The second parameter is undefined. Use anonymous credential.
            url = urlOrConnectionString;
            if (blobNameOrOptions && typeof blobNameOrOptions !== "string") {
                options = blobNameOrOptions;
            }
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string" &&
            blobNameOrOptions &&
            typeof blobNameOrOptions === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const blobName = blobNameOrOptions;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName and blobName parameters");
        }
        super(url, pipeline);
        this.blockBlobContext = this.storageClientContext.blockBlob;
        this._blobContext = this.storageClientContext.blob;
    }
    /**
     * Creates a new BlockBlobClient object identical to the source but with the
     * specified snapshot timestamp.
     * Provide "" will remove the snapshot and return a URL to the base blob.
     *
     * @param snapshot - The snapshot timestamp.
     * @returns A new BlockBlobClient object identical to the source but with the specified snapshot timestamp.
     */
    withSnapshot(snapshot) {
        return new BlockBlobClient(setURLParameter(this.url, URLConstants.Parameters.SNAPSHOT, snapshot.length === 0 ? undefined : snapshot), this.pipeline);
    }
    /**
     * ONLY AVAILABLE IN NODE.JS RUNTIME.
     *
     * Quick query for a JSON or CSV formatted blob.
     *
     * Example usage (Node.js):
     *
     * ```js
     * // Query and convert a blob to a string
     * const queryBlockBlobResponse = await blockBlobClient.query("select * from BlobStorage");
     * const downloaded = (await streamToBuffer(queryBlockBlobResponse.readableStreamBody)).toString();
     * console.log("Query blob content:", downloaded);
     *
     * async function streamToBuffer(readableStream) {
     *   return new Promise((resolve, reject) => {
     *     const chunks = [];
     *     readableStream.on("data", (data) => {
     *       chunks.push(data instanceof Buffer ? data : Buffer.from(data));
     *     });
     *     readableStream.on("end", () => {
     *       resolve(Buffer.concat(chunks));
     *     });
     *     readableStream.on("error", reject);
     *   });
     * }
     * ```
     *
     * @param query -
     * @param options -
     */
    async query(query, options = {}) {
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        if (!isNode) {
            throw new Error("This operation currently is only supported in Node.js.");
        }
        return tracingClient.withSpan("BlockBlobClient-query", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this._blobContext.query({
                abortSignal: options.abortSignal,
                queryRequest: {
                    queryType: "SQL",
                    expression: query,
                    inputSerialization: toQuerySerialization(options.inputTextConfiguration),
                    outputSerialization: toQuerySerialization(options.outputTextConfiguration),
                },
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return new BlobQueryResponse(response, {
                abortSignal: options.abortSignal,
                onProgress: options.onProgress,
                onError: options.onError,
            });
        });
    }
    /**
     * Creates a new block blob, or updates the content of an existing block blob.
     * Updating an existing block blob overwrites any existing metadata on the blob.
     * Partial updates are not supported; the content of the existing blob is
     * overwritten with the new content. To perform a partial update of a block blob's,
     * use {@link stageBlock} and {@link commitBlockList}.
     *
     * This is a non-parallel uploading method, please use {@link uploadFile},
     * {@link uploadStream} or {@link uploadBrowserData} for better performance
     * with concurrency uploading.
     *
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param body - Blob, string, ArrayBuffer, ArrayBufferView or a function
     *                               which returns a new Readable stream whose offset is from data source beginning.
     * @param contentLength - Length of body in bytes. Use Buffer.byteLength() to calculate body length for a
     *                               string including non non-Base64/Hex-encoded characters.
     * @param options - Options to the Block Blob Upload operation.
     * @returns Response data for the Block Blob Upload operation.
     *
     * Example usage:
     *
     * ```js
     * const content = "Hello world!";
     * const uploadBlobResponse = await blockBlobClient.upload(content, content.length);
     * ```
     */
    async upload(body, contentLength, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-upload", options, async (updatedOptions) => {
            var _a, _b, _c;
            return assertResponse(await this.blockBlobContext.upload(contentLength, body, {
                abortSignal: options.abortSignal,
                blobHttpHeaders: options.blobHTTPHeaders,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                requestOptions: {
                    onUploadProgress: options.onProgress,
                },
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Creates a new Block Blob where the contents of the blob are read from a given URL.
     * This API is supported beginning with the 2020-04-08 version. Partial updates
     * are not supported with Put Blob from URL; the content of an existing blob is overwritten with
     * the content of the new blob.  To perform partial updates to a block blob’s contents using a
     * source URL, use {@link stageBlockFromURL} and {@link commitBlockList}.
     *
     * @param sourceURL - Specifies the URL of the blob. The value
     *                           may be a URL of up to 2 KB in length that specifies a blob.
     *                           The value should be URL-encoded as it would appear
     *                           in a request URI. The source blob must either be public
     *                           or must be authenticated via a shared access signature.
     *                           If the source blob is public, no authentication is required
     *                           to perform the operation. Here are some examples of source object URLs:
     *                           - https://myaccount.blob.core.windows.net/mycontainer/myblob
     *                           - https://myaccount.blob.core.windows.net/mycontainer/myblob?snapshot=<DateTime>
     * @param options - Optional parameters.
     */
    async syncUploadFromURL(sourceURL, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-syncUploadFromURL", options, async (updatedOptions) => {
            var _a, _b, _c, _d, _e, _f;
            return assertResponse(await this.blockBlobContext.putBlobFromUrl(0, sourceURL, Object.assign(Object.assign({}, options), { blobHttpHeaders: options.blobHTTPHeaders, leaseAccessConditions: options.conditions, modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }), sourceModifiedAccessConditions: {
                    sourceIfMatch: (_b = options.sourceConditions) === null || _b === void 0 ? void 0 : _b.ifMatch,
                    sourceIfModifiedSince: (_c = options.sourceConditions) === null || _c === void 0 ? void 0 : _c.ifModifiedSince,
                    sourceIfNoneMatch: (_d = options.sourceConditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch,
                    sourceIfUnmodifiedSince: (_e = options.sourceConditions) === null || _e === void 0 ? void 0 : _e.ifUnmodifiedSince,
                    sourceIfTags: (_f = options.sourceConditions) === null || _f === void 0 ? void 0 : _f.tagConditions,
                }, cpkInfo: options.customerProvidedKey, copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization), tier: toAccessTier(options.tier), blobTagsString: toBlobTagsString(options.tags), copySourceTags: options.copySourceTags, tracingOptions: updatedOptions.tracingOptions })));
        });
    }
    /**
     * Uploads the specified block to the block blob's "staging area" to be later
     * committed by a call to commitBlockList.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-block
     *
     * @param blockId - A 64-byte value that is base64-encoded
     * @param body - Data to upload to the staging area.
     * @param contentLength - Number of bytes to upload.
     * @param options - Options to the Block Blob Stage Block operation.
     * @returns Response data for the Block Blob Stage Block operation.
     */
    async stageBlock(blockId, body, contentLength, options = {}) {
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-stageBlock", options, async (updatedOptions) => {
            return assertResponse(await this.blockBlobContext.stageBlock(blockId, contentLength, body, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                requestOptions: {
                    onUploadProgress: options.onProgress,
                },
                transactionalContentMD5: options.transactionalContentMD5,
                transactionalContentCrc64: options.transactionalContentCrc64,
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Stage Block From URL operation creates a new block to be committed as part
     * of a blob where the contents are read from a URL.
     * This API is available starting in version 2018-03-28.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/put-block-from-url
     *
     * @param blockId - A 64-byte value that is base64-encoded
     * @param sourceURL - Specifies the URL of the blob. The value
     *                           may be a URL of up to 2 KB in length that specifies a blob.
     *                           The value should be URL-encoded as it would appear
     *                           in a request URI. The source blob must either be public
     *                           or must be authenticated via a shared access signature.
     *                           If the source blob is public, no authentication is required
     *                           to perform the operation. Here are some examples of source object URLs:
     *                           - https://myaccount.blob.core.windows.net/mycontainer/myblob
     *                           - https://myaccount.blob.core.windows.net/mycontainer/myblob?snapshot=<DateTime>
     * @param offset - From which position of the blob to download, greater than or equal to 0
     * @param count - How much data to be downloaded, greater than 0. Will download to the end when undefined
     * @param options - Options to the Block Blob Stage Block From URL operation.
     * @returns Response data for the Block Blob Stage Block From URL operation.
     */
    async stageBlockFromURL(blockId, sourceURL, offset = 0, count, options = {}) {
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-stageBlockFromURL", options, async (updatedOptions) => {
            return assertResponse(await this.blockBlobContext.stageBlockFromURL(blockId, 0, sourceURL, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                sourceContentMD5: options.sourceContentMD5,
                sourceContentCrc64: options.sourceContentCrc64,
                sourceRange: offset === 0 && !count ? undefined : rangeToString({ offset, count }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Writes a blob by specifying the list of block IDs that make up the blob.
     * In order to be written as part of a blob, a block must have been successfully written
     * to the server in a prior {@link stageBlock} operation. You can call {@link commitBlockList} to
     * update a blob by uploading only those blocks that have changed, then committing the new and existing
     * blocks together. Any blocks not specified in the block list and permanently deleted.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-block-list
     *
     * @param blocks -  Array of 64-byte value that is base64-encoded
     * @param options - Options to the Block Blob Commit Block List operation.
     * @returns Response data for the Block Blob Commit Block List operation.
     */
    async commitBlockList(blocks, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-commitBlockList", options, async (updatedOptions) => {
            var _a, _b, _c;
            return assertResponse(await this.blockBlobContext.commitBlockList({ latest: blocks }, {
                abortSignal: options.abortSignal,
                blobHttpHeaders: options.blobHTTPHeaders,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns the list of blocks that have been uploaded as part of a block blob
     * using the specified block list filter.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-block-list
     *
     * @param listType - Specifies whether to return the list of committed blocks,
     *                                        the list of uncommitted blocks, or both lists together.
     * @param options - Options to the Block Blob Get Block List operation.
     * @returns Response data for the Block Blob Get Block List operation.
     */
    async getBlockList(listType, options = {}) {
        return tracingClient.withSpan("BlockBlobClient-getBlockList", options, async (updatedOptions) => {
            var _a;
            const res = assertResponse(await this.blockBlobContext.getBlockList(listType, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            if (!res.committedBlocks) {
                res.committedBlocks = [];
            }
            if (!res.uncommittedBlocks) {
                res.uncommittedBlocks = [];
            }
            return res;
        });
    }
    // High level functions
    /**
     * Uploads a Buffer(Node.js)/Blob(browsers)/ArrayBuffer/ArrayBufferView object to a BlockBlob.
     *
     * When data length is no more than the specifiled {@link BlockBlobParallelUploadOptions.maxSingleShotSize} (default is
     * {@link BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES}), this method will use 1 {@link upload} call to finish the upload.
     * Otherwise, this method will call {@link stageBlock} to upload blocks, and finally call {@link commitBlockList}
     * to commit the block list.
     *
     * A common {@link BlockBlobParallelUploadOptions.blobHTTPHeaders} option to set is
     * `blobContentType`, enabling the browser to provide
     * functionality based on file type.
     *
     * @param data - Buffer(Node.js), Blob, ArrayBuffer or ArrayBufferView
     * @param options -
     */
    async uploadData(data, options = {}) {
        return tracingClient.withSpan("BlockBlobClient-uploadData", options, async (updatedOptions) => {
            if (isNode) {
                let buffer;
                if (data instanceof Buffer) {
                    buffer = data;
                }
                else if (data instanceof ArrayBuffer) {
                    buffer = Buffer.from(data);
                }
                else {
                    data = data;
                    buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
                }
                return this.uploadSeekableInternal((offset, size) => buffer.slice(offset, offset + size), buffer.byteLength, updatedOptions);
            }
            else {
                const browserBlob = new Blob([data]);
                return this.uploadSeekableInternal((offset, size) => browserBlob.slice(offset, offset + size), browserBlob.size, updatedOptions);
            }
        });
    }
    /**
     * ONLY AVAILABLE IN BROWSERS.
     *
     * Uploads a browser Blob/File/ArrayBuffer/ArrayBufferView object to block blob.
     *
     * When buffer length lesser than or equal to 256MB, this method will use 1 upload call to finish the upload.
     * Otherwise, this method will call {@link stageBlock} to upload blocks, and finally call
     * {@link commitBlockList} to commit the block list.
     *
     * A common {@link BlockBlobParallelUploadOptions.blobHTTPHeaders} option to set is
     * `blobContentType`, enabling the browser to provide
     * functionality based on file type.
     *
     * @deprecated Use {@link uploadData} instead.
     *
     * @param browserData - Blob, File, ArrayBuffer or ArrayBufferView
     * @param options - Options to upload browser data.
     * @returns Response data for the Blob Upload operation.
     */
    async uploadBrowserData(browserData, options = {}) {
        return tracingClient.withSpan("BlockBlobClient-uploadBrowserData", options, async (updatedOptions) => {
            const browserBlob = new Blob([browserData]);
            return this.uploadSeekableInternal((offset, size) => browserBlob.slice(offset, offset + size), browserBlob.size, updatedOptions);
        });
    }
    /**
     *
     * Uploads data to block blob. Requires a bodyFactory as the data source,
     * which need to return a {@link HttpRequestBody} object with the offset and size provided.
     *
     * When data length is no more than the specified {@link BlockBlobParallelUploadOptions.maxSingleShotSize} (default is
     * {@link BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES}), this method will use 1 {@link upload} call to finish the upload.
     * Otherwise, this method will call {@link stageBlock} to upload blocks, and finally call {@link commitBlockList}
     * to commit the block list.
     *
     * @param bodyFactory -
     * @param size - size of the data to upload.
     * @param options - Options to Upload to Block Blob operation.
     * @returns Response data for the Blob Upload operation.
     */
    async uploadSeekableInternal(bodyFactory, size, options = {}) {
        var _a, _b;
        let blockSize = (_a = options.blockSize) !== null && _a !== void 0 ? _a : 0;
        if (blockSize < 0 || blockSize > BLOCK_BLOB_MAX_STAGE_BLOCK_BYTES) {
            throw new RangeError(`blockSize option must be >= 0 and <= ${BLOCK_BLOB_MAX_STAGE_BLOCK_BYTES}`);
        }
        const maxSingleShotSize = (_b = options.maxSingleShotSize) !== null && _b !== void 0 ? _b : BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES;
        if (maxSingleShotSize < 0 || maxSingleShotSize > BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES) {
            throw new RangeError(`maxSingleShotSize option must be >= 0 and <= ${BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES}`);
        }
        if (blockSize === 0) {
            if (size > BLOCK_BLOB_MAX_STAGE_BLOCK_BYTES * BLOCK_BLOB_MAX_BLOCKS) {
                throw new RangeError(`${size} is too larger to upload to a block blob.`);
            }
            if (size > maxSingleShotSize) {
                blockSize = Math.ceil(size / BLOCK_BLOB_MAX_BLOCKS);
                if (blockSize < DEFAULT_BLOB_DOWNLOAD_BLOCK_BYTES) {
                    blockSize = DEFAULT_BLOB_DOWNLOAD_BLOCK_BYTES;
                }
            }
        }
        if (!options.blobHTTPHeaders) {
            options.blobHTTPHeaders = {};
        }
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("BlockBlobClient-uploadSeekableInternal", options, async (updatedOptions) => {
            if (size <= maxSingleShotSize) {
                return assertResponse(await this.upload(bodyFactory(0, size), size, updatedOptions));
            }
            const numBlocks = Math.floor((size - 1) / blockSize) + 1;
            if (numBlocks > BLOCK_BLOB_MAX_BLOCKS) {
                throw new RangeError(`The buffer's size is too big or the BlockSize is too small;` +
                    `the number of blocks must be <= ${BLOCK_BLOB_MAX_BLOCKS}`);
            }
            const blockList = [];
            const blockIDPrefix = randomUUID();
            let transferProgress = 0;
            const batch = new Batch(options.concurrency);
            for (let i = 0; i < numBlocks; i++) {
                batch.addOperation(async () => {
                    const blockID = generateBlockID(blockIDPrefix, i);
                    const start = blockSize * i;
                    const end = i === numBlocks - 1 ? size : start + blockSize;
                    const contentLength = end - start;
                    blockList.push(blockID);
                    await this.stageBlock(blockID, bodyFactory(start, contentLength), contentLength, {
                        abortSignal: options.abortSignal,
                        conditions: options.conditions,
                        encryptionScope: options.encryptionScope,
                        tracingOptions: updatedOptions.tracingOptions,
                    });
                    // Update progress after block is successfully uploaded to server, in case of block trying
                    // TODO: Hook with convenience layer progress event in finer level
                    transferProgress += contentLength;
                    if (options.onProgress) {
                        options.onProgress({
                            loadedBytes: transferProgress,
                        });
                    }
                });
            }
            await batch.do();
            return this.commitBlockList(blockList, updatedOptions);
        });
    }
    /**
     * ONLY AVAILABLE IN NODE.JS RUNTIME.
     *
     * Uploads a local file in blocks to a block blob.
     *
     * When file size lesser than or equal to 256MB, this method will use 1 upload call to finish the upload.
     * Otherwise, this method will call stageBlock to upload blocks, and finally call commitBlockList
     * to commit the block list.
     *
     * @param filePath - Full path of local file
     * @param options - Options to Upload to Block Blob operation.
     * @returns Response data for the Blob Upload operation.
     */
    async uploadFile(filePath, options = {}) {
        return tracingClient.withSpan("BlockBlobClient-uploadFile", options, async (updatedOptions) => {
            const size = (await fsStat(filePath)).size;
            return this.uploadSeekableInternal((offset, count) => {
                return () => fsCreateReadStream(filePath, {
                    autoClose: true,
                    end: count ? offset + count - 1 : Infinity,
                    start: offset,
                });
            }, size, Object.assign(Object.assign({}, options), { tracingOptions: updatedOptions.tracingOptions }));
        });
    }
    /**
     * ONLY AVAILABLE IN NODE.JS RUNTIME.
     *
     * Uploads a Node.js Readable stream into block blob.
     *
     * PERFORMANCE IMPROVEMENT TIPS:
     * * Input stream highWaterMark is better to set a same value with bufferSize
     *    parameter, which will avoid Buffer.concat() operations.
     *
     * @param stream - Node.js Readable stream
     * @param bufferSize - Size of every buffer allocated, also the block size in the uploaded block blob. Default value is 8MB
     * @param maxConcurrency -  Max concurrency indicates the max number of buffers that can be allocated,
     *                                 positive correlation with max uploading concurrency. Default value is 5
     * @param options - Options to Upload Stream to Block Blob operation.
     * @returns Response data for the Blob Upload operation.
     */
    async uploadStream(stream, bufferSize = DEFAULT_BLOCK_BUFFER_SIZE_BYTES, maxConcurrency = 5, options = {}) {
        if (!options.blobHTTPHeaders) {
            options.blobHTTPHeaders = {};
        }
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("BlockBlobClient-uploadStream", options, async (updatedOptions) => {
            let blockNum = 0;
            const blockIDPrefix = randomUUID();
            let transferProgress = 0;
            const blockList = [];
            const scheduler = new BufferScheduler(stream, bufferSize, maxConcurrency, async (body, length) => {
                const blockID = generateBlockID(blockIDPrefix, blockNum);
                blockList.push(blockID);
                blockNum++;
                await this.stageBlock(blockID, body, length, {
                    customerProvidedKey: options.customerProvidedKey,
                    conditions: options.conditions,
                    encryptionScope: options.encryptionScope,
                    tracingOptions: updatedOptions.tracingOptions,
                });
                // Update progress after block is successfully uploaded to server, in case of block trying
                transferProgress += length;
                if (options.onProgress) {
                    options.onProgress({ loadedBytes: transferProgress });
                }
            }, 
            // concurrency should set a smaller value than maxConcurrency, which is helpful to
            // reduce the possibility when a outgoing handler waits for stream data, in
            // this situation, outgoing handlers are blocked.
            // Outgoing queue shouldn't be empty.
            Math.ceil((maxConcurrency / 4) * 3));
            await scheduler.do();
            return assertResponse(await this.commitBlockList(blockList, Object.assign(Object.assign({}, options), { tracingOptions: updatedOptions.tracingOptions })));
        });
    }
}
/**
 * PageBlobClient defines a set of operations applicable to page blobs.
 */
export class PageBlobClient extends BlobClient {
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, blobNameOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        // In TypeScript we cannot simply pass all parameters to super() like below so have to duplicate the code instead.
        //   super(s, credentialOrPipelineOrContainerNameOrOptions, blobNameOrOptions, options);
        let pipeline;
        let url;
        options = options || {};
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            options = blobNameOrOptions;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            // The second parameter is undefined. Use anonymous credential.
            url = urlOrConnectionString;
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string" &&
            blobNameOrOptions &&
            typeof blobNameOrOptions === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const blobName = blobNameOrOptions;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName and blobName parameters");
        }
        super(url, pipeline);
        this.pageBlobContext = this.storageClientContext.pageBlob;
    }
    /**
     * Creates a new PageBlobClient object identical to the source but with the
     * specified snapshot timestamp.
     * Provide "" will remove the snapshot and return a Client to the base blob.
     *
     * @param snapshot - The snapshot timestamp.
     * @returns A new PageBlobClient object identical to the source but with the specified snapshot timestamp.
     */
    withSnapshot(snapshot) {
        return new PageBlobClient(setURLParameter(this.url, URLConstants.Parameters.SNAPSHOT, snapshot.length === 0 ? undefined : snapshot), this.pipeline);
    }
    /**
     * Creates a page blob of the specified length. Call uploadPages to upload data
     * data to a page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param size - size of the page blob.
     * @param options - Options to the Page Blob Create operation.
     * @returns Response data for the Page Blob Create operation.
     */
    async create(size, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("PageBlobClient-create", options, async (updatedOptions) => {
            var _a, _b, _c;
            return assertResponse(await this.pageBlobContext.create(0, size, {
                abortSignal: options.abortSignal,
                blobHttpHeaders: options.blobHTTPHeaders,
                blobSequenceNumber: options.blobSequenceNumber,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Creates a page blob of the specified length. Call uploadPages to upload data
     * data to a page blob. If the blob with the same name already exists, the content
     * of the existing blob will remain unchanged.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param size - size of the page blob.
     * @param options -
     */
    async createIfNotExists(size, options = {}) {
        return tracingClient.withSpan("PageBlobClient-createIfNotExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const conditions = { ifNoneMatch: ETagAny };
                const res = assertResponse(await this.create(size, Object.assign(Object.assign({}, options), { conditions, tracingOptions: updatedOptions.tracingOptions })));
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "BlobAlreadyExists") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                throw e;
            }
        });
    }
    /**
     * Writes 1 or more pages to the page blob. The start and end offsets must be a multiple of 512.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-page
     *
     * @param body - Data to upload
     * @param offset - Offset of destination page blob
     * @param count - Content length of the body, also number of bytes to be uploaded
     * @param options - Options to the Page Blob Upload Pages operation.
     * @returns Response data for the Page Blob Upload Pages operation.
     */
    async uploadPages(body, offset, count, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("PageBlobClient-uploadPages", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.uploadPages(count, body, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                requestOptions: {
                    onUploadProgress: options.onProgress,
                },
                range: rangeToString({ offset, count }),
                sequenceNumberAccessConditions: options.conditions,
                transactionalContentMD5: options.transactionalContentMD5,
                transactionalContentCrc64: options.transactionalContentCrc64,
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Upload Pages operation writes a range of pages to a page blob where the
     * contents are read from a URL.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/put-page-from-url
     *
     * @param sourceURL - Specify a URL to the copy source, Shared Access Signature(SAS) maybe needed for authentication
     * @param sourceOffset - The source offset to copy from. Pass 0 to copy from the beginning of source page blob
     * @param destOffset - Offset of destination page blob
     * @param count - Number of bytes to be uploaded from source page blob
     * @param options -
     */
    async uploadPagesFromURL(sourceURL, sourceOffset, destOffset, count, options = {}) {
        options.conditions = options.conditions || {};
        options.sourceConditions = options.sourceConditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("PageBlobClient-uploadPagesFromURL", options, async (updatedOptions) => {
            var _a, _b, _c, _d, _e;
            return assertResponse(await this.pageBlobContext.uploadPagesFromURL(sourceURL, rangeToString({ offset: sourceOffset, count }), 0, rangeToString({ offset: destOffset, count }), {
                abortSignal: options.abortSignal,
                sourceContentMD5: options.sourceContentMD5,
                sourceContentCrc64: options.sourceContentCrc64,
                leaseAccessConditions: options.conditions,
                sequenceNumberAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                sourceModifiedAccessConditions: {
                    sourceIfMatch: (_b = options.sourceConditions) === null || _b === void 0 ? void 0 : _b.ifMatch,
                    sourceIfModifiedSince: (_c = options.sourceConditions) === null || _c === void 0 ? void 0 : _c.ifModifiedSince,
                    sourceIfNoneMatch: (_d = options.sourceConditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch,
                    sourceIfUnmodifiedSince: (_e = options.sourceConditions) === null || _e === void 0 ? void 0 : _e.ifUnmodifiedSince,
                },
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Frees the specified pages from the page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-page
     *
     * @param offset - Starting byte position of the pages to clear.
     * @param count - Number of bytes to clear.
     * @param options - Options to the Page Blob Clear Pages operation.
     * @returns Response data for the Page Blob Clear Pages operation.
     */
    async clearPages(offset = 0, count, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-clearPages", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.clearPages(0, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                range: rangeToString({ offset, count }),
                sequenceNumberAccessConditions: options.conditions,
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns the list of valid page ranges for a page blob or snapshot of a page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param options - Options to the Page Blob Get Ranges operation.
     * @returns Response data for the Page Blob Get Ranges operation.
     */
    async getPageRanges(offset = 0, count, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-getPageRanges", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this.pageBlobContext.getPageRanges({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                range: rangeToString({ offset, count }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return rangeResponseFromModel(response);
        });
    }
    /**
     * getPageRangesSegment returns a single segment of page ranges starting from the
     * specified Marker. Use an empty Marker to start enumeration from the beginning.
     * After getting a segment, process it, and then call getPageRangesSegment again
     * (passing the the previously-returned Marker) to get the next segment.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param marker - A string value that identifies the portion of the list to be returned with the next list operation.
     * @param options - Options to PageBlob Get Page Ranges Segment operation.
     */
    async listPageRangesSegment(offset = 0, count, marker, options = {}) {
        return tracingClient.withSpan("PageBlobClient-getPageRangesSegment", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.getPageRanges({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                range: rangeToString({ offset, count }),
                marker: marker,
                maxPageSize: options.maxPageSize,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns an AsyncIterableIterator for {@link PageBlobGetPageRangesResponseModel}
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param marker - A string value that identifies the portion of
     *                          the get of page ranges to be returned with the next getting operation. The
     *                          operation returns the ContinuationToken value within the response body if the
     *                          getting operation did not return all page ranges remaining within the current page.
     *                          The ContinuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of get
     *                          items. The marker value is opaque to the client.
     * @param options - Options to List Page Ranges operation.
     */
    listPageRangeItemSegments() {
        return __asyncGenerator(this, arguments, function* listPageRangeItemSegments_1(offset = 0, count, marker, options = {}) {
            let getPageRangeItemSegmentsResponse;
            if (!!marker || marker === undefined) {
                do {
                    getPageRangeItemSegmentsResponse = yield __await(this.listPageRangesSegment(offset, count, marker, options));
                    marker = getPageRangeItemSegmentsResponse.continuationToken;
                    yield yield __await(yield __await(getPageRangeItemSegmentsResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator of {@link PageRangeInfo} objects
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param options - Options to List Page Ranges operation.
     */
    listPageRangeItems() {
        return __asyncGenerator(this, arguments, function* listPageRangeItems_1(offset = 0, count, options = {}) {
            var _a, e_1, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = __asyncValues(this.listPageRangeItemSegments(offset, count, marker, options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const getPageRangesSegment = _c;
                    yield __await(yield* __asyncDelegator(__asyncValues(ExtractPageRangeInfoItems(getPageRangesSegment))));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to list of page ranges for a page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     *  .byPage() returns an async iterable iterator to list of page ranges for a page blob.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * // Get the pageBlobClient before you run these snippets,
     * // Can be obtained from `blobServiceClient.getContainerClient("<your-container-name>").getPageBlobClient("<your-blob-name>");`
     * let i = 1;
     * for await (const pageRange of pageBlobClient.listPageRanges()) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * let iter = pageBlobClient.listPageRanges();
     * let pageRangeItem = await iter.next();
     * while (!pageRangeItem.done) {
     *   console.log(`Page range ${i++}: ${pageRangeItem.value.start} - ${pageRangeItem.value.end}, IsClear: ${pageRangeItem.value.isClear}`);
     *   pageRangeItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of pageBlobClient.listPageRanges().byPage({ maxPageSize: 20 })) {
     *   for (const pageRange of response) {
     *     console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = pageBlobClient.listPageRanges().byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 page ranges
     * for (const pageRange of response) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     *
     * // Passing next marker as continuationToken
     *
     * iterator = pageBlobClient.listPageRanges().byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints 10 page ranges
     * for (const blob of response) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     * ```
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param options - Options to the Page Blob Get Ranges operation.
     * @returns An asyncIterableIterator that supports paging.
     */
    listPageRanges(offset = 0, count, options = {}) {
        options.conditions = options.conditions || {};
        // AsyncIterableIterator to iterate over blobs
        const iter = this.listPageRangeItems(offset, count, options);
        return {
            /**
             * The next method, part of the iteration protocol
             */
            next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.listPageRangeItemSegments(offset, count, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, options));
            },
        };
    }
    /**
     * Gets the collection of page ranges that differ between a specified snapshot and this page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page blob
     * @param count - Number of bytes to get ranges diff.
     * @param prevSnapshot - Timestamp of snapshot to retrieve the difference.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     * @returns Response data for the Page Blob Get Page Range Diff operation.
     */
    async getPageRangesDiff(offset, count, prevSnapshot, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-getPageRangesDiff", options, async (updatedOptions) => {
            var _a;
            const result = assertResponse(await this.pageBlobContext.getPageRangesDiff({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                prevsnapshot: prevSnapshot,
                range: rangeToString({ offset, count }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return rangeResponseFromModel(result);
        });
    }
    /**
     * getPageRangesDiffSegment returns a single segment of page ranges starting from the
     * specified Marker for difference between previous snapshot and the target page blob.
     * Use an empty Marker to start enumeration from the beginning.
     * After getting a segment, process it, and then call getPageRangesDiffSegment again
     * (passing the the previously-returned Marker) to get the next segment.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param prevSnapshotOrUrl - Timestamp of snapshot to retrieve the difference or URL of snapshot to retrieve the difference.
     * @param marker - A string value that identifies the portion of the get to be returned with the next get operation.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     */
    async listPageRangesDiffSegment(offset, count, prevSnapshotOrUrl, marker, options = {}) {
        return tracingClient.withSpan("PageBlobClient-getPageRangesDiffSegment", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.getPageRangesDiff({
                abortSignal: options === null || options === void 0 ? void 0 : options.abortSignal,
                leaseAccessConditions: options === null || options === void 0 ? void 0 : options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options === null || options === void 0 ? void 0 : options.conditions), { ifTags: (_a = options === null || options === void 0 ? void 0 : options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                prevsnapshot: prevSnapshotOrUrl,
                range: rangeToString({
                    offset: offset,
                    count: count,
                }),
                marker: marker,
                maxPageSize: options === null || options === void 0 ? void 0 : options.maxPageSize,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns an AsyncIterableIterator for {@link PageBlobGetPageRangesDiffResponseModel}
     *
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param prevSnapshotOrUrl - Timestamp of snapshot to retrieve the difference or URL of snapshot to retrieve the difference.
     * @param marker - A string value that identifies the portion of
     *                          the get of page ranges to be returned with the next getting operation. The
     *                          operation returns the ContinuationToken value within the response body if the
     *                          getting operation did not return all page ranges remaining within the current page.
     *                          The ContinuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of get
     *                          items. The marker value is opaque to the client.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     */
    listPageRangeDiffItemSegments(offset, count, prevSnapshotOrUrl, marker, options) {
        return __asyncGenerator(this, arguments, function* listPageRangeDiffItemSegments_1() {
            let getPageRangeItemSegmentsResponse;
            if (!!marker || marker === undefined) {
                do {
                    getPageRangeItemSegmentsResponse = yield __await(this.listPageRangesDiffSegment(offset, count, prevSnapshotOrUrl, marker, options));
                    marker = getPageRangeItemSegmentsResponse.continuationToken;
                    yield yield __await(yield __await(getPageRangeItemSegmentsResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator of {@link PageRangeInfo} objects
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param prevSnapshotOrUrl - Timestamp of snapshot to retrieve the difference or URL of snapshot to retrieve the difference.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     */
    listPageRangeDiffItems(offset, count, prevSnapshotOrUrl, options) {
        return __asyncGenerator(this, arguments, function* listPageRangeDiffItems_1() {
            var _a, e_2, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = __asyncValues(this.listPageRangeDiffItemSegments(offset, count, prevSnapshotOrUrl, marker, options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const getPageRangesSegment = _c;
                    yield __await(yield* __asyncDelegator(__asyncValues(ExtractPageRangeInfoItems(getPageRangesSegment))));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to list of page ranges that differ between a specified snapshot and this page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     *  .byPage() returns an async iterable iterator to list of page ranges that differ between a specified snapshot and this page blob.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * // Get the pageBlobClient before you run these snippets,
     * // Can be obtained from `blobServiceClient.getContainerClient("<your-container-name>").getPageBlobClient("<your-blob-name>");`
     * let i = 1;
     * for await (const pageRange of pageBlobClient.listPageRangesDiff()) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * let iter = pageBlobClient.listPageRangesDiff();
     * let pageRangeItem = await iter.next();
     * while (!pageRangeItem.done) {
     *   console.log(`Page range ${i++}: ${pageRangeItem.value.start} - ${pageRangeItem.value.end}, IsClear: ${pageRangeItem.value.isClear}`);
     *   pageRangeItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of pageBlobClient.listPageRangesDiff().byPage({ maxPageSize: 20 })) {
     *   for (const pageRange of response) {
     *     console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = pageBlobClient.listPageRangesDiff().byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 page ranges
     * for (const pageRange of response) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     *
     * // Passing next marker as continuationToken
     *
     * iterator = pageBlobClient.listPageRangesDiff().byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints 10 page ranges
     * for (const blob of response) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     * ```
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param prevSnapshot - Timestamp of snapshot to retrieve the difference.
     * @param options - Options to the Page Blob Get Ranges operation.
     * @returns An asyncIterableIterator that supports paging.
     */
    listPageRangesDiff(offset, count, prevSnapshot, options = {}) {
        options.conditions = options.conditions || {};
        // AsyncIterableIterator to iterate over blobs
        const iter = this.listPageRangeDiffItems(offset, count, prevSnapshot, Object.assign({}, options));
        return {
            /**
             * The next method, part of the iteration protocol
             */
            next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.listPageRangeDiffItemSegments(offset, count, prevSnapshot, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, options));
            },
        };
    }
    /**
     * Gets the collection of page ranges that differ between a specified snapshot and this page blob for managed disks.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page blob
     * @param count - Number of bytes to get ranges diff.
     * @param prevSnapshotUrl - URL of snapshot to retrieve the difference.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     * @returns Response data for the Page Blob Get Page Range Diff operation.
     */
    async getPageRangesDiffForManagedDisks(offset, count, prevSnapshotUrl, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-GetPageRangesDiffForManagedDisks", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this.pageBlobContext.getPageRangesDiff({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                prevSnapshotUrl,
                range: rangeToString({ offset, count }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return rangeResponseFromModel(response);
        });
    }
    /**
     * Resizes the page blob to the specified size (which must be a multiple of 512).
     * @see https://docs.microsoft.com/rest/api/storageservices/set-blob-properties
     *
     * @param size - Target size
     * @param options - Options to the Page Blob Resize operation.
     * @returns Response data for the Page Blob Resize operation.
     */
    async resize(size, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-resize", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.resize(size, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets a page blob's sequence number.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-properties
     *
     * @param sequenceNumberAction - Indicates how the service should modify the blob's sequence number.
     * @param sequenceNumber - Required if sequenceNumberAction is max or update
     * @param options - Options to the Page Blob Update Sequence Number operation.
     * @returns Response data for the Page Blob Update Sequence Number operation.
     */
    async updateSequenceNumber(sequenceNumberAction, sequenceNumber, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-updateSequenceNumber", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.updateSequenceNumber(sequenceNumberAction, {
                abortSignal: options.abortSignal,
                blobSequenceNumber: sequenceNumber,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Begins an operation to start an incremental copy from one page blob's snapshot to this page blob.
     * The snapshot is copied such that only the differential changes between the previously
     * copied snapshot are transferred to the destination.
     * The copied snapshots are complete copies of the original snapshot and can be read or copied from as usual.
     * @see https://docs.microsoft.com/rest/api/storageservices/incremental-copy-blob
     * @see https://docs.microsoft.com/en-us/azure/virtual-machines/windows/incremental-snapshots
     *
     * @param copySource - Specifies the name of the source page blob snapshot. For example,
     *                            https://myaccount.blob.core.windows.net/mycontainer/myblob?snapshot=<DateTime>
     * @param options - Options to the Page Blob Copy Incremental operation.
     * @returns Response data for the Page Blob Copy Incremental operation.
     */
    async startCopyIncremental(copySource, options = {}) {
        return tracingClient.withSpan("PageBlobClient-startCopyIncremental", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.copyIncremental(copySource, {
                abortSignal: options.abortSignal,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
}
//# sourceMappingURL=Clients.js.map