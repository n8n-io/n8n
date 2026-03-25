import events = require('events');
import { Replies, Options, Message, ServerProperties } from './properties';
export * from './properties';

export interface Connection extends events.EventEmitter {
    close(callback?: (err: any) => void): void;
    createChannel(callback: (err: any, channel: Channel) => void): void;
    createConfirmChannel(callback: (err: any, confirmChannel: ConfirmChannel) => void): void;
    connection: {
        serverProperties: ServerProperties;
    };
}

export interface Channel extends events.EventEmitter {
    connection: Connection;

    close(callback: (err: any) => void): void;

    assertQueue(queue?: string, options?: Options.AssertQueue, callback?: (err: any, ok: Replies.AssertQueue) => void): void;
    checkQueue(queue: string, callback?: (err: any, ok: Replies.AssertQueue) => void): void;

    deleteQueue(queue: string, options?: Options.DeleteQueue, callback?: (err: any, ok: Replies.DeleteQueue) => void): void;
    purgeQueue(queue: string, callback?: (err: any, ok: Replies.PurgeQueue) => void): void;

    bindQueue(queue: string, source: string, pattern: string, args?: any, callback?: (err: any, ok: Replies.Empty) => void): void;
    unbindQueue(queue: string, source: string, pattern: string, args?: any, callback?: (err: any, ok: Replies.Empty) => void): void;

    assertExchange(exchange: string, type: string, options?: Options.AssertExchange, callback?: (err: any, ok: Replies.AssertExchange) => void): void;
    checkExchange(exchange: string, callback?: (err: any, ok: Replies.Empty) => void): void;

    deleteExchange(exchange: string, options?: Options.DeleteExchange, callback?: (err: any, ok: Replies.Empty) => void): void;

    bindExchange(destination: string, source: string, pattern: string, args?: any, callback?: (err: any, ok: Replies.Empty) => void): void;
    unbindExchange(destination: string, source: string, pattern: string, args?: any, callback?: (err: any, ok: Replies.Empty) => void): void;

    publish(exchange: string, routingKey: string, content: Buffer, options?: Options.Publish): boolean;
    sendToQueue(queue: string, content: Buffer, options?: Options.Publish): boolean;

    consume(queue: string, onMessage: (msg: Message | null) => void, options?: Options.Consume, callback?: (err: any, ok: Replies.Consume) => void): void;

    cancel(consumerTag: string, callback?: (err: any, ok: Replies.Empty) => void): void;
    get(queue: string, options?: Options.Get, callback?: (err: any, ok: Message | false) => void): void;

    ack(message: Message, allUpTo?: boolean): void;
    ackAll(): void;

    nack(message: Message, allUpTo?: boolean, requeue?: boolean): void;
    nackAll(requeue?: boolean): void;
    reject(message: Message, requeue?: boolean): void;

    prefetch(count: number, global?: boolean): void;
    recover(callback?: (err: any, ok: Replies.Empty) => void): void;
}

export interface ConfirmChannel extends Channel {
    publish(exchange: string, routingKey: string, content: Buffer, options?: Options.Publish, callback?: (err: any, ok: Replies.Empty) => void): boolean;
    sendToQueue(queue: string, content: Buffer, options?: Options.Publish, callback?: (err: any, ok: Replies.Empty) => void): boolean;

    waitForConfirms(callback?: (err: any) => void): void;
}

export const credentials: {
    amqplain(username: string, password: string): {
        mechanism: string;
        response(): Buffer;
        username: string;
        password: string;
    };
    external(): {
        mechanism: string;
        response(): Buffer;
    };
    plain(username: string, password: string): {
        mechanism: string;
        response(): Buffer;
        username: string;
        password: string;
    };
};

export function connect(callback: (err: any, connection: Connection) => void): void;
export function connect(url: string | Options.Connect, callback: (err: any, connection: Connection) => void): void;
export function connect(url: string | Options.Connect, socketOptions: any, callback: (err: any, connection: Connection) => void): void;
