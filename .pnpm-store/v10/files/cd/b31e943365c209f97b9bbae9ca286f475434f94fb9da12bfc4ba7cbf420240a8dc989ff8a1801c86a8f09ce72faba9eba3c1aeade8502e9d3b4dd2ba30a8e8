import { Decoder, Encoder, EventStreamPayloadHandler as IEventStreamPayloadHandler, FinalizeHandler, FinalizeHandlerArguments, FinalizeHandlerOutput, HandlerExecutionContext, MessageSigner, MetadataBearer, Provider } from "@smithy/types";
export interface EventStreamPayloadHandlerOptions {
    messageSigner: Provider<MessageSigner>;
    utf8Encoder: Encoder;
    utf8Decoder: Decoder;
    systemClockOffset?: number;
}
/**
 * A handler that control the eventstream payload flow:
 * 1. Pause stream for initial request.
 * 2. Close the stream if initial request fails.
 * 3. Start piping payload when connection is established.
 * 4. Sign the payload after payload stream starting to flow.
 */
export declare class EventStreamPayloadHandler implements IEventStreamPayloadHandler {
    private readonly messageSigner;
    private readonly eventStreamCodec;
    private readonly systemClockOffsetProvider;
    constructor(options: EventStreamPayloadHandlerOptions);
    handle<T extends MetadataBearer>(next: FinalizeHandler<any, T>, args: FinalizeHandlerArguments<any>, context?: HandlerExecutionContext): Promise<FinalizeHandlerOutput<T>>;
}
