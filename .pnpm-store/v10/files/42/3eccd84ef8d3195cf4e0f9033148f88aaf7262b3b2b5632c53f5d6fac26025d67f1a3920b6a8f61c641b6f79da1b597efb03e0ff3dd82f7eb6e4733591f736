import { EventStreamCodec } from "@smithy/eventstream-codec";
import { MessageSigner, Provider } from "@smithy/types";
export declare const getEventSigningTransformStream: (
  initialSignature: string,
  messageSigner: MessageSigner,
  eventStreamCodec: EventStreamCodec,
  systemClockOffsetProvider: Provider<number>
) => TransformStream<Uint8Array, Uint8Array>;
