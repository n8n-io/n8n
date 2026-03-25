import { PassThrough } from "stream";
import { splitStream as splitWebStream } from "./splitStream.browser";
import { isBlob, isReadableStream } from "./stream-type-check";
export async function splitStream(stream) {
    if (isReadableStream(stream) || isBlob(stream)) {
        return splitWebStream(stream);
    }
    const stream1 = new PassThrough();
    const stream2 = new PassThrough();
    stream.pipe(stream1);
    stream.pipe(stream2);
    return [stream1, stream2];
}
