import { StorageError } from '../lib/errors';
import { Fetch } from '../lib/fetch';
import { Bucket } from '../lib/types';
export default class StorageBucketApi {
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected fetch: Fetch;
    constructor(url: string, headers?: {
        [key: string]: string;
    }, fetch?: Fetch);
    /**
     * Retrieves the details of all Storage buckets within an existing project.
     */
    listBuckets(): Promise<{
        data: Bucket[];
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Retrieves the details of an existing Storage bucket.
     *
     * @param id The unique identifier of the bucket you would like to retrieve.
     */
    getBucket(id: string): Promise<{
        data: Bucket;
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Creates a new Storage bucket
     *
     * @param id A unique identifier for the bucket you are creating.
     * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations. By default, buckets are private.
     * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
     * The global file size limit takes precedence over this value.
     * The default value is null, which doesn't set a per bucket file size limit.
     * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
     * The default value is null, which allows files with all mime types to be uploaded.
     * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
     * @returns newly created bucket id
     */
    createBucket(id: string, options?: {
        public: boolean;
        fileSizeLimit?: number | string | null;
        allowedMimeTypes?: string[] | null;
    }): Promise<{
        data: Pick<Bucket, 'name'>;
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Updates a Storage bucket
     *
     * @param id A unique identifier for the bucket you are updating.
     * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations.
     * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
     * The global file size limit takes precedence over this value.
     * The default value is null, which doesn't set a per bucket file size limit.
     * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
     * The default value is null, which allows files with all mime types to be uploaded.
     * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
     */
    updateBucket(id: string, options: {
        public: boolean;
        fileSizeLimit?: number | string | null;
        allowedMimeTypes?: string[] | null;
    }): Promise<{
        data: {
            message: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Removes all objects inside a single bucket.
     *
     * @param id The unique identifier of the bucket you would like to empty.
     */
    emptyBucket(id: string): Promise<{
        data: {
            message: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Deletes an existing bucket. A bucket can't be deleted with existing objects inside it.
     * You must first `empty()` the bucket.
     *
     * @param id The unique identifier of the bucket you would like to delete.
     */
    deleteBucket(id: string): Promise<{
        data: {
            message: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
}
//# sourceMappingURL=StorageBucketApi.d.ts.map