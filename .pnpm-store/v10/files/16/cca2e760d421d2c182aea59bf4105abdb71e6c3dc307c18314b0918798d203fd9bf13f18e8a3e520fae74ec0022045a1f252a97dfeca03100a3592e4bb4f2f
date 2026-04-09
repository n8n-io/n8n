import { APIResource } from "../core/resource.js";
import { APIPromise } from "../core/api-promise.js";
import { CursorPage, type CursorPageParams, PagePromise } from "../core/pagination.js";
import { type Uploadable } from "../core/uploads.js";
import { RequestOptions } from "../internal/request-options.js";
export declare class Files extends APIResource {
    /**
     * Upload a file that can be used across various endpoints. Individual files can be
     * up to 512 MB, and the size of all files uploaded by one organization can be up
     * to 100 GB.
     *
     * The Assistants API supports files up to 2 million tokens and of specific file
     * types. See the
     * [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools) for
     * details.
     *
     * The Fine-tuning API only supports `.jsonl` files. The input also has certain
     * required formats for fine-tuning
     * [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input) or
     * [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
     * models.
     *
     * The Batch API only supports `.jsonl` files up to 200 MB in size. The input also
     * has a specific required
     * [format](https://platform.openai.com/docs/api-reference/batch/request-input).
     *
     * Please [contact us](https://help.openai.com/) if you need to increase these
     * storage limits.
     */
    create(body: FileCreateParams, options?: RequestOptions): APIPromise<FileObject>;
    /**
     * Returns information about a specific file.
     */
    retrieve(fileID: string, options?: RequestOptions): APIPromise<FileObject>;
    /**
     * Returns a list of files.
     */
    list(query?: FileListParams | null | undefined, options?: RequestOptions): PagePromise<FileObjectsPage, FileObject>;
    /**
     * Delete a file.
     */
    delete(fileID: string, options?: RequestOptions): APIPromise<FileDeleted>;
    /**
     * Returns the contents of the specified file.
     */
    content(fileID: string, options?: RequestOptions): APIPromise<Response>;
    /**
     * Waits for the given file to be processed, default timeout is 30 mins.
     */
    waitForProcessing(id: string, { pollInterval, maxWait }?: {
        pollInterval?: number;
        maxWait?: number;
    }): Promise<FileObject>;
}
export type FileObjectsPage = CursorPage<FileObject>;
export type FileContent = string;
export interface FileDeleted {
    id: string;
    deleted: boolean;
    object: 'file';
}
/**
 * The `File` object represents a document that has been uploaded to OpenAI.
 */
export interface FileObject {
    /**
     * The file identifier, which can be referenced in the API endpoints.
     */
    id: string;
    /**
     * The size of the file, in bytes.
     */
    bytes: number;
    /**
     * The Unix timestamp (in seconds) for when the file was created.
     */
    created_at: number;
    /**
     * The name of the file.
     */
    filename: string;
    /**
     * The object type, which is always `file`.
     */
    object: 'file';
    /**
     * The intended purpose of the file. Supported values are `assistants`,
     * `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results`
     * and `vision`.
     */
    purpose: 'assistants' | 'assistants_output' | 'batch' | 'batch_output' | 'fine-tune' | 'fine-tune-results' | 'vision';
    /**
     * @deprecated Deprecated. The current status of the file, which can be either
     * `uploaded`, `processed`, or `error`.
     */
    status: 'uploaded' | 'processed' | 'error';
    /**
     * The Unix timestamp (in seconds) for when the file will expire.
     */
    expires_at?: number;
    /**
     * @deprecated Deprecated. For details on why a fine-tuning training file failed
     * validation, see the `error` field on `fine_tuning.job`.
     */
    status_details?: string;
}
/**
 * The intended purpose of the uploaded file. One of: - `assistants`: Used in the
 * Assistants API - `batch`: Used in the Batch API - `fine-tune`: Used for
 * fine-tuning - `vision`: Images used for vision fine-tuning - `user_data`:
 * Flexible file type for any purpose - `evals`: Used for eval data sets
 */
export type FilePurpose = 'assistants' | 'batch' | 'fine-tune' | 'vision' | 'user_data' | 'evals';
export interface FileCreateParams {
    /**
     * The File object (not file name) to be uploaded.
     */
    file: Uploadable;
    /**
     * The intended purpose of the uploaded file. One of: - `assistants`: Used in the
     * Assistants API - `batch`: Used in the Batch API - `fine-tune`: Used for
     * fine-tuning - `vision`: Images used for vision fine-tuning - `user_data`:
     * Flexible file type for any purpose - `evals`: Used for eval data sets
     */
    purpose: FilePurpose;
}
export interface FileListParams extends CursorPageParams {
    /**
     * Sort order by the `created_at` timestamp of the objects. `asc` for ascending
     * order and `desc` for descending order.
     */
    order?: 'asc' | 'desc';
    /**
     * Only return files with the given purpose.
     */
    purpose?: string;
}
export declare namespace Files {
    export { type FileContent as FileContent, type FileDeleted as FileDeleted, type FileObject as FileObject, type FilePurpose as FilePurpose, type FileObjectsPage as FileObjectsPage, type FileCreateParams as FileCreateParams, type FileListParams as FileListParams, };
}
//# sourceMappingURL=files.d.ts.map