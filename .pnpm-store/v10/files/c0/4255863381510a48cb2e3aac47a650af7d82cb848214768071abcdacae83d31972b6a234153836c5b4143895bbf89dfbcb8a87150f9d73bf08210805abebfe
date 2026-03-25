export interface Bucket {
    id: string;
    name: string;
    owner: string;
    file_size_limit?: number;
    allowed_mime_types?: string[];
    created_at: string;
    updated_at: string;
    public: boolean;
}
export interface FileObject {
    name: string;
    bucket_id: string;
    owner: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: Record<string, any>;
    buckets: Bucket;
}
export interface FileObjectV2 {
    id: string;
    version: string;
    name: string;
    bucket_id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    size?: number;
    cache_control?: string;
    content_type?: string;
    etag?: string;
    last_modified?: string;
    metadata?: Record<string, any>;
}
export interface SortBy {
    column?: string;
    order?: string;
}
export interface FileOptions {
    /**
     * The number of seconds the asset is cached in the browser and in the Supabase CDN. This is set in the `Cache-Control: max-age=<seconds>` header. Defaults to 3600 seconds.
     */
    cacheControl?: string;
    /**
     * the `Content-Type` header value. Should be specified if using a `fileBody` that is neither `Blob` nor `File` nor `FormData`, otherwise will default to `text/plain;charset=UTF-8`.
     */
    contentType?: string;
    /**
     * When upsert is set to true, the file is overwritten if it exists. When set to false, an error is thrown if the object already exists. Defaults to false.
     */
    upsert?: boolean;
    /**
     * The duplex option is a string parameter that enables or disables duplex streaming, allowing for both reading and writing data in the same stream. It can be passed as an option to the fetch() method.
     */
    duplex?: string;
    /**
     * The metadata option is an object that allows you to store additional information about the file. This information can be used to filter and search for files. The metadata object can contain any key-value pairs you want to store.
     */
    metadata?: Record<string, any>;
    /**
     * Optionally add extra headers
     */
    headers?: Record<string, string>;
}
export interface DestinationOptions {
    destinationBucket?: string;
}
export interface SearchOptions {
    /**
     *  The number of files you want to be returned.
     */
    limit?: number;
    /**
     * The starting position.
     */
    offset?: number;
    /**
     * The column to sort by. Can be any column inside a FileObject.
     */
    sortBy?: SortBy;
    /**
     * The search string to filter files by.
     */
    search?: string;
}
export interface FetchParameters {
    /**
     * Pass in an AbortController's signal to cancel the request.
     */
    signal?: AbortSignal;
}
export interface Metadata {
    name: string;
}
export interface TransformOptions {
    /**
     * The width of the image in pixels.
     */
    width?: number;
    /**
     * The height of the image in pixels.
     */
    height?: number;
    /**
     * The resize mode can be cover, contain or fill. Defaults to cover.
     * Cover resizes the image to maintain it's aspect ratio while filling the entire width and height.
     * Contain resizes the image to maintain it's aspect ratio while fitting the entire image within the width and height.
     * Fill resizes the image to fill the entire width and height. If the object's aspect ratio does not match the width and height, the image will be stretched to fit.
     */
    resize?: 'cover' | 'contain' | 'fill';
    /**
     * Set the quality of the returned image.
     * A number from 20 to 100, with 100 being the highest quality.
     * Defaults to 80
     */
    quality?: number;
    /**
     * Specify the format of the image requested.
     *
     * When using 'origin' we force the format to be the same as the original image.
     * When this option is not passed in, images are optimized to modern image formats like Webp.
     */
    format?: 'origin';
}
declare type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}` ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}` : S;
export declare type Camelize<T> = {
    [K in keyof T as CamelCase<Extract<K, string>>]: T[K];
};
export {};
//# sourceMappingURL=types.d.ts.map