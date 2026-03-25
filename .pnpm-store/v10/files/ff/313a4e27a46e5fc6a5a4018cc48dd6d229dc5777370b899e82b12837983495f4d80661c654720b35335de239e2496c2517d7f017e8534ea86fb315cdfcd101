/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { TlsOptions } from 'cloudflare:sockets';
import { EventEmitter } from 'events';
/**
 * Wrapper around the Cloudflare built-in socket that can be used by the `Connection`.
 */
export declare class CloudflareSocket extends EventEmitter {
    readonly ssl: boolean;
    writable: boolean;
    destroyed: boolean;
    private _upgrading;
    private _upgraded;
    private _cfSocket;
    private _cfWriter;
    private _cfReader;
    constructor(ssl: boolean);
    setNoDelay(): this;
    setKeepAlive(): this;
    ref(): this;
    unref(): this;
    connect(port: number, host: string, connectListener?: (...args: unknown[]) => void): Promise<this | undefined>;
    _listen(): Promise<void>;
    _listenOnce(): Promise<void>;
    write(data: Uint8Array | string, encoding?: BufferEncoding, callback?: (...args: unknown[]) => void): true | void;
    end(data?: Buffer, encoding?: BufferEncoding, callback?: (...args: unknown[]) => void): this;
    destroy(reason: string): this;
    startTls(options: TlsOptions): void;
    _addClosedHandler(): void;
}
