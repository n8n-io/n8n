/// <reference types="node" />
import { Decoder, Encoder, EventStreamMarshaller as IEventStreamMarshaller, Message } from "@smithy/types";
import { Readable } from "stream";
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
    private readonly universalMarshaller;
    constructor({ utf8Encoder, utf8Decoder }: EventStreamMarshallerOptions);
    deserialize<T>(body: Readable, deserializer: (input: Record<string, Message>) => Promise<T>): AsyncIterable<T>;
    serialize<T>(input: AsyncIterable<T>, serializer: (event: T) => Message): Readable;
}
