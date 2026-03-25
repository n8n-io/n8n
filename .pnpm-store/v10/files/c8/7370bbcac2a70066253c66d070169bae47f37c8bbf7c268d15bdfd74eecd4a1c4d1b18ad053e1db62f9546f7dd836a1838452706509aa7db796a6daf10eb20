"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromString = exports.fromArrayBuffer = void 0;
const is_array_buffer_1 = require("@smithy/is-array-buffer");
const buffer_1 = require("buffer");
const fromArrayBuffer = (input, offset = 0, length = input.byteLength - offset) => {
    if (!(0, is_array_buffer_1.isArrayBuffer)(input)) {
        throw new TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
    }
    return buffer_1.Buffer.from(input, offset, length);
};
exports.fromArrayBuffer = fromArrayBuffer;
const fromString = (input, encoding) => {
    if (typeof input !== "string") {
        throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
    }
    return encoding ? buffer_1.Buffer.from(input, encoding) : buffer_1.Buffer.from(input);
};
exports.fromString = fromString;
