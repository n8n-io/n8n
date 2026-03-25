/*! Based on fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> & David Frank */
import { ReadableStream } from "web-streams-polyfill";
/**
 * Reflects minimal valid Blob for BlobParts.
 */
export interface BlobLike {
    type: string;
    size: number;
    slice(start?: number, end?: number, contentType?: string): BlobLike;
    arrayBuffer(): Promise<ArrayBuffer>;
    [Symbol.toStringTag]: string;
}
export declare type BlobParts = unknown[] | Iterable<unknown>;
export interface BlobPropertyBag {
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
export declare class Blob {
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
