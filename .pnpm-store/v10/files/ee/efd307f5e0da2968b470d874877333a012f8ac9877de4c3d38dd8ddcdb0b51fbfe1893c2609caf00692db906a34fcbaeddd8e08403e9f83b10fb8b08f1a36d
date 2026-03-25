import { Server, Client, CloseOptions, ServerOptions } from 'mock-socket';
import { RawMatcherFn } from '@vitest/expect';

/**
 * @copyright Romain Bertrand 2018
 * @copyright Akiomi Kamakura 2023
 */

declare function deriveToHaveReceivedMessage(name: string, fn: RawMatcherFn): RawMatcherFn;

/**
 * @copyright Romain Bertrand 2018
 * @copyright Akiomi Kamakura 2023
 */

declare function deriveToReceiveMessage(name: string, fn: RawMatcherFn): RawMatcherFn;

/**
 * @copyright Romain Bertrand 2018
 * @copyright Akiomi Kamakura 2023
 */
interface ReceiveMessageOptions {
    timeout?: number;
}

/**
 * @copyright Romain Bertrand 2018
 */
declare class Queue<ItemT> {
    pendingItems: Array<ItemT>;
    nextItemResolver: () => void;
    nextItem: Promise<void>;
    put(item: ItemT): void;
    get(): Promise<ItemT>;
}

/**
 * @copyright Romain Bertrand 2018
 * @copyright Akiomi Kamakura 2023
 */

interface WSOptions extends ServerOptions {
    jsonProtocol?: boolean;
}
type DeserializedMessage<TMessage = object> = string | TMessage;
declare class WS {
    server: Server;
    serializer: (deserializedMessage: DeserializedMessage) => string;
    deserializer: (message: string) => DeserializedMessage;
    static instances: Array<WS>;
    messages: Array<DeserializedMessage>;
    messagesToConsume: Queue<unknown>;
    private _isConnected;
    private _isClosed;
    static clean(): void;
    constructor(url: string, opts?: WSOptions);
    get connected(): Promise<Client>;
    get closed(): Promise<void>;
    get nextMessage(): Promise<unknown>;
    on(eventName: 'connection' | 'message' | 'close', callback: (socket: Client) => void): void;
    send(message: DeserializedMessage): void;
    close(options?: CloseOptions): void;
    error(options?: CloseOptions): void;
}

/**
 * @copyright Romain Bertrand 2018
 * @copyright Akiomi Kamakura 2023
 */

interface CustomMatchers<R = unknown> {
    toReceiveMessage<TMessage = object>(message: DeserializedMessage<TMessage>, options?: ReceiveMessageOptions): Promise<R>;
    toHaveReceivedMessages<TMessage = object>(messages: Array<DeserializedMessage<TMessage>>): R;
}

/**
 * @copyright Romain Bertrand 2018
 * @copyright Akiomi Kamakura 2023
 */

declare module 'vitest' {
    interface Assertion<T = any> extends CustomMatchers<T> {
    }
    interface AsymmetricMatchersContaining extends CustomMatchers {
    }
}

export { ReceiveMessageOptions, WS, WS as default, deriveToHaveReceivedMessage, deriveToReceiveMessage };
