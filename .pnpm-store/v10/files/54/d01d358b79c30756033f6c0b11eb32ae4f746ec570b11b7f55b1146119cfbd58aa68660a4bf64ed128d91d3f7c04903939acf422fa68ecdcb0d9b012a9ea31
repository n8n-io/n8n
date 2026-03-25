import {
  Decoder,
  Encoder,
  EventStreamPayloadHandler as IEventStreamPayloadHandler,
  FinalizeHandler,
  FinalizeHandlerArguments,
  FinalizeHandlerOutput,
  HandlerExecutionContext,
  MessageSigner,
  MetadataBearer,
  Provider,
} from "@smithy/types";
export interface EventStreamPayloadHandlerOptions {
  messageSigner: Provider<MessageSigner>;
  utf8Encoder: Encoder;
  utf8Decoder: Decoder;
  systemClockOffset?: number;
}
export declare class EventStreamPayloadHandler
  implements IEventStreamPayloadHandler
{
  private readonly messageSigner;
  private readonly eventStreamCodec;
  private readonly systemClockOffsetProvider;
  constructor(options: EventStreamPayloadHandlerOptions);
  handle<T extends MetadataBearer>(
    next: FinalizeHandler<any, T>,
    args: FinalizeHandlerArguments<any>,
    context?: HandlerExecutionContext
  ): Promise<FinalizeHandlerOutput<T>>;
}
