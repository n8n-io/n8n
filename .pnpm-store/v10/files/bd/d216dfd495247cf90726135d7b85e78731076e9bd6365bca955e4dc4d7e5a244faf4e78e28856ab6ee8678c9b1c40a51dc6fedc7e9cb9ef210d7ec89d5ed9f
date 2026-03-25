import { Blob, BlobParts as FileBits, BlobPropertyBag } from "./Blob";
export interface FileLike {
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
export interface FilePropertyBag extends BlobPropertyBag {
    /**
     * The last modified date of the file as the number of milliseconds since the Unix epoch (January 1, 1970 at midnight). Files without a known last modified date return the current date.
     */
    lastModified?: number;
}
/**
 * @deprecated Use FilePropertyBag instead.
 */
export declare type FileOptions = FilePropertyBag;
/**
 * The **File** interface provides information about files and allows JavaScript to access their content.
 */
export declare class File extends Blob implements FileLike {
    #private;
    static [Symbol.hasInstance](value: unknown): value is File;
    /**
     * Creates a new File instance.
     *
     * @param fileBits An `Array` strings, or [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`ArrayBufferView`](https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView), [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, or a mix of any of such objects, that will be put inside the [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).
     * @param name The name of the file.
     * @param options An options object containing optional attributes for the file.
     */
    constructor(fileBits: FileBits, name: string, options?: FilePropertyBag);
    get name(): string;
    get lastModified(): number;
    get webkitRelativePath(): string;
    get [Symbol.toStringTag](): string;
}
