/// <reference types="node" />
import { Readable } from "stream";
export declare namespace Stream {
    interface Args {
        /**
         * The HTTP response stream to read from.
         */
        stream: Readable | ReadableStream;
        /**
         * The event shape to use for parsing the stream data.
         */
        eventShape: JsonEvent | SseEvent;
        /**
         * An abort signal to stop the stream.
         */
        signal?: AbortSignal;
    }
    interface JsonEvent {
        type: "json";
        messageTerminator: string;
    }
    interface SseEvent {
        type: "sse";
        streamTerminator?: string;
    }
}
export declare class Stream<T> implements AsyncIterable<T> {
    private stream;
    private parse;
    /**
     * The prefix to use for each message. For example,
     * for SSE, the prefix is "data: ".
     */
    private prefix;
    private messageTerminator;
    private streamTerminator;
    private controller;
    constructor({ stream, parse, eventShape, signal }: Stream.Args & {
        parse: (val: unknown) => Promise<T>;
    });
    private iterMessages;
    [Symbol.asyncIterator](): AsyncIterator<T, void, unknown>;
    private decodeChunk;
}
/**
 * Browser polyfill for ReadableStream
 */
export declare function readableStreamAsyncIterable<T>(stream: any): AsyncIterableIterator<T>;
