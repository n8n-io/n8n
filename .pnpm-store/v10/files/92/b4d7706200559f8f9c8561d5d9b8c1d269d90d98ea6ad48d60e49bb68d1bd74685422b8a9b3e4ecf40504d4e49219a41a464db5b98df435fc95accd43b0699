import { Duplex, Transform } from 'readable-stream';
import { IClientOptions } from './client';
export declare function writev(chunks: {
    chunk: any;
    encoding: string;
}[], cb: (err?: Error) => void): void;
export declare class BufferedDuplex extends Duplex {
    socket: WebSocket;
    private proxy;
    private isSocketOpen;
    private writeQueue;
    constructor(opts: IClientOptions, proxy: Transform, socket: WebSocket);
    _read(size?: number): void;
    _write(chunk: any, encoding: string, cb: (err?: Error) => void): void;
    _final(callback: (error?: Error) => void): void;
    _destroy(err: Error, callback: (error: Error) => void): void;
    socketReady(): void;
    private writeToProxy;
    private processWriteQueue;
}
