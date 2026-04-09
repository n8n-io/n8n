// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { isNodeLike } from "@azure/core-util";
function isNodeReadableStream(x) {
    return Boolean(x && typeof x["pipe"] === "function");
}
const unimplementedMethods = {
    arrayBuffer: () => {
        throw new Error("Not implemented");
    },
    bytes: () => {
        throw new Error("Not implemented");
    },
    slice: () => {
        throw new Error("Not implemented");
    },
    text: () => {
        throw new Error("Not implemented");
    },
};
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
const rawContent = Symbol("rawContent");
/**
 * Type guard to check if a given object is a blob-like object with a raw content property.
 */
export function hasRawContent(x) {
    return typeof x[rawContent] === "function";
}
/**
 * Extract the raw content from a given blob-like object. If the input was created using createFile
 * or createFileFromStream, the exact content passed into createFile/createFileFromStream will be used.
 * For true instances of Blob and File, returns the actual blob.
 *
 * @internal
 */
export function getRawContent(blob) {
    if (hasRawContent(blob)) {
        return blob[rawContent]();
    }
    else {
        return blob;
    }
}
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
export function createFileFromStream(stream, name, options = {}) {
    return {
        ...unimplementedMethods,
        type: options.type ?? "",
        lastModified: options.lastModified ?? new Date().getTime(),
        webkitRelativePath: options.webkitRelativePath ?? "",
        size: options.size ?? -1,
        name,
        stream: () => {
            const s = stream();
            if (isNodeReadableStream(s)) {
                throw new Error("Not supported: a Node stream was provided as input to createFileFromStream.");
            }
            return s;
        },
        [rawContent]: stream,
    };
}
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
export function createFile(content, name, options = {}) {
    if (isNodeLike) {
        return {
            ...unimplementedMethods,
            type: options.type ?? "",
            lastModified: options.lastModified ?? new Date().getTime(),
            webkitRelativePath: options.webkitRelativePath ?? "",
            size: content.byteLength,
            name,
            arrayBuffer: async () => content.buffer,
            stream: () => new Blob([toArrayBuffer(content)]).stream(),
            [rawContent]: () => content,
        };
    }
    else {
        return new File([toArrayBuffer(content)], name, options);
    }
}
function toArrayBuffer(source) {
    if ("resize" in source.buffer) {
        // ArrayBuffer
        return source;
    }
    // SharedArrayBuffer
    return source.map((x) => x);
}
//# sourceMappingURL=file.js.map