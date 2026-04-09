import { EventStreamCodec } from "@smithy/eventstream-codec";
import { MessageSigner, Provider } from "@smithy/types";
export declare class EventSigningTransformStream extends TransformStream<
  Uint8Array,
  Uint8Array
> {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  constructor(
    initialSignature: string,
    messageSigner: MessageSigner,
    eventStreamCodec: EventStreamCodec,
    systemClockOffsetProvider: Provider<number>
  );
}
