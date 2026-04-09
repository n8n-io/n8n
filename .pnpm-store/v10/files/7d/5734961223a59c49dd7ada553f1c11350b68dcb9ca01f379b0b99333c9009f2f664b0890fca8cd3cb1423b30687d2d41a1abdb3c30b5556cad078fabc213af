/// <reference path="../../types/readable-stream.d.ts" preserve="true" />
import type { Abortable } from 'node:events';
import type * as fs from 'node:fs';
import type { CreateReadStreamOptions, CreateWriteStreamOptions } from 'node:fs/promises';
import type { Callback } from '../utils.js';
import type { FileHandle } from './promises.js';
import { Readable, Writable } from 'readable-stream';
interface FSImplementation {
    open?: (...args: unknown[]) => unknown;
    close?: (...args: unknown[]) => unknown;
}
interface StreamOptions extends Abortable {
    flags?: string;
    encoding?: BufferEncoding;
    fd?: number | FileHandle;
    mode?: number;
    autoClose?: boolean;
    emitClose?: boolean;
    start?: number;
    highWaterMark?: number;
}
/**
 * This type is from node:fs but not exported.
 * @hidden
 */
export interface ReadStreamOptions extends StreamOptions {
    fs?: FSImplementation & {
        read: (...args: unknown[]) => unknown;
    };
    end?: number;
}
/**
 * This type is from node:fs but not exported.
 * @hidden
 */
export interface WriteStreamOptions extends StreamOptions {
    flush?: boolean;
    fs?: FSImplementation & {
        write: (...args: unknown[]) => unknown;
        writev?: (...args: unknown[]) => unknown;
    };
}
/**
 * A ReadStream implementation that wraps an underlying global ReadableStream.
 */
export declare class ReadStream extends Readable implements fs.ReadStream {
    pending: boolean;
    private _path;
    private _bytesRead;
    private reader?;
    constructor(opts: CreateReadStreamOptions | undefined, handleOrPromise: FileHandle | Promise<FileHandle>);
    _read(): Promise<void>;
    close(callback?: Callback<[void], null>): void;
    get path(): string;
    get bytesRead(): number;
    wrap(oldStream: NodeJS.ReadableStream): this;
}
/**
 * A WriteStream implementation that wraps an underlying global WritableStream.
 */
export declare class WriteStream extends Writable implements fs.WriteStream {
    pending: boolean;
    private _path;
    private _bytesWritten;
    private writer?;
    private ready;
    constructor(opts: CreateWriteStreamOptions | undefined, handleOrPromise: FileHandle | Promise<FileHandle>);
    _write(chunk: any, encoding: BufferEncoding | 'buffer', callback: (error?: Error | null) => void): Promise<void>;
    _final(callback: (error?: Error | null) => void): Promise<void>;
    close(callback?: Callback<[void], null>): void;
    get path(): string;
    get bytesWritten(): number;
}
export {};
