"use strict";
/*! Based on fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> & David Frank */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Blob_parts, _Blob_type, _Blob_size;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blob = void 0;
const web_streams_polyfill_1 = require("web-streams-polyfill");
const isFunction_1 = require("./isFunction");
const blobHelpers_1 = require("./blobHelpers");
class Blob {
    constructor(blobParts = [], options = {}) {
        _Blob_parts.set(this, []);
        _Blob_type.set(this, "");
        _Blob_size.set(this, 0);
        options !== null && options !== void 0 ? options : (options = {});
        if (typeof blobParts !== "object" || blobParts === null) {
            throw new TypeError("Failed to construct 'Blob': "
                + "The provided value cannot be converted to a sequence.");
        }
        if (!(0, isFunction_1.isFunction)(blobParts[Symbol.iterator])) {
            throw new TypeError("Failed to construct 'Blob': "
                + "The object must have a callable @@iterator property.");
        }
        if (typeof options !== "object" && !(0, isFunction_1.isFunction)(options)) {
            throw new TypeError("Failed to construct 'Blob': parameter 2 cannot convert to dictionary.");
        }
        const encoder = new TextEncoder();
        for (const raw of blobParts) {
            let part;
            if (ArrayBuffer.isView(raw)) {
                part = new Uint8Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
            }
            else if (raw instanceof ArrayBuffer) {
                part = new Uint8Array(raw.slice(0));
            }
            else if (raw instanceof Blob) {
                part = raw;
            }
            else {
                part = encoder.encode(String(raw));
            }
            __classPrivateFieldSet(this, _Blob_size, __classPrivateFieldGet(this, _Blob_size, "f") + (ArrayBuffer.isView(part) ? part.byteLength : part.size), "f");
            __classPrivateFieldGet(this, _Blob_parts, "f").push(part);
        }
        const type = options.type === undefined ? "" : String(options.type);
        __classPrivateFieldSet(this, _Blob_type, /^[\x20-\x7E]*$/.test(type) ? type : "", "f");
    }
    static [(_Blob_parts = new WeakMap(), _Blob_type = new WeakMap(), _Blob_size = new WeakMap(), Symbol.hasInstance)](value) {
        return Boolean(value
            && typeof value === "object"
            && (0, isFunction_1.isFunction)(value.constructor)
            && ((0, isFunction_1.isFunction)(value.stream)
                || (0, isFunction_1.isFunction)(value.arrayBuffer))
            && /^(Blob|File)$/.test(value[Symbol.toStringTag]));
    }
    get type() {
        return __classPrivateFieldGet(this, _Blob_type, "f");
    }
    get size() {
        return __classPrivateFieldGet(this, _Blob_size, "f");
    }
    slice(start, end, contentType) {
        return new Blob((0, blobHelpers_1.sliceBlob)(__classPrivateFieldGet(this, _Blob_parts, "f"), this.size, start, end), {
            type: contentType
        });
    }
    async text() {
        const decoder = new TextDecoder();
        let result = "";
        for await (const chunk of (0, blobHelpers_1.consumeBlobParts)(__classPrivateFieldGet(this, _Blob_parts, "f"))) {
            result += decoder.decode(chunk, { stream: true });
        }
        result += decoder.decode();
        return result;
    }
    async arrayBuffer() {
        const view = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of (0, blobHelpers_1.consumeBlobParts)(__classPrivateFieldGet(this, _Blob_parts, "f"))) {
            view.set(chunk, offset);
            offset += chunk.length;
        }
        return view.buffer;
    }
    stream() {
        const iterator = (0, blobHelpers_1.consumeBlobParts)(__classPrivateFieldGet(this, _Blob_parts, "f"), true);
        return new web_streams_polyfill_1.ReadableStream({
            async pull(controller) {
                const { value, done } = await iterator.next();
                if (done) {
                    return queueMicrotask(() => controller.close());
                }
                controller.enqueue(value);
            },
            async cancel() {
                await iterator.return();
            }
        });
    }
    get [Symbol.toStringTag]() {
        return "Blob";
    }
}
exports.Blob = Blob;
Object.defineProperties(Blob.prototype, {
    type: { enumerable: true },
    size: { enumerable: true },
    slice: { enumerable: true },
    stream: { enumerable: true },
    text: { enumerable: true },
    arrayBuffer: { enumerable: true }
});
