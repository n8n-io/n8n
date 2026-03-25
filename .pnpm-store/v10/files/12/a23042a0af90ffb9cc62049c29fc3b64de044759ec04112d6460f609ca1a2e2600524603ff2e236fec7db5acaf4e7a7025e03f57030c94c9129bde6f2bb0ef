// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { BatchResponseParser } from "./BatchResponseParser";
import { utf8ByteLength } from "./BatchUtils";
import { BlobBatch } from "./BlobBatch";
import { tracingClient } from "./utils/tracing";
import { AnonymousCredential } from "./credentials/AnonymousCredential";
import { StorageContextClient } from "./StorageContextClient";
import { newPipeline, isPipelineLike, getCoreClientOptions } from "./Pipeline";
import { assertResponse, getURLPath } from "./utils/utils.common";
/**
 * A BlobBatchClient allows you to make batched requests to the Azure Storage Blob service.
 *
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch
 */
export class BlobBatchClient {
    constructor(url, credentialOrPipeline, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        let pipeline;
        if (isPipelineLike(credentialOrPipeline)) {
            pipeline = credentialOrPipeline;
        }
        else if (!credentialOrPipeline) {
            // no credential provided
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else {
            pipeline = newPipeline(credentialOrPipeline, options);
        }
        const storageClientContext = new StorageContextClient(url, getCoreClientOptions(pipeline));
        const path = getURLPath(url);
        if (path && path !== "/") {
            // Container scoped.
            this.serviceOrContainerContext = storageClientContext.container;
        }
        else {
            this.serviceOrContainerContext = storageClientContext.service;
        }
    }
    /**
     * Creates a {@link BlobBatch}.
     * A BlobBatch represents an aggregated set of operations on blobs.
     */
    createBatch() {
        return new BlobBatch();
    }
    async deleteBlobs(urlsOrBlobClients, credentialOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        const batch = new BlobBatch();
        for (const urlOrBlobClient of urlsOrBlobClients) {
            if (typeof urlOrBlobClient === "string") {
                await batch.deleteBlob(urlOrBlobClient, credentialOrOptions, options);
            }
            else {
                await batch.deleteBlob(urlOrBlobClient, credentialOrOptions);
            }
        }
        return this.submitBatch(batch);
    }
    async setBlobsAccessTier(urlsOrBlobClients, credentialOrTier, tierOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        const batch = new BlobBatch();
        for (const urlOrBlobClient of urlsOrBlobClients) {
            if (typeof urlOrBlobClient === "string") {
                await batch.setBlobAccessTier(urlOrBlobClient, credentialOrTier, tierOrOptions, options);
            }
            else {
                await batch.setBlobAccessTier(urlOrBlobClient, credentialOrTier, tierOrOptions);
            }
        }
        return this.submitBatch(batch);
    }
    /**
     * Submit batch request which consists of multiple subrequests.
     *
     * Get `blobBatchClient` and other details before running the snippets.
     * `blobServiceClient.getBlobBatchClient()` gives the `blobBatchClient`
     *
     * Example usage:
     *
     * ```js
     * let batchRequest = new BlobBatch();
     * await batchRequest.deleteBlob(urlInString0, credential0);
     * await batchRequest.deleteBlob(urlInString1, credential1, {
     *  deleteSnapshots: "include"
     * });
     * const batchResp = await blobBatchClient.submitBatch(batchRequest);
     * console.log(batchResp.subResponsesSucceededCount);
     * ```
     *
     * Example using a lease:
     *
     * ```js
     * let batchRequest = new BlobBatch();
     * await batchRequest.setBlobAccessTier(blockBlobClient0, "Cool");
     * await batchRequest.setBlobAccessTier(blockBlobClient1, "Cool", {
     *  conditions: { leaseId: leaseId }
     * });
     * const batchResp = await blobBatchClient.submitBatch(batchRequest);
     * console.log(batchResp.subResponsesSucceededCount);
     * ```
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch
     *
     * @param batchRequest - A set of Delete or SetTier operations.
     * @param options -
     */
    async submitBatch(batchRequest, options = {}) {
        if (!batchRequest || batchRequest.getSubRequests().size === 0) {
            throw new RangeError("Batch request should contain one or more sub requests.");
        }
        return tracingClient.withSpan("BlobBatchClient-submitBatch", options, async (updatedOptions) => {
            const batchRequestBody = batchRequest.getHttpRequestBody();
            // ServiceSubmitBatchResponseModel and ContainerSubmitBatchResponse are compatible for now.
            const rawBatchResponse = assertResponse(await this.serviceOrContainerContext.submitBatch(utf8ByteLength(batchRequestBody), batchRequest.getMultiPartContentType(), batchRequestBody, Object.assign({}, updatedOptions)));
            // Parse the sub responses result, if logic reaches here(i.e. the batch request succeeded with status code 202).
            const batchResponseParser = new BatchResponseParser(rawBatchResponse, batchRequest.getSubRequests());
            const responseSummary = await batchResponseParser.parseBatchResponse();
            const res = {
                _response: rawBatchResponse._response,
                contentType: rawBatchResponse.contentType,
                errorCode: rawBatchResponse.errorCode,
                requestId: rawBatchResponse.requestId,
                clientRequestId: rawBatchResponse.clientRequestId,
                version: rawBatchResponse.version,
                subResponses: responseSummary.subResponses,
                subResponsesSucceededCount: responseSummary.subResponsesSucceededCount,
                subResponsesFailedCount: responseSummary.subResponsesFailedCount,
            };
            return res;
        });
    }
}
//# sourceMappingURL=BlobBatchClient.js.map