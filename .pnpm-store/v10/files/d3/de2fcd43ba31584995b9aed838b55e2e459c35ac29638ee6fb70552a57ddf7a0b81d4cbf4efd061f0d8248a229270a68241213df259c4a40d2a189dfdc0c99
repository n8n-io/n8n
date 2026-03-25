import { Message, MessageEncoder } from "@smithy/types";
/**
 * @internal
 */
export interface MessageEncoderStreamOptions {
    messageStream: AsyncIterable<Message>;
    encoder: MessageEncoder;
    includeEndFrame?: Boolean;
}
/**
 * @internal
 */
export declare class MessageEncoderStream implements AsyncIterable<Uint8Array> {
    private readonly options;
    constructor(options: MessageEncoderStreamOptions);
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
    private asyncIterator;
}
