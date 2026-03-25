"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChecksumStream = void 0;
const util_base64_1 = require("@smithy/util-base64");
const stream_type_check_1 = require("../stream-type-check");
const ChecksumStream_browser_1 = require("./ChecksumStream.browser");
const createChecksumStream = ({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder, }) => {
    var _a, _b;
    if (!(0, stream_type_check_1.isReadableStream)(source)) {
        throw new Error(`@smithy/util-stream: unsupported source type ${(_b = (_a = source === null || source === void 0 ? void 0 : source.constructor) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : source} in ChecksumStream.`);
    }
    const encoder = base64Encoder !== null && base64Encoder !== void 0 ? base64Encoder : util_base64_1.toBase64;
    if (typeof TransformStream !== "function") {
        throw new Error("@smithy/util-stream: unable to instantiate ChecksumStream because API unavailable: ReadableStream/TransformStream.");
    }
    const transform = new TransformStream({
        start() { },
        async transform(chunk, controller) {
            checksum.update(chunk);
            controller.enqueue(chunk);
        },
        async flush(controller) {
            const digest = await checksum.digest();
            const received = encoder(digest);
            if (expectedChecksum !== received) {
                const error = new Error(`Checksum mismatch: expected "${expectedChecksum}" but received "${received}"` +
                    ` in response header "${checksumSourceLocation}".`);
                controller.error(error);
            }
            else {
                controller.terminate();
            }
        },
    });
    source.pipeThrough(transform);
    const readable = transform.readable;
    Object.setPrototypeOf(readable, ChecksumStream_browser_1.ChecksumStream.prototype);
    return readable;
};
exports.createChecksumStream = createChecksumStream;
