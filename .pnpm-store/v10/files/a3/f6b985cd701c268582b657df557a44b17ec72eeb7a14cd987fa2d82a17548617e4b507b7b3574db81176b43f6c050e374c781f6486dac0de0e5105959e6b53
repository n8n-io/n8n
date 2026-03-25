                              
import { ReadableStream, type Response } from "../_shims/index.js";
export type ServerSentEvent = {
    event: string | null;
    data: string;
    raw: string[];
};
export declare class Stream<Item> implements AsyncIterable<Item> {
    private iterator;
    controller: AbortController;
    constructor(iterator: () => AsyncIterator<Item>, controller: AbortController);
    static fromSSEResponse<Item>(response: Response, controller: AbortController): Stream<Item>;
    /**
     * Generates a Stream from a newline-separated ReadableStream
     * where each item is a JSON value.
     */
    static fromReadableStream<Item>(readableStream: ReadableStream, controller: AbortController): Stream<Item>;
    [Symbol.asyncIterator](): AsyncIterator<Item>;
    /**
     * Splits the stream into two streams which can be
     * independently read from at different speeds.
     */
    tee(): [Stream<Item>, Stream<Item>];
    /**
     * Converts this stream to a newline-separated ReadableStream of
     * JSON stringified values in the stream
     * which can be turned back into a Stream with `Stream.fromReadableStream()`.
     */
    toReadableStream(): ReadableStream;
}
/**
 * Most browsers don't yet have async iterable support for ReadableStream,
 * and Node has a very different way of reading bytes from its "ReadableStream".
 *
 * This polyfill was pulled from https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
 */
export declare function readableStreamAsyncIterable<T>(stream: any): AsyncIterableIterator<T>;
//# sourceMappingURL=streaming.d.ts.map