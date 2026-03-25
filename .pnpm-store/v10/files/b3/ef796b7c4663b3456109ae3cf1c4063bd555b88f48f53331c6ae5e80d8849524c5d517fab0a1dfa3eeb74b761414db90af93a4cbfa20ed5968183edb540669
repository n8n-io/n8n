import type { EventStreamCodec } from "@smithy/eventstream-codec";
import type { Encoder, Message } from "@smithy/types";
/**
 * @internal
 */
export type UnmarshalledStreamOptions<T> = {
    eventStreamCodec: EventStreamCodec;
    deserializer: (input: Record<string, Message>) => Promise<T>;
    toUtf8: Encoder;
};
/**
 * @internal
 */
export declare function getUnmarshalledStream<T extends Record<string, any>>(source: AsyncIterable<Uint8Array>, options: UnmarshalledStreamOptions<T>): AsyncIterable<T>;
/**
 * @internal
 */
export declare function getMessageUnmarshaller<T extends Record<string, any>>(deserializer: (input: Record<string, Message>) => Promise<T>, toUtf8: Encoder): (input: Message) => Promise<T | undefined>;
