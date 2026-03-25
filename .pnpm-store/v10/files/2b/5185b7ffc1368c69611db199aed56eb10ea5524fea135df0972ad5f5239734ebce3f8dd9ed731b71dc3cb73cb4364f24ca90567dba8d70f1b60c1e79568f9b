import { Message } from "@smithy/types";
/**
 * @internal
 */
export interface SmithyMessageDecoderStreamOptions<T> {
    readonly messageStream: AsyncIterable<Message>;
    readonly deserializer: (input: Message) => Promise<T | undefined>;
}
/**
 * @internal
 */
export declare class SmithyMessageDecoderStream<T> implements AsyncIterable<T> {
    private readonly options;
    constructor(options: SmithyMessageDecoderStreamOptions<T>);
    [Symbol.asyncIterator](): AsyncIterator<T>;
    private asyncIterator;
}
