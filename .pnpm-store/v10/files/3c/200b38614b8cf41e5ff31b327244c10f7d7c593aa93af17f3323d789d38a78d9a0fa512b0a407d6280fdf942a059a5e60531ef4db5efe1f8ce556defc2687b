import { EventStreamCodec } from "@smithy/eventstream-codec";
import { MessageSigner, Provider } from "@smithy/types";
import { Transform, TransformCallback, TransformOptions } from "stream";
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
 * @internal
 *
 * A transform stream that signs the eventstream
 */
export declare class EventSigningStream extends Transform {
    private priorSignature;
    private messageSigner;
    private eventStreamCodec;
    private readonly systemClockOffsetProvider;
    constructor(options: EventSigningStreamOptions);
    _transform(chunk: Uint8Array, encoding: string, callback: TransformCallback): Promise<void>;
}
