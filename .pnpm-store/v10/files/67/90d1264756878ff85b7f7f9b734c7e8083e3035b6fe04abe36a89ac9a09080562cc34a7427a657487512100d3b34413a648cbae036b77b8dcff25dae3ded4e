/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from 'events';
import * as net from 'net';
import * as tls from 'tls';
import { RedisCommandArguments } from '../commands';
export interface RedisSocketCommonOptions {
    /**
     * Connection Timeout (in milliseconds)
     */
    connectTimeout?: number;
    /**
     * Toggle [`Nagle's algorithm`](https://nodejs.org/api/net.html#net_socket_setnodelay_nodelay)
     */
    noDelay?: boolean;
    /**
     * Toggle [`keep-alive`](https://nodejs.org/api/net.html#net_socket_setkeepalive_enable_initialdelay)
     */
    keepAlive?: number | false;
    /**
     * When the socket closes unexpectedly (without calling `.quit()`/`.disconnect()`), the client uses `reconnectStrategy` to decide what to do. The following values are supported:
     * 1. `false` -> do not reconnect, close the client and flush the command queue.
     * 2. `number` -> wait for `X` milliseconds before reconnecting.
     * 3. `(retries: number, cause: Error) => false | number | Error` -> `number` is the same as configuring a `number` directly, `Error` is the same as `false`, but with a custom error.
     * Defaults to `retries => Math.min(retries * 50, 500)`
     */
    reconnectStrategy?: false | number | ((retries: number, cause: Error) => false | Error | number);
}
type RedisNetSocketOptions = Partial<net.SocketConnectOpts> & {
    tls?: false;
};
export interface RedisTlsSocketOptions extends tls.ConnectionOptions {
    tls: true;
}
export type RedisSocketOptions = RedisSocketCommonOptions & (RedisNetSocketOptions | RedisTlsSocketOptions);
export type RedisSocketInitiator = () => Promise<void>;
export default class RedisSocket extends EventEmitter {
    #private;
    get isOpen(): boolean;
    get isReady(): boolean;
    get writableNeedDrain(): boolean;
    constructor(initiator: RedisSocketInitiator, options?: RedisSocketOptions);
    connect(): Promise<void>;
    writeCommand(args: RedisCommandArguments): void;
    disconnect(): void;
    quit<T>(fn: () => Promise<T>): Promise<T>;
    cork(): void;
    ref(): void;
    unref(): void;
}
export {};
