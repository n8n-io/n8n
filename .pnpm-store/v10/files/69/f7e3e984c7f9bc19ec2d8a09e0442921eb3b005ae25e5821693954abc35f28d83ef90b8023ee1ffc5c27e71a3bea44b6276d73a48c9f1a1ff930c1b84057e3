"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayloadHash = void 0;
const is_array_buffer_1 = require("@smithy/is-array-buffer");
const util_hex_encoding_1 = require("@smithy/util-hex-encoding");
const util_utf8_1 = require("@smithy/util-utf8");
const constants_1 = require("./constants");
const getPayloadHash = async ({ headers, body }, hashConstructor) => {
    for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === constants_1.SHA256_HEADER) {
            return headers[headerName];
        }
    }
    if (body == undefined) {
        return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    }
    else if (typeof body === "string" || ArrayBuffer.isView(body) || (0, is_array_buffer_1.isArrayBuffer)(body)) {
        const hashCtor = new hashConstructor();
        hashCtor.update((0, util_utf8_1.toUint8Array)(body));
        return (0, util_hex_encoding_1.toHex)(await hashCtor.digest());
    }
    return constants_1.UNSIGNED_PAYLOAD;
};
exports.getPayloadHash = getPayloadHash;
