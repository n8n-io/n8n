import { type RequestOptions } from "./core.js";
import { FormData, type Blob, type FilePropertyBag, type FsReadStream } from "./_shims/index.js";
import { MultipartBody } from "./_shims/MultipartBody.js";
export { fileFromPath } from "./_shims/index.js";
type BlobLikePart = string | ArrayBuffer | ArrayBufferView | BlobLike | Uint8Array | DataView;
export type BlobPart = string | ArrayBuffer | ArrayBufferView | Blob | Uint8Array | DataView;
/**
 * Typically, this is a native "File" class.
 *
 * We provide the {@link toFile} utility to convert a variety of objects
 * into the File class.
 *
 * For convenience, you can also pass a fetch Response, or in Node,
 * the result of fs.createReadStream().
 */
export type Uploadable = FileLike | ResponseLike | FsReadStream;
/**
 * Intended to match web.Blob, node.Blob, node-fetch.Blob, etc.
 */
export interface BlobLike {
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/size) */
    readonly size: number;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/type) */
    readonly type: string;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/text) */
    text(): Promise<string>;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Blob/slice) */
    slice(start?: number, end?: number): BlobLike;
}
/**
 * Intended to match web.File, node.File, node-fetch.File, etc.
 */
export interface FileLike extends BlobLike {
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/File/lastModified) */
    readonly lastModified: number;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/File/name) */
    readonly name: string;
}
/**
 * Intended to match web.Response, node.Response, node-fetch.Response, etc.
 */
export interface ResponseLike {
    url: string;
    blob(): Promise<BlobLike>;
}
export declare const isResponseLike: (value: any) => value is ResponseLike;
export declare const isFileLike: (value: any) => value is FileLike;
/**
 * The BlobLike type omits arrayBuffer() because @types/node-fetch@^2.6.4 lacks it; but this check
 * adds the arrayBuffer() method type because it is available and used at runtime
 */
export declare const isBlobLike: (value: any) => value is BlobLike & {
    arrayBuffer(): Promise<ArrayBuffer>;
};
export declare const isUploadable: (value: any) => value is Uploadable;
export type ToFileInput = Uploadable | Exclude<BlobLikePart, string> | AsyncIterable<BlobLikePart>;
/**
 * Helper for creating a {@link File} to pass to an SDK upload method from a variety of different data formats
 * @param value the raw content of the file.  Can be an {@link Uploadable}, {@link BlobLikePart}, or {@link AsyncIterable} of {@link BlobLikePart}s
 * @param {string=} name the name of the file. If omitted, toFile will try to determine a file name from bits if possible
 * @param {Object=} options additional properties
 * @param {string=} options.type the MIME type of the content
 * @param {number=} options.lastModified the last modified timestamp
 * @returns a {@link File} with the given properties
 */
export declare function toFile(value: ToFileInput | PromiseLike<ToFileInput>, name?: string | null | undefined, options?: FilePropertyBag | undefined): Promise<FileLike>;
export declare const isMultipartBody: (body: any) => body is MultipartBody;
/**
 * Returns a multipart/form-data request if any part of the given request body contains a File / Blob value.
 * Otherwise returns the request as is.
 */
export declare const maybeMultipartFormRequestOptions: <T = Record<string, unknown>>(opts: RequestOptions<T>) => Promise<RequestOptions<T | MultipartBody>>;
export declare const multipartFormRequestOptions: <T = Record<string, unknown>>(opts: RequestOptions<T>) => Promise<RequestOptions<T | MultipartBody>>;
export declare const createForm: <T = Record<string, unknown>>(body: T | undefined) => Promise<FormData>;
//# sourceMappingURL=uploads.d.ts.map