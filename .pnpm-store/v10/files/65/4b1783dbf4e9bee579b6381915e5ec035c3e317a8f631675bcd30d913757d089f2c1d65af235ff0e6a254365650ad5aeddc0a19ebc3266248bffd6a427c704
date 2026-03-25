/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import EE from 'events';
import { Minipass } from 'minipass';
declare const _autoClose: unique symbol;
declare const _close: unique symbol;
declare const _ended: unique symbol;
declare const _fd: unique symbol;
declare const _finished: unique symbol;
declare const _flags: unique symbol;
declare const _flush: unique symbol;
declare const _handleChunk: unique symbol;
declare const _makeBuf: unique symbol;
declare const _mode: unique symbol;
declare const _needDrain: unique symbol;
declare const _onerror: unique symbol;
declare const _onopen: unique symbol;
declare const _onread: unique symbol;
declare const _onwrite: unique symbol;
declare const _open: unique symbol;
declare const _path: unique symbol;
declare const _pos: unique symbol;
declare const _queue: unique symbol;
declare const _read: unique symbol;
declare const _readSize: unique symbol;
declare const _reading: unique symbol;
declare const _remain: unique symbol;
declare const _size: unique symbol;
declare const _write: unique symbol;
declare const _writing: unique symbol;
declare const _defaultFlag: unique symbol;
declare const _errored: unique symbol;
export type ReadStreamOptions = Minipass.Options<Minipass.ContiguousData> & {
    fd?: number;
    readSize?: number;
    size?: number;
    autoClose?: boolean;
};
export type ReadStreamEvents = Minipass.Events<Minipass.ContiguousData> & {
    open: [fd: number];
};
export declare class ReadStream extends Minipass<Minipass.ContiguousData, Buffer, ReadStreamEvents> {
    [_errored]: boolean;
    [_fd]?: number;
    [_path]: string;
    [_readSize]: number;
    [_reading]: boolean;
    [_size]: number;
    [_remain]: number;
    [_autoClose]: boolean;
    constructor(path: string, opt: ReadStreamOptions);
    get fd(): number | undefined;
    get path(): string;
    write(): void;
    end(): void;
    [_open](): void;
    [_onopen](er?: NodeJS.ErrnoException | null, fd?: number): void;
    [_makeBuf](): Buffer;
    [_read](): void;
    [_onread](er?: NodeJS.ErrnoException | null, br?: number, buf?: Buffer): void;
    [_close](): void;
    [_onerror](er: NodeJS.ErrnoException): void;
    [_handleChunk](br: number, buf: Buffer): boolean;
    emit<Event extends keyof ReadStreamEvents>(ev: Event, ...args: ReadStreamEvents[Event]): boolean;
}
export declare class ReadStreamSync extends ReadStream {
    [_open](): void;
    [_read](): void;
    [_close](): void;
}
export type WriteStreamOptions = {
    fd?: number;
    autoClose?: boolean;
    mode?: number;
    captureRejections?: boolean;
    start?: number;
    flags?: string;
};
export declare class WriteStream extends EE {
    readable: false;
    writable: boolean;
    [_errored]: boolean;
    [_writing]: boolean;
    [_ended]: boolean;
    [_queue]: Buffer[];
    [_needDrain]: boolean;
    [_path]: string;
    [_mode]: number;
    [_autoClose]: boolean;
    [_fd]?: number;
    [_defaultFlag]: boolean;
    [_flags]: string;
    [_finished]: boolean;
    [_pos]?: number;
    constructor(path: string, opt: WriteStreamOptions);
    emit(ev: string, ...args: any[]): boolean;
    get fd(): number | undefined;
    get path(): string;
    [_onerror](er: NodeJS.ErrnoException): void;
    [_open](): void;
    [_onopen](er?: null | NodeJS.ErrnoException, fd?: number): void;
    end(buf: string, enc?: BufferEncoding): this;
    end(buf?: Buffer, enc?: undefined): this;
    write(buf: string, enc?: BufferEncoding): boolean;
    write(buf: Buffer, enc?: undefined): boolean;
    [_write](buf: Buffer): void;
    [_onwrite](er?: null | NodeJS.ErrnoException, bw?: number): void;
    [_flush](): void;
    [_close](): void;
}
export declare class WriteStreamSync extends WriteStream {
    [_open](): void;
    [_close](): void;
    [_write](buf: Buffer): void;
}
export {};
//# sourceMappingURL=index.d.ts.map