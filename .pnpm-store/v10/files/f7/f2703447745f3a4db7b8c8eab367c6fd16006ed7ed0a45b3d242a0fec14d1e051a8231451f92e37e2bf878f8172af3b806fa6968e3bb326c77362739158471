import { isReadableStream } from "../stream-type-check";
import { ChecksumStream } from "./ChecksumStream";
import { createChecksumStream as createChecksumStreamWeb } from "./createChecksumStream.browser";
export function createChecksumStream(init) {
    if (typeof ReadableStream === "function" && isReadableStream(init.source)) {
        return createChecksumStreamWeb(init);
    }
    return new ChecksumStream(init);
}
