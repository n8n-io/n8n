import type { Message, MessageDecoder } from "@smithy/types";
/**
 * @internal
 */
export interface MessageDecoderStreamOptions {
    inputStream: AsyncIterable<Uint8Array>;
    decoder: MessageDecoder;
}
/**
 * @internal
 */
export declare class MessageDecoderStream implements AsyncIterable<Message> {
    private readonly options;
    constructor(options: MessageDecoderStreamOptions);
    [Symbol.asyncIterator](): AsyncIterator<Message>;
    private asyncIterator;
}
