import type { Decoder, Encoder, EventStreamMarshaller as IEventStreamMarshaller, Message } from "@smithy/types";
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
 */
export declare class EventStreamMarshaller {
    private readonly eventStreamCodec;
    private readonly utfEncoder;
    constructor({ utf8Encoder, utf8Decoder }: EventStreamMarshallerOptions);
    deserialize<T>(body: AsyncIterable<Uint8Array>, deserializer: (input: Record<string, Message>) => Promise<T>): AsyncIterable<T>;
    serialize<T>(inputStream: AsyncIterable<T>, serializer: (event: T) => Message): AsyncIterable<Uint8Array>;
}
