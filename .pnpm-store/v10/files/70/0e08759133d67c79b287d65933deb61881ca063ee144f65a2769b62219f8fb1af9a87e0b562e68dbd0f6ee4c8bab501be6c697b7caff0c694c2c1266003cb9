// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { AnthropicError } from "../../core/error.mjs";
import { encodeUTF8 } from "./bytes.mjs";
export const toBase64 = (data) => {
    if (!data)
        return '';
    if (typeof globalThis.Buffer !== 'undefined') {
        return globalThis.Buffer.from(data).toString('base64');
    }
    if (typeof data === 'string') {
        data = encodeUTF8(data);
    }
    if (typeof btoa !== 'undefined') {
        return btoa(String.fromCharCode.apply(null, data));
    }
    throw new AnthropicError('Cannot generate base64 string; Expected `Buffer` or `btoa` to be defined');
};
export const fromBase64 = (str) => {
    if (typeof globalThis.Buffer !== 'undefined') {
        const buf = globalThis.Buffer.from(str, 'base64');
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    if (typeof atob !== 'undefined') {
        const bstr = atob(str);
        const buf = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
            buf[i] = bstr.charCodeAt(i);
        }
        return buf;
    }
    throw new AnthropicError('Cannot decode base64 string; Expected `Buffer` or `atob` to be defined');
};
//# sourceMappingURL=base64.mjs.map