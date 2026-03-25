// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { StorageContextClient } from "./StorageContextClient";
import { getCoreClientOptions, getCredentialFromPipeline } from "./Pipeline";
import { escapeURLPath, getURLScheme, iEqual, getAccountNameFromUrl } from "./utils/utils.common";
/**
 * A StorageClient represents a based URL class for {@link BlobServiceClient}, {@link ContainerClient}
 * and etc.
 */
export class StorageClient {
    /**
     * Creates an instance of StorageClient.
     * @param url - url to resource
     * @param pipeline - request policy pipeline.
     */
    constructor(url, pipeline) {
        // URL should be encoded and only once, protocol layer shouldn't encode URL again
        this.url = escapeURLPath(url);
        this.accountName = getAccountNameFromUrl(url);
        this.pipeline = pipeline;
        this.storageClientContext = new StorageContextClient(this.url, getCoreClientOptions(pipeline));
        this.isHttps = iEqual(getURLScheme(this.url) || "", "https");
        this.credential = getCredentialFromPipeline(pipeline);
        // Override protocol layer's default content-type
        const storageClientContext = this.storageClientContext;
        storageClientContext.requestContentType = undefined;
    }
}
//# sourceMappingURL=StorageClient.js.map