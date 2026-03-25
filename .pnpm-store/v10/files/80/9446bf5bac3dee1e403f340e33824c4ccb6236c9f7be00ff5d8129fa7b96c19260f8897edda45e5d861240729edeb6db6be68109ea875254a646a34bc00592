"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitStream = void 0;
async function splitStream(stream) {
    if (typeof stream.stream === "function") {
        stream = stream.stream();
    }
    const readableStream = stream;
    return readableStream.tee();
}
exports.splitStream = splitStream;
