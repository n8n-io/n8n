"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.concat = concat;
const typeGuards_js_1 = require("./typeGuards.js");
/**
 * Drain the content of the given ReadableStream into a Blob.
 * The blob's content may end up in memory or on disk dependent on size.
 */
function drain(stream) {
    return new Response(stream).blob();
}
async function toBlobPart(source) {
    if (source instanceof Blob || source instanceof Uint8Array) {
        return source;
    }
    if ((0, typeGuards_js_1.isWebReadableStream)(source)) {
        return drain(source);
    }
    else {
        throw new Error("Unsupported source type. Only Blob, Uint8Array, and ReadableStream are supported in browser.");
    }
}
/**
 * Converts a Uint8Array to a Uint8Array<ArrayBuffer>.
 * @param source - The source Uint8Array.
 * @returns
 */
function arrayToArrayBuffer(source) {
    if ("resize" in source.buffer) {
        // ArrayBuffer
        return source;
    }
    // SharedArrayBuffer
    return source.map((x) => x);
}
/**
 * Utility function that concatenates a set of binary inputs into one combined output.
 *
 * @param sources - array of sources for the concatenation
 * @returns - in Node, a (() =\> NodeJS.ReadableStream) which, when read, produces a concatenation of all the inputs.
 *           In browser, returns a `Blob` representing all the concatenated inputs.
 *
 * @internal
 */
async function concat(sources) {
    const parts = [];
    for (const source of sources) {
        const blobPart = await toBlobPart(typeof source === "function" ? source() : source);
        if (blobPart instanceof Blob) {
            parts.push(blobPart);
        }
        else {
            // Uint8Array
            parts.push(new Blob([arrayToArrayBuffer(blobPart)]));
        }
    }
    return new Blob(parts);
}
//# sourceMappingURL=concat.common.js.map