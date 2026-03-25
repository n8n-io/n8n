import { EventStreamCodec } from "@smithy/eventstream-codec";
import { MessageSigner, Provider } from "@smithy/types";
/**
 * Get a transform stream that signs the eventstream
 * Implementation replicated from @aws-sdk/eventstream-handler-node::EventSigningStream
 * but modified to be compatible with WHATWG stream interface
 *
 * @internal
 */
export declare const getEventSigningTransformStream: (initialSignature: string, messageSigner: MessageSigner, eventStreamCodec: EventStreamCodec, systemClockOffsetProvider: Provider<number>) => TransformStream<Uint8Array, Uint8Array>;
