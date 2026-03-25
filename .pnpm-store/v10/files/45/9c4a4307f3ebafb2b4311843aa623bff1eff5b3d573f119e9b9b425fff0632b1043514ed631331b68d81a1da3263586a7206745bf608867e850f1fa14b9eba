import { ByteArrayCollector } from "./ByteArrayCollector";
export function createBufferedReadableStream(upstream, size, logger) {
    const reader = upstream.getReader();
    let streamBufferingLoggedWarning = false;
    let bytesSeen = 0;
    const buffers = ["", new ByteArrayCollector((size) => new Uint8Array(size))];
    let mode = -1;
    const pull = async (controller) => {
        const { value, done } = await reader.read();
        const chunk = value;
        if (done) {
            if (mode !== -1) {
                const remainder = flush(buffers, mode);
                if (sizeOf(remainder) > 0) {
                    controller.enqueue(remainder);
                }
            }
            controller.close();
        }
        else {
            const chunkMode = modeOf(chunk, false);
            if (mode !== chunkMode) {
                if (mode >= 0) {
                    controller.enqueue(flush(buffers, mode));
                }
                mode = chunkMode;
            }
            if (mode === -1) {
                controller.enqueue(chunk);
                return;
            }
            const chunkSize = sizeOf(chunk);
            bytesSeen += chunkSize;
            const bufferSize = sizeOf(buffers[mode]);
            if (chunkSize >= size && bufferSize === 0) {
                controller.enqueue(chunk);
            }
            else {
                const newSize = merge(buffers, mode, chunk);
                if (!streamBufferingLoggedWarning && bytesSeen > size * 2) {
                    streamBufferingLoggedWarning = true;
                    logger?.warn(`@smithy/util-stream - stream chunk size ${chunkSize} is below threshold of ${size}, automatically buffering.`);
                }
                if (newSize >= size) {
                    controller.enqueue(flush(buffers, mode));
                }
                else {
                    await pull(controller);
                }
            }
        }
    };
    return new ReadableStream({
        pull,
    });
}
export const createBufferedReadable = createBufferedReadableStream;
export function merge(buffers, mode, chunk) {
    switch (mode) {
        case 0:
            buffers[0] += chunk;
            return sizeOf(buffers[0]);
        case 1:
        case 2:
            buffers[mode].push(chunk);
            return sizeOf(buffers[mode]);
    }
}
export function flush(buffers, mode) {
    switch (mode) {
        case 0:
            const s = buffers[0];
            buffers[0] = "";
            return s;
        case 1:
        case 2:
            return buffers[mode].flush();
    }
    throw new Error(`@smithy/util-stream - invalid index ${mode} given to flush()`);
}
export function sizeOf(chunk) {
    return chunk?.byteLength ?? chunk?.length ?? 0;
}
export function modeOf(chunk, allowBuffer = true) {
    if (allowBuffer && typeof Buffer !== "undefined" && chunk instanceof Buffer) {
        return 2;
    }
    if (chunk instanceof Uint8Array) {
        return 1;
    }
    if (typeof chunk === "string") {
        return 0;
    }
    return -1;
}
