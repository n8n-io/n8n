"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitStream = void 0;
const stream_1 = require("stream");
const splitStream_browser_1 = require("./splitStream.browser");
const stream_type_check_1 = require("./stream-type-check");
async function splitStream(stream) {
    if ((0, stream_type_check_1.isReadableStream)(stream) || (0, stream_type_check_1.isBlob)(stream)) {
        return (0, splitStream_browser_1.splitStream)(stream);
    }
    const stream1 = new stream_1.PassThrough();
    const stream2 = new stream_1.PassThrough();
    stream.pipe(stream1);
    stream.pipe(stream2);
    return [stream1, stream2];
}
exports.splitStream = splitStream;
