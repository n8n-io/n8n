import { Decoder, Encoder, EventSigner, EventStreamPayloadHandler, EventStreamPayloadHandlerProvider } from "@smithy/types";
/**
 * @public
 */
export interface EventStreamInputConfig {
}
export type EventStreamResolvedConfig = {
    /**
     * A signer that signs the event of a event stream
     * @internal
     */
    eventSigner: EventSigner;
    /**
     * A handler that control the eventstream payload flow and sign the payload after payload stream starting to flow.
     * @internal
     */
    eventStreamPayloadHandler: EventStreamPayloadHandler;
};
interface PreviouslyResolved {
    utf8Encoder: Encoder;
    utf8Decoder: Decoder;
    signer: any;
    eventStreamPayloadHandlerProvider: EventStreamPayloadHandlerProvider;
}
export declare function resolveEventStreamConfig<T>(input: T & PreviouslyResolved & EventStreamInputConfig): T & EventStreamResolvedConfig;
export {};
