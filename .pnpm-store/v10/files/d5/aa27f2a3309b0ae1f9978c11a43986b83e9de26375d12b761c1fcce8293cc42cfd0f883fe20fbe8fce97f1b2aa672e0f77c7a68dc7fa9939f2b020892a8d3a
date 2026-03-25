"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBufferedReadable = createBufferedReadable;
const node_stream_1 = require("node:stream");
const ByteArrayCollector_1 = require("./ByteArrayCollector");
const createBufferedReadableStream_1 = require("./createBufferedReadableStream");
const stream_type_check_1 = require("./stream-type-check");
function createBufferedReadable(upstream, size, logger) {
    if ((0, stream_type_check_1.isReadableStream)(upstream)) {
        return (0, createBufferedReadableStream_1.createBufferedReadableStream)(upstream, size, logger);
    }
    const downstream = new node_stream_1.Readable({ read() { } });
    let streamBufferingLoggedWarning = false;
    let bytesSeen = 0;
    const buffers = [
        "",
        new ByteArrayCollector_1.ByteArrayCollector((size) => new Uint8Array(size)),
        new ByteArrayCollector_1.ByteArrayCollector((size) => Buffer.from(new Uint8Array(size))),
    ];
    let mode = -1;
    upstream.on("data", (chunk) => {
        const chunkMode = (0, createBufferedReadableStream_1.modeOf)(chunk, true);
        if (mode !== chunkMode) {
            if (mode >= 0) {
                downstream.push((0, createBufferedReadableStream_1.flush)(buffers, mode));
            }
            mode = chunkMode;
        }
        if (mode === -1) {
            downstream.push(chunk);
            return;
        }
        const chunkSize = (0, createBufferedReadableStream_1.sizeOf)(chunk);
        bytesSeen += chunkSize;
        const bufferSize = (0, createBufferedReadableStream_1.sizeOf)(buffers[mode]);
        if (chunkSize >= size && bufferSize === 0) {
            downstream.push(chunk);
        }
        else {
            const newSize = (0, createBufferedReadableStream_1.merge)(buffers, mode, chunk);
            if (!streamBufferingLoggedWarning && bytesSeen > size * 2) {
                streamBufferingLoggedWarning = true;
                logger?.warn(`@smithy/util-stream - stream chunk size ${chunkSize} is below threshold of ${size}, automatically buffering.`);
            }
            if (newSize >= size) {
                downstream.push((0, createBufferedReadableStream_1.flush)(buffers, mode));
            }
        }
    });
    upstream.on("end", () => {
        if (mode !== -1) {
            const remainder = (0, createBufferedReadableStream_1.flush)(buffers, mode);
            if ((0, createBufferedReadableStream_1.sizeOf)(remainder) > 0) {
                downstream.push(remainder);
            }
        }
        downstream.push(null);
    });
    return downstream;
}
