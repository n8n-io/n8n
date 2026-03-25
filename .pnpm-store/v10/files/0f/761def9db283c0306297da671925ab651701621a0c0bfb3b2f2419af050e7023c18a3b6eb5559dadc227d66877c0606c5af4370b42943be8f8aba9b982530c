"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChecksumStream = createChecksumStream;
const stream_type_check_1 = require("../stream-type-check");
const ChecksumStream_1 = require("./ChecksumStream");
const createChecksumStream_browser_1 = require("./createChecksumStream.browser");
function createChecksumStream(init) {
    if (typeof ReadableStream === "function" && (0, stream_type_check_1.isReadableStream)(init.source)) {
        return (0, createChecksumStream_browser_1.createChecksumStream)(init);
    }
    return new ChecksumStream_1.ChecksumStream(init);
}
