import type { Message } from "./eventStream";
/**
 * @public
 */
export interface MessageEncoder {
    encode(message: Message): Uint8Array;
}
/**
 * @public
 */
export interface MessageDecoder {
    decode(message: ArrayBufferView): Message;
    feed(message: ArrayBufferView): void;
    endOfStream(): void;
    getMessage(): AvailableMessage;
    getAvailableMessages(): AvailableMessages;
}
/**
 * @public
 */
export interface AvailableMessage {
    getMessage(): Message | undefined;
    isEndOfStream(): boolean;
}
/**
 * @public
 */
export interface AvailableMessages {
    getMessages(): Message[];
    isEndOfStream(): boolean;
}
