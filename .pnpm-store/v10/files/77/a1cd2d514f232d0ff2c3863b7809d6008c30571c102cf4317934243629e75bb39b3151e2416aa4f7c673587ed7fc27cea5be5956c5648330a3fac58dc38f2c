"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromUtf8 = void 0;
const util_buffer_from_1 = require("@smithy/util-buffer-from");
const fromUtf8 = (input) => {
    const buf = (0, util_buffer_from_1.fromString)(input, "utf8");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
};
exports.fromUtf8 = fromUtf8;
