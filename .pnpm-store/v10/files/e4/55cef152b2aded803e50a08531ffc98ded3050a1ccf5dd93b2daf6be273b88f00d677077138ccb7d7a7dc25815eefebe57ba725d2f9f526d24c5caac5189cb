interface FileLike {
    /**
     * Name of the file referenced by the File object.
     */
    readonly name: string;
    /**
     * Returns the media type ([`MIME`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)) of the file represented by a `File` object.
     */
    readonly type: string;
    /**
     * Size of the file parts in bytes
     */
    readonly size: number;
    /**
     * The last modified date of the file as the number of milliseconds since the Unix epoch (January 1, 1970 at midnight). Files without a known last modified date return the current date.
     */
    readonly lastModified: number;
    /**
     * Returns a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) which upon reading returns the data contained within the [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).
     */
    stream(): ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;
    readonly [Symbol.toStringTag]?: string;
}

/**
 * A `string` or `File` that represents a single value from a set of `FormData` key-value pairs.
 */
type FormDataEntryValue = string | FileLike;
/**
 * This interface reflects minimal shape of the FormData
 */
interface FormDataLike {
    /**
     * Appends a new value onto an existing key inside a FormData object,
     * or adds the key if it does not already exist.
     *
     * The difference between `set()` and `append()` is that if the specified key already exists, `set()` will overwrite all existing values with the new one, whereas `append()` will append the new value onto the end of the existing set of values.
     *
     * @param name The name of the field whose data is contained in `value`.
     * @param value The field's value. This can be [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
      or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File). If none of these are specified the value is converted to a string.
     * @param fileName The filename reported to the server, when a Blob or File is passed as the second parameter. The default filename for Blob objects is "blob". The default filename for File objects is the file's filename.
     */
    append(name: string, value: unknown, fileName?: string): void;
    /**
     * Returns all the values associated with a given key from within a `FormData` object.
     *
     * @param {string} name A name of the value you want to retrieve.
     *
     * @returns An array of `FormDataEntryValue` whose key matches the value passed in the `name` parameter. If the key doesn't exist, the method returns an empty list.
     */
    getAll(name: string): FormDataEntryValue[];
    /**
     * Returns an [`iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) allowing to go through the `FormData` key/value pairs.
     * The key of each pair is a string; the value is a [`FormDataValue`](https://developer.mozilla.org/en-US/docs/Web/API/FormDataEntryValue).
     */
    entries(): IterableIterator<[string, FormDataEntryValue]>;
    /**
     * An alias for FormDataLike#entries()
     */
    [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]>;
    readonly [Symbol.toStringTag]?: string;
}

interface RawHeaders {
    "Content-Type": string;
    "Content-Length"?: string;
}
interface FormDataEncoderHeaders extends RawHeaders {
    "content-type": string;
    "content-length"?: string;
}

interface FormDataEncoderOptions {
    /**
     * When enabled, the encoder will emit additional per part headers, such as `Content-Length`.
     *
     * Please note that the web clients do not include these, so when enabled this option might cause an error if `multipart/form-data` does not consider additional headers.
     *
     * Defaults to `false`.
     */
    enableAdditionalHeaders?: boolean;
}
/**
 * Implements [`multipart/form-data` encoding algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#multipart/form-data-encoding-algorithm),
 * allowing to add support for spec-comliant [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) to an HTTP client.
 */
declare class FormDataEncoder {
    #private;
    /**
     * Returns boundary string
     */
    readonly boundary: string;
    /**
     * Returns Content-Type header
     */
    readonly contentType: string;
    /**
     * Returns Content-Length header
     */
    readonly contentLength: string | undefined;
    /**
     * Returns headers object with Content-Type and Content-Length header
     */
    readonly headers: Readonly<FormDataEncoderHeaders>;
    /**
     * Creates a multipart/form-data encoder.
     *
     * @param form FormData object to encode. This object must be a spec-compatible FormData implementation.
     *
     * @example
     *
     * ```js
     * import {Readable} from "stream"
     *
     * import {FormData, File, fileFromPath} from "formdata-node"
     * import {FormDataEncoder} from "form-data-encoder"
     *
     * import fetch from "node-fetch"
     *
     * const form = new FormData()
     *
     * form.set("field", "Just a random string")
     * form.set("file", new File(["Using files is class amazing"], "file.txt"))
     * form.set("fileFromPath", await fileFromPath("path/to/a/file.txt"))
     *
     * const encoder = new FormDataEncoder(form)
     *
     * const options = {
     *   method: "post",
     *   headers: encoder.headers,
     *   body: Readable.from(encoder)
     * }
     *
     * const response = await fetch("https://httpbin.org/post", options)
     *
     * console.log(await response.json())
     * ```
     */
    constructor(form: FormDataLike);
    /**
     * Creates multipart/form-data encoder with custom boundary string.
     *
     * @param form FormData object to encode. This object must be a spec-compatible FormData implementation.
     * @param boundary An optional boundary string that will be used by the encoder. If there's no boundary string is present, Encoder will generate it automatically.
     */
    constructor(form: FormDataLike, boundary: string);
    /**
     * Creates multipart/form-data encoder with additional options.
     *
     * @param form FormData object to encode. This object must be a spec-compatible FormData implementation.
     * @param options Additional options
     */
    constructor(form: FormDataLike, options: FormDataEncoderOptions);
    constructor(form: FormDataLike, boundary: string, options?: FormDataEncoderOptions);
    /**
     * Creates an iterator allowing to go through form-data parts (with metadata).
     * This method **will not** read the files and **will not** split values big into smaller chunks.
     *
     * Using this method, you can convert form-data content into Blob:
     *
     * @example
     *
     * ```ts
     * import {Readable} from "stream"
     *
     * import {FormDataEncoder} from "form-data-encoder"
     *
     * import {FormData} from "formdata-polyfill/esm-min.js"
     * import {fileFrom} from "fetch-blob/form.js"
     * import {File} from "fetch-blob/file.js"
     * import {Blob} from "fetch-blob"
     *
     * import fetch from "node-fetch"
     *
     * const form = new FormData()
     *
     * form.set("field", "Just a random string")
     * form.set("file", new File(["Using files is class amazing"]))
     * form.set("fileFromPath", await fileFrom("path/to/a/file.txt"))
     *
     * const encoder = new FormDataEncoder(form)
     *
     * const options = {
     *   method: "post",
     *   body: new Blob(encoder, {type: encoder.contentType})
     * }
     *
     * const response = await fetch("https://httpbin.org/post", options)
     *
     * console.log(await response.json())
     * ```
     */
    values(): Generator<Uint8Array | FileLike, void, undefined>;
    /**
     * Creates an async iterator allowing to perform the encoding by portions.
     * This method reads through files and splits big values into smaller pieces (65536 bytes per each).
     *
     * @example
     *
     * ```ts
     * import {Readable} from "stream"
     *
     * import {FormData, File, fileFromPath} from "formdata-node"
     * import {FormDataEncoder} from "form-data-encoder"
     *
     * import fetch from "node-fetch"
     *
     * const form = new FormData()
     *
     * form.set("field", "Just a random string")
     * form.set("file", new File(["Using files is class amazing"], "file.txt"))
     * form.set("fileFromPath", await fileFromPath("path/to/a/file.txt"))
     *
     * const encoder = new FormDataEncoder(form)
     *
     * const options = {
     *   method: "post",
     *   headers: encoder.headers,
     *   body: Readable.from(encoder.encode()) // or Readable.from(encoder)
     * }
     *
     * const response = await fetch("https://httpbin.org/post", options)
     *
     * console.log(await response.json())
     * ```
     */
    encode(): AsyncGenerator<Uint8Array, void, undefined>;
    /**
     * Creates an iterator allowing to read through the encoder data using for...of loops
     */
    [Symbol.iterator](): Generator<Uint8Array | FileLike, void, undefined>;
    /**
     * Creates an **async** iterator allowing to read through the encoder data using for-await...of loops
     */
    [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, undefined>;
}

/**
 * Check if given object is `File`.
 *
 * Note that this function will return `false` for Blob, because the FormDataEncoder expects FormData to return File when a value is binary data.
 *
 * @param value an object to test
 *
 * @api public
 *
 * This function will return `true` for FileAPI compatible `File` objects:
 *
 * ```ts
 * import {createReadStream} from "node:fs"
 *
 * import {isFile} from "form-data-encoder"
 *
 * isFile(new File(["Content"], "file.txt")) // -> true
 * ```
 *
 * However, if you pass a Node.js `Buffer`, or `Blob`, or `ReadStream`, it will return `false`:
 *
 * ```js
 * import {isFile} from "form-data-encoder"
 *
 * isFile(Buffer.from("Content")) // -> false
 * isFile(new Blob(["Content"])) // -> false
 * isFile(createReadStream("path/to/a/file.txt")) // -> false
 * ```
 */
declare const isFile: (value: unknown) => value is FileLike;

/**
 * Check if given object is FormData
 *
 * @param value an object to test
 */
declare const isFormData: (value: unknown) => value is FormDataLike;

export { type FileLike, FormDataEncoder, type FormDataEncoderOptions, type FormDataEntryValue, type FormDataLike, isFile, isFormData };
