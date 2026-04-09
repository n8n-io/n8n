import type { EventStreamCodec } from "@smithy/eventstream-codec";
import type { MessageSigner, Provider } from "@smithy/types";
import { type TransformCallback, type TransformOptions, Transform } from "node:stream";
/**
 * @internal
 */
export interface EventSigningStreamOptions extends TransformOptions {
    priorSignature: string;
    messageSigner: MessageSigner;
    eventStreamCodec: EventStreamCodec;
    systemClockOffsetProvider: Provider<number>;
}
/**
 * A transform stream that signs the eventstream.
 * @internal
 */
export declare class EventSigningTransformStream extends Transform {
    private priorSignature;
    private messageSigner;
    private eventStreamCodec;
    private readonly systemClockOffsetProvider;
    constructor(options: EventSigningStreamOptions);
    _transform(chunk: Uint8Array, encoding: string, callback: TransformCallback): Promise<void>;
}
