/*! Based on fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> & David Frank */
/**
 * Reflects minimal valid Blob for BlobParts.
 */
interface BlobLike {
    type: string;
    size: number;
    slice(start?: number, end?: number, contentType?: string): BlobLike;
    arrayBuffer(): Promise<ArrayBuffer>;
    [Symbol.toStringTag]: string;
}
type BlobParts = unknown[] | Iterable<unknown>;
interface BlobPropertyBag {
    /**
     * The [`MIME type`](https://developer.mozilla.org/en-US/docs/Glossary/MIME_type) of the data that will be stored into the blob.
     * The default value is the empty string, (`""`).
     */
    type?: string;
}
/**
 * The **Blob** object represents a blob, which is a file-like object of immutable, raw data;
 * they can be read as text or binary data, or converted into a ReadableStream
 * so its methods can be used for processing the data.
 */
declare class Blob {
    #private;
    static [Symbol.hasInstance](value: unknown): value is Blob;
    /**
     * Returns a new [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) object.
     * The content of the blob consists of the concatenation of the values given in the parameter array.
     *
     * @param blobParts An `Array` strings, or [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`ArrayBufferView`](https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView), [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, or a mix of any of such objects, that will be put inside the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
     * @param options An optional object of type `BlobPropertyBag`.
     */
    constructor(blobParts?: BlobParts, options?: BlobPropertyBag);
    /**
     * Returns the [`MIME type`](https://developer.mozilla.org/en-US/docs/Glossary/MIME_type) of the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).
     */
    get type(): string;
    /**
     * Returns the size of the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) in bytes.
     */
    get size(): number;
    /**
     * Creates and returns a new [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) object which contains data from a subset of the blob on which it's called.
     *
     * @param start An index into the Blob indicating the first byte to include in the new Blob. If you specify a negative value, it's treated as an offset from the end of the Blob toward the beginning. For example, -10 would be the 10th from last byte in the Blob. The default value is 0. If you specify a value for start that is larger than the size of the source Blob, the returned Blob has size 0 and contains no data.
     * @param end An index into the Blob indicating the first byte that will *not* be included in the new Blob (i.e. the byte exactly at this index is not included). If you specify a negative value, it's treated as an offset from the end of the Blob toward the beginning. For example, -10 would be the 10th from last byte in the Blob. The default value is size.
     * @param contentType The content type to assign to the new Blob; this will be the value of its type property. The default value is an empty string.
     */
    slice(start?: number, end?: number, contentType?: string): Blob;
    /**
     * Returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves with a string containing the contents of the blob, interpreted as UTF-8.
     */
    text(): Promise<string>;
    /**
     * Returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves with the contents of the blob as binary data contained in an [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer).
     */
    arrayBuffer(): Promise<ArrayBuffer>;
    /**
     * Returns a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) which upon reading returns the data contained within the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
     */
    stream(): ReadableStream<Uint8Array>;
    get [Symbol.toStringTag](): string;
}

interface FileLike {
    /**
     * Name of the file referenced by the File object.
     */
    readonly name: string;
    /**
     * Size of the file parts in bytes
     */
    readonly size: number;
    /**
     * Returns the media type ([`MIME`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)) of the file represented by a `File` object.
     */
    readonly type: string;
    /**
     * The last modified date of the file as the number of milliseconds since the Unix epoch (January 1, 1970 at midnight). Files without a known last modified date return the current date.
     */
    readonly lastModified: number;
    [Symbol.toStringTag]: string;
    /**
     * Returns a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) which upon reading returns the data contained within the [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).
     */
    stream(): AsyncIterable<Uint8Array>;
}
interface FilePropertyBag extends BlobPropertyBag {
    /**
     * The last modified date of the file as the number of milliseconds since the Unix epoch (January 1, 1970 at midnight). Files without a known last modified date return the current date.
     */
    lastModified?: number;
}
/**
 * The **File** interface provides information about files and allows JavaScript to access their content.
 */
declare class File extends Blob {
    #private;
    static [Symbol.hasInstance](value: unknown): value is File;
    /**
     * Creates a new File instance.
     *
     * @param fileBits An `Array` strings, or [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`ArrayBufferView`](https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView), [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, or a mix of any of such objects, that will be put inside the [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).
     * @param name The name of the file.
     * @param options An options object containing optional attributes for the file.
     */
    constructor(fileBits: BlobParts, name: string, options?: FilePropertyBag);
    /**
     * Name of the file referenced by the File object.
     */
    get name(): string;
    get webkitRelativePath(): string;
    /**
     * The last modified date of the file as the number of milliseconds since the Unix epoch (January 1, 1970 at midnight). Files without a known last modified date return the current date.
     */
    get lastModified(): number;
    get [Symbol.toStringTag](): string;
}

export { BlobLike as B, File as F, BlobParts as a, BlobPropertyBag as b, Blob as c, FileLike as d, FilePropertyBag as e };
