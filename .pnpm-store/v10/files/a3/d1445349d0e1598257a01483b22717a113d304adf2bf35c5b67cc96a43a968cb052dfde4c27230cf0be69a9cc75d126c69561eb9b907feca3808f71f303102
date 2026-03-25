/// <reference types="node" />
import { StorageError } from '../lib/errors';
import { Fetch } from '../lib/fetch';
import { FileObject, FileOptions, SearchOptions, FetchParameters, TransformOptions, DestinationOptions, FileObjectV2, Camelize } from '../lib/types';
declare type FileBody = ArrayBuffer | ArrayBufferView | Blob | Buffer | File | FormData | NodeJS.ReadableStream | ReadableStream<Uint8Array> | URLSearchParams | string;
export default class StorageFileApi {
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected bucketId?: string;
    protected fetch: Fetch;
    constructor(url: string, headers?: {
        [key: string]: string;
    }, bucketId?: string, fetch?: Fetch);
    /**
     * Uploads a file to an existing bucket or replaces an existing file at the specified path with a new one.
     *
     * @param method HTTP method.
     * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
     * @param fileBody The body of the file to be stored in the bucket.
     */
    private uploadOrUpdate;
    /**
     * Uploads a file to an existing bucket.
     *
     * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
     * @param fileBody The body of the file to be stored in the bucket.
     */
    upload(path: string, fileBody: FileBody, fileOptions?: FileOptions): Promise<{
        data: {
            id: string;
            path: string;
            fullPath: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Upload a file with a token generated from `createSignedUploadUrl`.
     * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
     * @param token The token generated from `createSignedUploadUrl`
     * @param fileBody The body of the file to be stored in the bucket.
     */
    uploadToSignedUrl(path: string, token: string, fileBody: FileBody, fileOptions?: FileOptions): Promise<{
        data: {
            path: string;
            fullPath: any;
        };
        error: null;
    } | {
        data: null;
        error: any;
    }>;
    /**
     * Creates a signed upload URL.
     * Signed upload URLs can be used to upload files to the bucket without further authentication.
     * They are valid for 2 hours.
     * @param path The file path, including the current file name. For example `folder/image.png`.
     * @param options.upsert If set to true, allows the file to be overwritten if it already exists.
     */
    createSignedUploadUrl(path: string, options?: {
        upsert: boolean;
    }): Promise<{
        data: {
            signedUrl: string;
            token: string;
            path: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Replaces an existing file at the specified path with a new one.
     *
     * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to update.
     * @param fileBody The body of the file to be stored in the bucket.
     */
    update(path: string, fileBody: ArrayBuffer | ArrayBufferView | Blob | Buffer | File | FormData | NodeJS.ReadableStream | ReadableStream<Uint8Array> | URLSearchParams | string, fileOptions?: FileOptions): Promise<{
        data: {
            id: string;
            path: string;
            fullPath: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Moves an existing file to a new path in the same bucket.
     *
     * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
     * @param toPath The new file path, including the new file name. For example `folder/image-new.png`.
     * @param options The destination options.
     */
    move(fromPath: string, toPath: string, options?: DestinationOptions): Promise<{
        data: {
            message: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Copies an existing file to a new path in the same bucket.
     *
     * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
     * @param toPath The new file path, including the new file name. For example `folder/image-copy.png`.
     * @param options The destination options.
     */
    copy(fromPath: string, toPath: string, options?: DestinationOptions): Promise<{
        data: {
            path: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Creates a signed URL. Use a signed URL to share a file for a fixed amount of time.
     *
     * @param path The file path, including the current file name. For example `folder/image.png`.
     * @param expiresIn The number of seconds until the signed URL expires. For example, `60` for a URL which is valid for one minute.
     * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
     * @param options.transform Transform the asset before serving it to the client.
     */
    createSignedUrl(path: string, expiresIn: number, options?: {
        download?: string | boolean;
        transform?: TransformOptions;
    }): Promise<{
        data: {
            signedUrl: string;
        };
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Creates multiple signed URLs. Use a signed URL to share a file for a fixed amount of time.
     *
     * @param paths The file paths to be downloaded, including the current file names. For example `['folder/image.png', 'folder2/image2.png']`.
     * @param expiresIn The number of seconds until the signed URLs expire. For example, `60` for URLs which are valid for one minute.
     * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
     */
    createSignedUrls(paths: string[], expiresIn: number, options?: {
        download: string | boolean;
    }): Promise<{
        data: {
            error: string | null;
            path: string | null;
            signedUrl: string;
        }[];
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Downloads a file from a private bucket. For public buckets, make a request to the URL returned from `getPublicUrl` instead.
     *
     * @param path The full path and file name of the file to be downloaded. For example `folder/image.png`.
     * @param options.transform Transform the asset before serving it to the client.
     */
    download(path: string, options?: {
        transform?: TransformOptions;
    }): Promise<{
        data: Blob;
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Retrieves the details of an existing file.
     * @param path
     */
    info(path: string): Promise<{
        data: Camelize<FileObjectV2>;
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Checks the existence of a file.
     * @param path
     */
    exists(path: string): Promise<{
        data: boolean;
        error: null;
    } | {
        data: boolean;
        error: StorageError;
    }>;
    /**
     * A simple convenience function to get the URL for an asset in a public bucket. If you do not want to use this function, you can construct the public URL by concatenating the bucket URL with the path to the asset.
     * This function does not verify if the bucket is public. If a public URL is created for a bucket which is not public, you will not be able to download the asset.
     *
     * @param path The path and name of the file to generate the public URL for. For example `folder/image.png`.
     * @param options.download Triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
     * @param options.transform Transform the asset before serving it to the client.
     */
    getPublicUrl(path: string, options?: {
        download?: string | boolean;
        transform?: TransformOptions;
    }): {
        data: {
            publicUrl: string;
        };
    };
    /**
     * Deletes files within the same bucket
     *
     * @param paths An array of files to delete, including the path and file name. For example [`'folder/image.png'`].
     */
    remove(paths: string[]): Promise<{
        data: FileObject[];
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    /**
     * Get file metadata
     * @param id the file id to retrieve metadata
     */
    /**
     * Update file metadata
     * @param id the file id to update metadata
     * @param meta the new file metadata
     */
    /**
     * Lists all the files within a bucket.
     * @param path The folder path.
     */
    list(path?: string, options?: SearchOptions, parameters?: FetchParameters): Promise<{
        data: FileObject[];
        error: null;
    } | {
        data: null;
        error: StorageError;
    }>;
    protected encodeMetadata(metadata: Record<string, any>): string;
    toBase64(data: string): string;
    private _getFinalPath;
    private _removeEmptyFolders;
    private transformOptsToQueryString;
}
export {};
//# sourceMappingURL=StorageFileApi.d.ts.map