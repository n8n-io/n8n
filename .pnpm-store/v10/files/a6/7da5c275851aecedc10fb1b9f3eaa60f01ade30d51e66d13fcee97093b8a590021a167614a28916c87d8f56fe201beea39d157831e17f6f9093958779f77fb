import type { EventStreamCodec } from "@smithy/eventstream-codec";
import type { MessageSigner, Provider } from "@smithy/types";
/**
 * A transform stream that signs the eventstream.
 *
 * Implementation replicated from @aws-sdk/eventstream-handler-node::EventSigningStream
 * but modified to be compatible with web stream interface.
 *
 * @internal
 */
export declare class EventSigningTransformStream extends TransformStream<Uint8Array, Uint8Array> {
    /**
     * @override
     */
    readable: ReadableStream<Uint8Array>;
    /**
     * @override
     */
    writable: WritableStream<Uint8Array>;
    constructor(initialSignature: string, messageSigner: MessageSigner, eventStreamCodec: EventStreamCodec, systemClockOffsetProvider: Provider<number>);
}
