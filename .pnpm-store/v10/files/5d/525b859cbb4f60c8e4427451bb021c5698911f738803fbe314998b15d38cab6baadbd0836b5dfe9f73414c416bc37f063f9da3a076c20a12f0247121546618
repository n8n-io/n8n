import {
  Decoder,
  Encoder,
  EventSigner,
  EventStreamPayloadHandler,
  EventStreamPayloadHandlerProvider,
} from "@smithy/types";
export interface EventStreamInputConfig {}
export type EventStreamResolvedConfig = {
  eventSigner: EventSigner;
  eventStreamPayloadHandler: EventStreamPayloadHandler;
};
interface PreviouslyResolved {
  utf8Encoder: Encoder;
  utf8Decoder: Decoder;
  signer: any;
  eventStreamPayloadHandlerProvider: EventStreamPayloadHandlerProvider;
}
export declare function resolveEventStreamConfig<T>(
  input: T & PreviouslyResolved & EventStreamInputConfig
): T & EventStreamResolvedConfig;
export {};
