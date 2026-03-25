import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
export declare class Files extends ClientSDK {
    /**
     * Upload File
     *
     * @remarks
     * Upload a file that can be used across various endpoints.
     *
     * The size of individual files can be a maximum of 512 MB. The Fine-tuning API only supports .jsonl files.
     *
     * Please contact us if you need to increase these storage limits.
     */
    upload(request: operations.FilesApiRoutesUploadFileMultiPartBodyParams, options?: RequestOptions): Promise<components.UploadFileOut>;
    /**
     * List Files
     *
     * @remarks
     * Returns a list of files that belong to the user's organization.
     */
    list(request?: operations.FilesApiRoutesListFilesRequest | undefined, options?: RequestOptions): Promise<components.ListFilesOut>;
    /**
     * Retrieve File
     *
     * @remarks
     * Returns information about a specific file.
     */
    retrieve(request: operations.FilesApiRoutesRetrieveFileRequest, options?: RequestOptions): Promise<components.RetrieveFileOut>;
    /**
     * Delete File
     *
     * @remarks
     * Delete a file.
     */
    delete(request: operations.FilesApiRoutesDeleteFileRequest, options?: RequestOptions): Promise<components.DeleteFileOut>;
    /**
     * Download File
     *
     * @remarks
     * Download a file
     */
    download(request: operations.FilesApiRoutesDownloadFileRequest, options?: RequestOptions): Promise<ReadableStream<Uint8Array>>;
    /**
     * Get Signed Url
     */
    getSignedUrl(request: operations.FilesApiRoutesGetSignedUrlRequest, options?: RequestOptions): Promise<components.FileSignedURL>;
}
//# sourceMappingURL=files.d.ts.map