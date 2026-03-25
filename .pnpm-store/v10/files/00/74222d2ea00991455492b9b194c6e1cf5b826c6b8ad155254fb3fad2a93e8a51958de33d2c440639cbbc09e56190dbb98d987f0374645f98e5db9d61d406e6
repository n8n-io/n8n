import { Readable } from "node:stream";
import { ByteArrayCollector } from "./ByteArrayCollector";
import { createBufferedReadableStream, flush, merge, modeOf, sizeOf } from "./createBufferedReadableStream";
import { isReadableStream } from "./stream-type-check";
export function createBufferedReadable(upstream, size, logger) {
    if (isReadableStream(upstream)) {
        return createBufferedReadableStream(upstream, size, logger);
    }
    const downstream = new Readable({ read() { } });
    let streamBufferingLoggedWarning = false;
    let bytesSeen = 0;
    const buffers = [
        "",
        new ByteArrayCollector((size) => new Uint8Array(size)),
        new ByteArrayCollector((size) => Buffer.from(new Uint8Array(size))),
    ];
    let mode = -1;
    upstream.on("data", (chunk) => {
        const chunkMode = modeOf(chunk, true);
        if (mode !== chunkMode) {
            if (mode >= 0) {
                downstream.push(flush(buffers, mode));
            }
            mode = chunkMode;
        }
        if (mode === -1) {
            downstream.push(chunk);
            return;
        }
        const chunkSize = sizeOf(chunk);
        bytesSeen += chunkSize;
        const bufferSize = sizeOf(buffers[mode]);
        if (chunkSize >= size && bufferSize === 0) {
            downstream.push(chunk);
        }
        else {
            const newSize = merge(buffers, mode, chunk);
            if (!streamBufferingLoggedWarning && bytesSeen > size * 2) {
                streamBufferingLoggedWarning = true;
                logger?.warn(`@smithy/util-stream - stream chunk size ${chunkSize} is below threshold of ${size}, automatically buffering.`);
            }
            if (newSize >= size) {
                downstream.push(flush(buffers, mode));
            }
        }
    });
    upstream.on("end", () => {
        if (mode !== -1) {
            const remainder = flush(buffers, mode);
            if (sizeOf(remainder) > 0) {
                downstream.push(remainder);
            }
        }
        downstream.push(null);
    });
    return downstream;
}
