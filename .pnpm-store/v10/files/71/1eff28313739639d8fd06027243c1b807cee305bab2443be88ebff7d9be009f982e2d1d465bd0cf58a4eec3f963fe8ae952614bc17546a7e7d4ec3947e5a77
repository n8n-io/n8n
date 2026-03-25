import { __asyncDelegator, __asyncGenerator, __asyncValues, __await } from "tslib";
import { getDefaultProxySettings } from "@azure/core-rest-pipeline";
import { isNode } from "@azure/core-util";
import { isTokenCredential } from "@azure/core-auth";
import { AnonymousCredential } from "./credentials/AnonymousCredential";
import { StorageSharedKeyCredential } from "./credentials/StorageSharedKeyCredential";
import { newPipeline, isPipelineLike } from "./Pipeline";
import { StorageClient } from "./StorageClient";
import { tracingClient } from "./utils/tracing";
import { appendToURLPath, appendToURLQuery, assertResponse, BlobNameToString, ConvertInternalResponseOfListBlobFlat, ConvertInternalResponseOfListBlobHierarchy, EscapePath, extractConnectionStringParts, isIpEndpointStyle, parseObjectReplicationRecord, toTags, truncatedISO8061Date, } from "./utils/utils.common";
import { generateBlobSASQueryParameters, generateBlobSASQueryParametersInternal, } from "./sas/BlobSASSignatureValues";
import { BlobLeaseClient } from "./BlobLeaseClient";
import { AppendBlobClient, BlobClient, BlockBlobClient, PageBlobClient } from "./Clients";
import { BlobBatchClient } from "./BlobBatchClient";
/**
 * A ContainerClient represents a URL to the Azure Storage container allowing you to manipulate its blobs.
 */
export class ContainerClient extends StorageClient {
    /**
     * The name of the container.
     */
    get containerName() {
        return this._containerName;
    }
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
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
            typeof credentialOrPipelineOrContainerName === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(extractedCreds.url, encodeURIComponent(containerName));
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
                    appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName parameter");
        }
        super(url, pipeline);
        this._containerName = this.getContainerNameFromUrl();
        this.containerContext = this.storageClientContext.container;
    }
    /**
     * Creates a new container under the specified account. If the container with
     * the same name already exists, the operation fails.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-container
     * Naming rules: @see https://learn.microsoft.com/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata
     *
     * @param options - Options to Container Create operation.
     *
     *
     * Example usage:
     *
     * ```js
     * const containerClient = blobServiceClient.getContainerClient("<container name>");
     * const createContainerResponse = await containerClient.create();
     * console.log("Container was created successfully", createContainerResponse.requestId);
     * ```
     */
    async create(options = {}) {
        return tracingClient.withSpan("ContainerClient-create", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.create(updatedOptions));
        });
    }
    /**
     * Creates a new container under the specified account. If the container with
     * the same name already exists, it is not changed.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-container
     * Naming rules: @see https://learn.microsoft.com/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata
     *
     * @param options -
     */
    async createIfNotExists(options = {}) {
        return tracingClient.withSpan("ContainerClient-createIfNotExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const res = await this.create(updatedOptions);
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "ContainerAlreadyExists") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                else {
                    throw e;
                }
            }
        });
    }
    /**
     * Returns true if the Azure container resource represented by this client exists; false otherwise.
     *
     * NOTE: use this function with care since an existing container might be deleted by other clients or
     * applications. Vice versa new containers with the same name might be added by other clients or
     * applications after this function completes.
     *
     * @param options -
     */
    async exists(options = {}) {
        return tracingClient.withSpan("ContainerClient-exists", options, async (updatedOptions) => {
            try {
                await this.getProperties({
                    abortSignal: options.abortSignal,
                    tracingOptions: updatedOptions.tracingOptions,
                });
                return true;
            }
            catch (e) {
                if (e.statusCode === 404) {
                    return false;
                }
                throw e;
            }
        });
    }
    /**
     * Creates a {@link BlobClient}
     *
     * @param blobName - A blob name
     * @returns A new BlobClient object for the given blob name.
     */
    getBlobClient(blobName) {
        return new BlobClient(appendToURLPath(this.url, EscapePath(blobName)), this.pipeline);
    }
    /**
     * Creates an {@link AppendBlobClient}
     *
     * @param blobName - An append blob name
     */
    getAppendBlobClient(blobName) {
        return new AppendBlobClient(appendToURLPath(this.url, EscapePath(blobName)), this.pipeline);
    }
    /**
     * Creates a {@link BlockBlobClient}
     *
     * @param blobName - A block blob name
     *
     *
     * Example usage:
     *
     * ```js
     * const content = "Hello world!";
     *
     * const blockBlobClient = containerClient.getBlockBlobClient("<blob name>");
     * const uploadBlobResponse = await blockBlobClient.upload(content, content.length);
     * ```
     */
    getBlockBlobClient(blobName) {
        return new BlockBlobClient(appendToURLPath(this.url, EscapePath(blobName)), this.pipeline);
    }
    /**
     * Creates a {@link PageBlobClient}
     *
     * @param blobName - A page blob name
     */
    getPageBlobClient(blobName) {
        return new PageBlobClient(appendToURLPath(this.url, EscapePath(blobName)), this.pipeline);
    }
    /**
     * Returns all user-defined metadata and system properties for the specified
     * container. The data returned does not include the container's list of blobs.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-container-properties
     *
     * WARNING: The `metadata` object returned in the response will have its keys in lowercase, even if
     * they originally contained uppercase characters. This differs from the metadata keys returned by
     * the `listContainers` method of {@link BlobServiceClient} using the `includeMetadata` option, which
     * will retain their original casing.
     *
     * @param options - Options to Container Get Properties operation.
     */
    async getProperties(options = {}) {
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("ContainerClient-getProperties", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.getProperties(Object.assign(Object.assign({ abortSignal: options.abortSignal }, options.conditions), { tracingOptions: updatedOptions.tracingOptions })));
        });
    }
    /**
     * Marks the specified container for deletion. The container and any blobs
     * contained within it are later deleted during garbage collection.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-container
     *
     * @param options - Options to Container Delete operation.
     */
    async delete(options = {}) {
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("ContainerClient-delete", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.delete({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Marks the specified container for deletion if it exists. The container and any blobs
     * contained within it are later deleted during garbage collection.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-container
     *
     * @param options - Options to Container Delete operation.
     */
    async deleteIfExists(options = {}) {
        return tracingClient.withSpan("ContainerClient-deleteIfExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const res = await this.delete(updatedOptions);
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "ContainerNotFound") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                throw e;
            }
        });
    }
    /**
     * Sets one or more user-defined name-value pairs for the specified container.
     *
     * If no option provided, or no metadata defined in the parameter, the container
     * metadata will be removed.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-container-metadata
     *
     * @param metadata - Replace existing metadata with this value.
     *                            If no value provided the existing metadata will be removed.
     * @param options - Options to Container Set Metadata operation.
     */
    async setMetadata(metadata, options = {}) {
        if (!options.conditions) {
            options.conditions = {};
        }
        if (options.conditions.ifUnmodifiedSince) {
            throw new RangeError("the IfUnmodifiedSince must have their default values because they are ignored by the blob service");
        }
        return tracingClient.withSpan("ContainerClient-setMetadata", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.setMetadata({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                metadata,
                modifiedAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Gets the permissions for the specified container. The permissions indicate
     * whether container data may be accessed publicly.
     *
     * WARNING: JavaScript Date will potentially lose precision when parsing startsOn and expiresOn strings.
     * For example, new Date("2018-12-31T03:44:23.8827891Z").toISOString() will get "2018-12-31T03:44:23.882Z".
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-container-acl
     *
     * @param options - Options to Container Get Access Policy operation.
     */
    async getAccessPolicy(options = {}) {
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("ContainerClient-getAccessPolicy", options, async (updatedOptions) => {
            const response = assertResponse(await this.containerContext.getAccessPolicy({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const res = {
                _response: response._response,
                blobPublicAccess: response.blobPublicAccess,
                date: response.date,
                etag: response.etag,
                errorCode: response.errorCode,
                lastModified: response.lastModified,
                requestId: response.requestId,
                clientRequestId: response.clientRequestId,
                signedIdentifiers: [],
                version: response.version,
            };
            for (const identifier of response) {
                let accessPolicy = undefined;
                if (identifier.accessPolicy) {
                    accessPolicy = {
                        permissions: identifier.accessPolicy.permissions,
                    };
                    if (identifier.accessPolicy.expiresOn) {
                        accessPolicy.expiresOn = new Date(identifier.accessPolicy.expiresOn);
                    }
                    if (identifier.accessPolicy.startsOn) {
                        accessPolicy.startsOn = new Date(identifier.accessPolicy.startsOn);
                    }
                }
                res.signedIdentifiers.push({
                    accessPolicy,
                    id: identifier.id,
                });
            }
            return res;
        });
    }
    /**
     * Sets the permissions for the specified container. The permissions indicate
     * whether blobs in a container may be accessed publicly.
     *
     * When you set permissions for a container, the existing permissions are replaced.
     * If no access or containerAcl provided, the existing container ACL will be
     * removed.
     *
     * When you establish a stored access policy on a container, it may take up to 30 seconds to take effect.
     * During this interval, a shared access signature that is associated with the stored access policy will
     * fail with status code 403 (Forbidden), until the access policy becomes active.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-container-acl
     *
     * @param access - The level of public access to data in the container.
     * @param containerAcl - Array of elements each having a unique Id and details of the access policy.
     * @param options - Options to Container Set Access Policy operation.
     */
    async setAccessPolicy(access, containerAcl, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("ContainerClient-setAccessPolicy", options, async (updatedOptions) => {
            const acl = [];
            for (const identifier of containerAcl || []) {
                acl.push({
                    accessPolicy: {
                        expiresOn: identifier.accessPolicy.expiresOn
                            ? truncatedISO8061Date(identifier.accessPolicy.expiresOn)
                            : "",
                        permissions: identifier.accessPolicy.permissions,
                        startsOn: identifier.accessPolicy.startsOn
                            ? truncatedISO8061Date(identifier.accessPolicy.startsOn)
                            : "",
                    },
                    id: identifier.id,
                });
            }
            return assertResponse(await this.containerContext.setAccessPolicy({
                abortSignal: options.abortSignal,
                access,
                containerAcl: acl,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Get a {@link BlobLeaseClient} that manages leases on the container.
     *
     * @param proposeLeaseId - Initial proposed lease Id.
     * @returns A new BlobLeaseClient object for managing leases on the container.
     */
    getBlobLeaseClient(proposeLeaseId) {
        return new BlobLeaseClient(this, proposeLeaseId);
    }
    /**
     * Creates a new block blob, or updates the content of an existing block blob.
     *
     * Updating an existing block blob overwrites any existing metadata on the blob.
     * Partial updates are not supported; the content of the existing blob is
     * overwritten with the new content. To perform a partial update of a block blob's,
     * use {@link BlockBlobClient.stageBlock} and {@link BlockBlobClient.commitBlockList}.
     *
     * This is a non-parallel uploading method, please use {@link BlockBlobClient.uploadFile},
     * {@link BlockBlobClient.uploadStream} or {@link BlockBlobClient.uploadBrowserData} for better
     * performance with concurrency uploading.
     *
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param blobName - Name of the block blob to create or update.
     * @param body - Blob, string, ArrayBuffer, ArrayBufferView or a function
     *                               which returns a new Readable stream whose offset is from data source beginning.
     * @param contentLength - Length of body in bytes. Use Buffer.byteLength() to calculate body length for a
     *                               string including non non-Base64/Hex-encoded characters.
     * @param options - Options to configure the Block Blob Upload operation.
     * @returns Block Blob upload response data and the corresponding BlockBlobClient instance.
     */
    async uploadBlockBlob(blobName, body, contentLength, options = {}) {
        return tracingClient.withSpan("ContainerClient-uploadBlockBlob", options, async (updatedOptions) => {
            const blockBlobClient = this.getBlockBlobClient(blobName);
            const response = await blockBlobClient.upload(body, contentLength, updatedOptions);
            return {
                blockBlobClient,
                response,
            };
        });
    }
    /**
     * Marks the specified blob or snapshot for deletion. The blob is later deleted
     * during garbage collection. Note that in order to delete a blob, you must delete
     * all of its snapshots. You can delete both at the same time with the Delete
     * Blob operation.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-blob
     *
     * @param blobName -
     * @param options - Options to Blob Delete operation.
     * @returns Block blob deletion response data.
     */
    async deleteBlob(blobName, options = {}) {
        return tracingClient.withSpan("ContainerClient-deleteBlob", options, async (updatedOptions) => {
            let blobClient = this.getBlobClient(blobName);
            if (options.versionId) {
                blobClient = blobClient.withVersion(options.versionId);
            }
            return blobClient.delete(updatedOptions);
        });
    }
    /**
     * listBlobFlatSegment returns a single segment of blobs starting from the
     * specified Marker. Use an empty Marker to start enumeration from the beginning.
     * After getting a segment, process it, and then call listBlobsFlatSegment again
     * (passing the the previously-returned Marker) to get the next segment.
     * @see https://docs.microsoft.com/rest/api/storageservices/list-blobs
     *
     * @param marker - A string value that identifies the portion of the list to be returned with the next list operation.
     * @param options - Options to Container List Blob Flat Segment operation.
     */
    async listBlobFlatSegment(marker, options = {}) {
        return tracingClient.withSpan("ContainerClient-listBlobFlatSegment", options, async (updatedOptions) => {
            const response = assertResponse(await this.containerContext.listBlobFlatSegment(Object.assign(Object.assign({ marker }, options), { tracingOptions: updatedOptions.tracingOptions })));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: Object.assign(Object.assign({}, response._response), { parsedBody: ConvertInternalResponseOfListBlobFlat(response._response.parsedBody) }), segment: Object.assign(Object.assign({}, response.segment), { blobItems: response.segment.blobItems.map((blobItemInternal) => {
                        const blobItem = Object.assign(Object.assign({}, blobItemInternal), { name: BlobNameToString(blobItemInternal.name), tags: toTags(blobItemInternal.blobTags), objectReplicationSourceProperties: parseObjectReplicationRecord(blobItemInternal.objectReplicationMetadata) });
                        return blobItem;
                    }) }) });
            return wrappedResponse;
        });
    }
    /**
     * listBlobHierarchySegment returns a single segment of blobs starting from
     * the specified Marker. Use an empty Marker to start enumeration from the
     * beginning. After getting a segment, process it, and then call listBlobsHierarchicalSegment
     * again (passing the the previously-returned Marker) to get the next segment.
     * @see https://docs.microsoft.com/rest/api/storageservices/list-blobs
     *
     * @param delimiter - The character or string used to define the virtual hierarchy
     * @param marker - A string value that identifies the portion of the list to be returned with the next list operation.
     * @param options - Options to Container List Blob Hierarchy Segment operation.
     */
    async listBlobHierarchySegment(delimiter, marker, options = {}) {
        return tracingClient.withSpan("ContainerClient-listBlobHierarchySegment", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this.containerContext.listBlobHierarchySegment(delimiter, Object.assign(Object.assign({ marker }, options), { tracingOptions: updatedOptions.tracingOptions })));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: Object.assign(Object.assign({}, response._response), { parsedBody: ConvertInternalResponseOfListBlobHierarchy(response._response.parsedBody) }), segment: Object.assign(Object.assign({}, response.segment), { blobItems: response.segment.blobItems.map((blobItemInternal) => {
                        const blobItem = Object.assign(Object.assign({}, blobItemInternal), { name: BlobNameToString(blobItemInternal.name), tags: toTags(blobItemInternal.blobTags), objectReplicationSourceProperties: parseObjectReplicationRecord(blobItemInternal.objectReplicationMetadata) });
                        return blobItem;
                    }), blobPrefixes: (_a = response.segment.blobPrefixes) === null || _a === void 0 ? void 0 : _a.map((blobPrefixInternal) => {
                        const blobPrefix = Object.assign(Object.assign({}, blobPrefixInternal), { name: BlobNameToString(blobPrefixInternal.name) });
                        return blobPrefix;
                    }) }) });
            return wrappedResponse;
        });
    }
    /**
     * Returns an AsyncIterableIterator for ContainerListBlobFlatSegmentResponse
     *
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the ContinuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The ContinuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to list blobs operation.
     */
    listSegments(marker_1) {
        return __asyncGenerator(this, arguments, function* listSegments_1(marker, options = {}) {
            let listBlobsFlatSegmentResponse;
            if (!!marker || marker === undefined) {
                do {
                    listBlobsFlatSegmentResponse = yield __await(this.listBlobFlatSegment(marker, options));
                    marker = listBlobsFlatSegmentResponse.continuationToken;
                    yield yield __await(yield __await(listBlobsFlatSegmentResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator of {@link BlobItem} objects
     *
     * @param options - Options to list blobs operation.
     */
    listItems() {
        return __asyncGenerator(this, arguments, function* listItems_1(options = {}) {
            var _a, e_1, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = __asyncValues(this.listSegments(marker, options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const listBlobsFlatSegmentResponse = _c;
                    yield __await(yield* __asyncDelegator(__asyncValues(listBlobsFlatSegmentResponse.segment.blobItems)));
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
     * Returns an async iterable iterator to list all the blobs
     * under the specified account.
     *
     * .byPage() returns an async iterable iterator to list the blobs in pages.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * // Get the containerClient before you run these snippets,
     * // Can be obtained from `blobServiceClient.getContainerClient("<your-container-name>");`
     * let i = 1;
     * for await (const blob of containerClient.listBlobsFlat()) {
     *   console.log(`Blob ${i++}: ${blob.name}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * let iter = containerClient.listBlobsFlat();
     * let blobItem = await iter.next();
     * while (!blobItem.done) {
     *   console.log(`Blob ${i++}: ${blobItem.value.name}`);
     *   blobItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of containerClient.listBlobsFlat().byPage({ maxPageSize: 20 })) {
     *   for (const blob of response.segment.blobItems) {
     *     console.log(`Blob ${i++}: ${blob.name}`);
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = containerClient.listBlobsFlat().byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 blob names
     * for (const blob of response.segment.blobItems) {
     *   console.log(`Blob ${i++}: ${blob.name}`);
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     *
     * // Passing next marker as continuationToken
     *
     * iterator = containerClient.listBlobsFlat().byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints 10 blob names
     * for (const blob of response.segment.blobItems) {
     *   console.log(`Blob ${i++}: ${blob.name}`);
     * }
     * ```
     *
     * @param options - Options to list blobs.
     * @returns An asyncIterableIterator that supports paging.
     */
    listBlobsFlat(options = {}) {
        const include = [];
        if (options.includeCopy) {
            include.push("copy");
        }
        if (options.includeDeleted) {
            include.push("deleted");
        }
        if (options.includeMetadata) {
            include.push("metadata");
        }
        if (options.includeSnapshots) {
            include.push("snapshots");
        }
        if (options.includeVersions) {
            include.push("versions");
        }
        if (options.includeUncommitedBlobs) {
            include.push("uncommittedblobs");
        }
        if (options.includeTags) {
            include.push("tags");
        }
        if (options.includeDeletedWithVersions) {
            include.push("deletedwithversions");
        }
        if (options.includeImmutabilityPolicy) {
            include.push("immutabilitypolicy");
        }
        if (options.includeLegalHold) {
            include.push("legalhold");
        }
        if (options.prefix === "") {
            options.prefix = undefined;
        }
        const updatedOptions = Object.assign(Object.assign({}, options), (include.length > 0 ? { include: include } : {}));
        // AsyncIterableIterator to iterate over blobs
        const iter = this.listItems(updatedOptions);
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
                return this.listSegments(settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, updatedOptions));
            },
        };
    }
    /**
     * Returns an AsyncIterableIterator for ContainerListBlobHierarchySegmentResponse
     *
     * @param delimiter - The character or string used to define the virtual hierarchy
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the ContinuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The ContinuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to list blobs operation.
     */
    listHierarchySegments(delimiter_1, marker_1) {
        return __asyncGenerator(this, arguments, function* listHierarchySegments_1(delimiter, marker, options = {}) {
            let listBlobsHierarchySegmentResponse;
            if (!!marker || marker === undefined) {
                do {
                    listBlobsHierarchySegmentResponse = yield __await(this.listBlobHierarchySegment(delimiter, marker, options));
                    marker = listBlobsHierarchySegmentResponse.continuationToken;
                    yield yield __await(yield __await(listBlobsHierarchySegmentResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator for {@link BlobPrefix} and {@link BlobItem} objects.
     *
     * @param delimiter - The character or string used to define the virtual hierarchy
     * @param options - Options to list blobs operation.
     */
    listItemsByHierarchy(delimiter_1) {
        return __asyncGenerator(this, arguments, function* listItemsByHierarchy_1(delimiter, options = {}) {
            var _a, e_2, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = __asyncValues(this.listHierarchySegments(delimiter, marker, options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const listBlobsHierarchySegmentResponse = _c;
                    const segment = listBlobsHierarchySegmentResponse.segment;
                    if (segment.blobPrefixes) {
                        for (const prefix of segment.blobPrefixes) {
                            yield yield __await(Object.assign({ kind: "prefix" }, prefix));
                        }
                    }
                    for (const blob of segment.blobItems) {
                        yield yield __await(Object.assign({ kind: "blob" }, blob));
                    }
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
     * Returns an async iterable iterator to list all the blobs by hierarchy.
     * under the specified account.
     *
     * .byPage() returns an async iterable iterator to list the blobs by hierarchy in pages.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * for await (const item of containerClient.listBlobsByHierarchy("/")) {
     *   if (item.kind === "prefix") {
     *     console.log(`\tBlobPrefix: ${item.name}`);
     *   } else {
     *     console.log(`\tBlobItem: name - ${item.name}`);
     *   }
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let iter = containerClient.listBlobsByHierarchy("/", { prefix: "prefix1/" });
     * let entity = await iter.next();
     * while (!entity.done) {
     *   let item = entity.value;
     *   if (item.kind === "prefix") {
     *     console.log(`\tBlobPrefix: ${item.name}`);
     *   } else {
     *     console.log(`\tBlobItem: name - ${item.name}`);
     *   }
     *   entity = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * console.log("Listing blobs by hierarchy by page");
     * for await (const response of containerClient.listBlobsByHierarchy("/").byPage()) {
     *   const segment = response.segment;
     *   if (segment.blobPrefixes) {
     *     for (const prefix of segment.blobPrefixes) {
     *       console.log(`\tBlobPrefix: ${prefix.name}`);
     *     }
     *   }
     *   for (const blob of response.segment.blobItems) {
     *     console.log(`\tBlobItem: name - ${blob.name}`);
     *   }
     * }
     * ```
     *
     * Example using paging with a max page size:
     *
     * ```js
     * console.log("Listing blobs by hierarchy by page, specifying a prefix and a max page size");
     *
     * let i = 1;
     * for await (const response of containerClient
     *   .listBlobsByHierarchy("/", { prefix: "prefix2/sub1/" })
     *   .byPage({ maxPageSize: 2 })) {
     *   console.log(`Page ${i++}`);
     *   const segment = response.segment;
     *
     *   if (segment.blobPrefixes) {
     *     for (const prefix of segment.blobPrefixes) {
     *       console.log(`\tBlobPrefix: ${prefix.name}`);
     *     }
     *   }
     *
     *   for (const blob of response.segment.blobItems) {
     *     console.log(`\tBlobItem: name - ${blob.name}`);
     *   }
     * }
     * ```
     *
     * @param delimiter - The character or string used to define the virtual hierarchy
     * @param options - Options to list blobs operation.
     */
    listBlobsByHierarchy(delimiter, options = {}) {
        if (delimiter === "") {
            throw new RangeError("delimiter should contain one or more characters");
        }
        const include = [];
        if (options.includeCopy) {
            include.push("copy");
        }
        if (options.includeDeleted) {
            include.push("deleted");
        }
        if (options.includeMetadata) {
            include.push("metadata");
        }
        if (options.includeSnapshots) {
            include.push("snapshots");
        }
        if (options.includeVersions) {
            include.push("versions");
        }
        if (options.includeUncommitedBlobs) {
            include.push("uncommittedblobs");
        }
        if (options.includeTags) {
            include.push("tags");
        }
        if (options.includeDeletedWithVersions) {
            include.push("deletedwithversions");
        }
        if (options.includeImmutabilityPolicy) {
            include.push("immutabilitypolicy");
        }
        if (options.includeLegalHold) {
            include.push("legalhold");
        }
        if (options.prefix === "") {
            options.prefix = undefined;
        }
        const updatedOptions = Object.assign(Object.assign({}, options), (include.length > 0 ? { include: include } : {}));
        // AsyncIterableIterator to iterate over blob prefixes and blobs
        const iter = this.listItemsByHierarchy(delimiter, updatedOptions);
        return {
            /**
             * The next method, part of the iteration protocol
             */
            async next() {
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
                return this.listHierarchySegments(delimiter, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, updatedOptions));
            },
        };
    }
    /**
     * The Filter Blobs operation enables callers to list blobs in the container whose tags
     * match a given search expression.
     *
     * @param tagFilterSqlExpression - The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                        The given expression must evaluate to true for a blob to be returned in the results.
     *                                        The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                        however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the continuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The continuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to find blobs by tags.
     */
    async findBlobsByTagsSegment(tagFilterSqlExpression, marker, options = {}) {
        return tracingClient.withSpan("ContainerClient-findBlobsByTagsSegment", options, async (updatedOptions) => {
            const response = assertResponse(await this.containerContext.filterBlobs({
                abortSignal: options.abortSignal,
                where: tagFilterSqlExpression,
                marker,
                maxPageSize: options.maxPageSize,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: response._response, blobs: response.blobs.map((blob) => {
                    var _a;
                    let tagValue = "";
                    if (((_a = blob.tags) === null || _a === void 0 ? void 0 : _a.blobTagSet.length) === 1) {
                        tagValue = blob.tags.blobTagSet[0].value;
                    }
                    return Object.assign(Object.assign({}, blob), { tags: toTags(blob.tags), tagValue });
                }) });
            return wrappedResponse;
        });
    }
    /**
     * Returns an AsyncIterableIterator for ContainerFindBlobsByTagsSegmentResponse.
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the continuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The continuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to find blobs by tags.
     */
    findBlobsByTagsSegments(tagFilterSqlExpression_1, marker_1) {
        return __asyncGenerator(this, arguments, function* findBlobsByTagsSegments_1(tagFilterSqlExpression, marker, options = {}) {
            let response;
            if (!!marker || marker === undefined) {
                do {
                    response = yield __await(this.findBlobsByTagsSegment(tagFilterSqlExpression, marker, options));
                    response.blobs = response.blobs || [];
                    marker = response.continuationToken;
                    yield yield __await(response);
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator for blobs.
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param options - Options to findBlobsByTagsItems.
     */
    findBlobsByTagsItems(tagFilterSqlExpression_1) {
        return __asyncGenerator(this, arguments, function* findBlobsByTagsItems_1(tagFilterSqlExpression, options = {}) {
            var _a, e_3, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = __asyncValues(this.findBlobsByTagsSegments(tagFilterSqlExpression, marker, options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const segment = _c;
                    yield __await(yield* __asyncDelegator(__asyncValues(segment.blobs)));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_3) throw e_3.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to find all blobs with specified tag
     * under the specified container.
     *
     * .byPage() returns an async iterable iterator to list the blobs in pages.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * let i = 1;
     * for await (const blob of containerClient.findBlobsByTags("tagkey='tagvalue'")) {
     *   console.log(`Blob ${i++}: ${blob.name}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * const iter = containerClient.findBlobsByTags("tagkey='tagvalue'");
     * let blobItem = await iter.next();
     * while (!blobItem.done) {
     *   console.log(`Blob ${i++}: ${blobItem.value.name}`);
     *   blobItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of containerClient.findBlobsByTags("tagkey='tagvalue'").byPage({ maxPageSize: 20 })) {
     *   if (response.blobs) {
     *     for (const blob of response.blobs) {
     *       console.log(`Blob ${i++}: ${blob.name}`);
     *     }
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = containerClient.findBlobsByTags("tagkey='tagvalue'").byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 blob names
     * if (response.blobs) {
     *   for (const blob of response.blobs) {
     *     console.log(`Blob ${i++}: ${blob.name}`);
     *   }
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     * // Passing next marker as continuationToken
     * iterator = containerClient
     *   .findBlobsByTags("tagkey='tagvalue'")
     *   .byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints blob names
     * if (response.blobs) {
     *   for (const blob of response.blobs) {
     *      console.log(`Blob ${i++}: ${blob.name}`);
     *   }
     * }
     * ```
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param options - Options to find blobs by tags.
     */
    findBlobsByTags(tagFilterSqlExpression, options = {}) {
        // AsyncIterableIterator to iterate over blobs
        const listSegmentOptions = Object.assign({}, options);
        const iter = this.findBlobsByTagsItems(tagFilterSqlExpression, listSegmentOptions);
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
                return this.findBlobsByTagsSegments(tagFilterSqlExpression, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, listSegmentOptions));
            },
        };
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
        return tracingClient.withSpan("ContainerClient-getAccountInfo", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.getAccountInfo({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    getContainerNameFromUrl() {
        let containerName;
        try {
            //  URL may look like the following
            // "https://myaccount.blob.core.windows.net/mycontainer?sasString";
            // "https://myaccount.blob.core.windows.net/mycontainer";
            // IPv4/IPv6 address hosts, Endpoints - `http://127.0.0.1:10000/devstoreaccount1/containername`
            // http://localhost:10001/devstoreaccount1/containername
            const parsedUrl = new URL(this.url);
            if (parsedUrl.hostname.split(".")[1] === "blob") {
                // "https://myaccount.blob.core.windows.net/containername".
                // "https://customdomain.com/containername".
                // .getPath() -> /containername
                containerName = parsedUrl.pathname.split("/")[1];
            }
            else if (isIpEndpointStyle(parsedUrl)) {
                // IPv4/IPv6 address hosts... Example - http://192.0.0.10:10001/devstoreaccount1/containername
                // Single word domain without a [dot] in the endpoint... Example - http://localhost:10001/devstoreaccount1/containername
                // .getPath() -> /devstoreaccount1/containername
                containerName = parsedUrl.pathname.split("/")[2];
            }
            else {
                // "https://customdomain.com/containername".
                // .getPath() -> /containername
                containerName = parsedUrl.pathname.split("/")[1];
            }
            // decode the encoded containerName - to get all the special characters that might be present in it
            containerName = decodeURIComponent(containerName);
            if (!containerName) {
                throw new Error("Provided containerName is invalid.");
            }
            return containerName;
        }
        catch (error) {
            throw new Error("Unable to extract containerName with provided information.");
        }
    }
    /**
     * Only available for ContainerClient constructed with a shared key credential.
     *
     * Generates a Blob Container Service Shared Access Signature (SAS) URI based on the client properties
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
            const sas = generateBlobSASQueryParameters(Object.assign({ containerName: this._containerName }, options), this.credential).toString();
            resolve(appendToURLQuery(this.url, sas));
        });
    }
    /**
     * Only available for ContainerClient constructed with a shared key credential.
     *
     * Generates string to sign for a Blob Container Service Shared Access Signature (SAS) URI
     * based on the client properties and parameters passed in. The SAS is signed by the shared key credential of the client.
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
        return generateBlobSASQueryParametersInternal(Object.assign({ containerName: this._containerName }, options), this.credential).stringToSign;
    }
    /**
     * Generates a Blob Container Service Shared Access Signature (SAS) URI based on the client properties
     * and parameters passed in. The SAS is signed by the input user delegation key.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @param userDelegationKey -  Return value of `blobServiceClient.getUserDelegationKey()`
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateUserDelegationSasUrl(options, userDelegationKey) {
        return new Promise((resolve) => {
            const sas = generateBlobSASQueryParameters(Object.assign({ containerName: this._containerName }, options), userDelegationKey, this.accountName).toString();
            resolve(appendToURLQuery(this.url, sas));
        });
    }
    /**
     * Generates string to sign for a Blob Container Service Shared Access Signature (SAS) URI
     * based on the client properties and parameters passed in. The SAS is signed by the input user delegation key.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @param userDelegationKey -  Return value of `blobServiceClient.getUserDelegationKey()`
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateUserDelegationSasStringToSign(options, userDelegationKey) {
        return generateBlobSASQueryParametersInternal(Object.assign({ containerName: this._containerName }, options), userDelegationKey, this.accountName).stringToSign;
    }
    /**
     * Creates a BlobBatchClient object to conduct batch operations.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch
     *
     * @returns A new BlobBatchClient object for this container.
     */
    getBlobBatchClient() {
        return new BlobBatchClient(this.url, this.pipeline);
    }
}
//# sourceMappingURL=ContainerClient.js.map