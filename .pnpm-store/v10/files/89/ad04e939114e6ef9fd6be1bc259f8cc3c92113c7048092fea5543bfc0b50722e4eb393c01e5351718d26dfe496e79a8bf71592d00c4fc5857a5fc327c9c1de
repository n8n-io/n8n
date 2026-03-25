import { Decoder, Encoder, EventStreamMarshaller as IEventStreamMarshaller, Message } from "@smithy/types";
/**
 * @internal
 */
export interface EventStreamMarshaller extends IEventStreamMarshaller {
}
/**
 * @internal
 */
export interface EventStreamMarshallerOptions {
    utf8Encoder: Encoder;
    utf8Decoder: Decoder;
}
/**
 * @internal
 *
 * Utility class used to serialize and deserialize event streams in
 * browsers and ReactNative.
 *
 * In browsers where ReadableStream API is available:
 * * deserialize from ReadableStream to an async iterable of output structure
 * * serialize from async iterable of input structure to ReadableStream
 * In ReactNative where only async iterable API is available:
 * * deserialize from async iterable of binaries to async iterable of output structure
 * * serialize from async iterable of input structure to async iterable of binaries
 *
 * We use ReadableStream API in browsers because of the consistency with other
 * streaming operations, where ReadableStream API is used to denote streaming data.
 * Whereas in ReactNative, ReadableStream API is not available, we use async iterable
 * for streaming data although it has lower throughput.
 */
export declare class EventStreamMarshaller {
    private readonly universalMarshaller;
    constructor({ utf8Encoder, utf8Decoder }: EventStreamMarshallerOptions);
    deserialize<T>(body: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>, deserializer: (input: Record<string, Message>) => Promise<T>): AsyncIterable<T>;
    /**
     * Generate a stream that serialize events into stream of binary chunks;
     *
     * Caveat is that streaming request payload doesn't work on browser with native
     * xhr or fetch handler currently because they don't support upload streaming.
     * reference:
     * * https://bugs.chromium.org/p/chromium/issues/detail?id=688906
     * * https://bugzilla.mozilla.org/show_bug.cgi?id=1387483
     *
     */
    serialize<T>(input: AsyncIterable<T>, serializer: (event: T) => Message): ReadableStream | AsyncIterable<Uint8Array>;
}
