/**
 * Options passed into createFile specifying metadata about the file.
 */
export interface CreateFileOptions {
    /**
     * The MIME type of the file.
     */
    type?: string;
    /**
     * Last modified time of the file as a UNIX timestamp.
     * This will default to the current date.
     */
    lastModified?: number;
    /**
     * relative path of this file when uploading a directory.
     */
    webkitRelativePath?: string;
}
/**
 * Extra options for createFile when a stream is being passed in.
 */
export interface CreateFileFromStreamOptions extends CreateFileOptions {
    /**
     * Size of the file represented by the stream in bytes.
     *
     * This will be used by the pipeline when calculating the Content-Length header
     * for the overall request.
     */
    size?: number;
}
/**
 * Private symbol used as key on objects created using createFile containing the
 * original source of the file object.
 *
 * This is used in Node to access the original Node stream without using Blob#stream, which
 * returns a web stream. This is done to avoid a couple of bugs to do with Blob#stream and
 * Readable#to/fromWeb in Node versions we support:
 * - https://github.com/nodejs/node/issues/42694 (fixed in Node 18.14)
 * - https://github.com/nodejs/node/issues/48916 (fixed in Node 20.6)
 *
 * Once these versions are no longer supported, we may be able to stop doing this.
 *
 * @internal
 */
declare const rawContent: unique symbol;
/**
 * Type signature of a blob-like object with a raw content property.
 */
export interface RawContent extends Blob {
    [rawContent](): Uint8Array | NodeJS.ReadableStream | ReadableStream<Uint8Array>;
}
/**
 * Type guard to check if a given object is a blob-like object with a raw content property.
 */
export declare function hasRawContent(x: unknown): x is RawContent;
/**
 * Extract the raw content from a given blob-like object. If the input was created using createFile
 * or createFileFromStream, the exact content passed into createFile/createFileFromStream will be used.
 * For true instances of Blob and File, returns the actual blob.
 *
 * @internal
 */
export declare function getRawContent(blob: Blob): Blob | NodeJS.ReadableStream | ReadableStream<Uint8Array> | Uint8Array;
/**
 * Create an object that implements the File interface. This object is intended to be
 * passed into RequestBodyType.formData, and is not guaranteed to work as expected in
 * other situations.
 *
 * Use this function to:
 * - Create a File object for use in RequestBodyType.formData in environments where the
 *   global File object is unavailable.
 * - Create a File-like object from a readable stream without reading the stream into memory.
 *
 * @param stream - the content of the file as a callback returning a stream. When a File object made using createFile is
 *                  passed in a request's form data map, the stream will not be read into memory
 *                  and instead will be streamed when the request is made. In the event of a retry, the
 *                  stream needs to be read again, so this callback SHOULD return a fresh stream if possible.
 * @param name - the name of the file.
 * @param options - optional metadata about the file, e.g. file name, file size, MIME type.
 */
export declare function createFileFromStream(stream: () => ReadableStream<Uint8Array> | NodeJS.ReadableStream, name: string, options?: CreateFileFromStreamOptions): File;
/**
 * Create an object that implements the File interface. This object is intended to be
 * passed into RequestBodyType.formData, and is not guaranteed to work as expected in
 * other situations.
 *
 * Use this function create a File object for use in RequestBodyType.formData in environments where the global File object is unavailable.
 *
 * @param content - the content of the file as a Uint8Array in memory.
 * @param name - the name of the file.
 * @param options - optional metadata about the file, e.g. file name, file size, MIME type.
 */
export declare function createFile(content: Uint8Array, name: string, options?: CreateFileOptions): File;
export {};
//# sourceMappingURL=file.d.ts.map