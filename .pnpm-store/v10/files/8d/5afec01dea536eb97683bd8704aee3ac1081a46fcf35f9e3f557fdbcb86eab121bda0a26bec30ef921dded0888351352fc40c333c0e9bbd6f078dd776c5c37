import { Message } from "@smithy/types";
/**
 * @internal
 */
export interface SmithyMessageEncoderStreamOptions<T> {
    inputStream: AsyncIterable<T>;
    serializer: (event: T) => Message;
}
/**
 * @internal
 */
export declare class SmithyMessageEncoderStream<T> implements AsyncIterable<Message> {
    private readonly options;
    constructor(options: SmithyMessageEncoderStreamOptions<T>);
    [Symbol.asyncIterator](): AsyncIterator<Message>;
    private asyncIterator;
}
