"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUint8Array = void 0;
const fromUtf8_1 = require("./fromUtf8");
const toUint8Array = (data) => {
    if (typeof data === "string") {
        return (0, fromUtf8_1.fromUtf8)(data);
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }
    return new Uint8Array(data);
};
exports.toUint8Array = toUint8Array;
