import type { TransferListItem } from 'node:worker_threads';
import type { WithOptional } from 'utilium';
import type { ErrnoErrorJSON } from '../../internal/error.js';
import type { Backend, FilesystemOf } from '../backend.js';
import type { PortFS } from './fs.js';
import { type StatsLike } from '../../stats.js';
type _MessageEvent<T = any> = T | {
    data: T;
};
/** @internal */
export interface Port {
    postMessage(value: unknown, transfer?: TransferListItem[]): void;
    on?(event: 'message' | 'online', listener: (value: unknown) => void): this;
    off?(event: 'message', listener: (value: unknown) => void): this;
    addEventListener?(type: 'message', listener: (ev: _MessageEvent) => void): void;
    removeEventListener?(type: 'message', listener: (ev: _MessageEvent) => void): void;
}
export interface Options {
    /**
     * The target port that you want to connect to, or the current port if in a port context.
     */
    port: Port;
    /**
     * How long to wait for a request to complete
     */
    timeout?: number;
}
/**
 * An RPC message
 */
export interface Message {
    _zenfs: true;
    id: string;
    method: string;
    stack: string;
}
export interface Request extends Message {
    args: unknown[];
}
interface _ResponseWithError extends Message {
    error: true;
    value: WithOptional<ErrnoErrorJSON, 'code' | 'errno'>;
}
interface _ResponseWithValue<T> extends Message {
    error: false;
    value: Awaited<T> extends File ? FileData : Awaited<T>;
}
interface _ResponseRead extends Message {
    error: false;
    method: 'read';
    value: Uint8Array;
}
export type Response<T = unknown> = _ResponseWithError | _ResponseWithValue<T> | _ResponseRead;
export interface FileData {
    path: string;
    flag: string;
    stats: StatsLike<number>;
}
export type { FileData as File };
export declare function isMessage(arg: unknown): arg is Message;
type _Executor = Parameters<ConstructorParameters<typeof Promise<any>>[0]>;
export interface Executor {
    resolve: _Executor[0];
    reject: _Executor[1];
    fs?: PortFS;
}
export declare function request<const TRequest extends Request, TValue>(request: Omit<TRequest, 'id' | 'stack' | '_zenfs'>, { port, timeout, fs }?: Partial<Options> & {
    fs?: PortFS;
}): Promise<TValue>;
export declare function handleResponse<const TResponse extends Response>(response: TResponse): void;
export declare function attach<T extends Message>(port: Port, handler: (message: T) => unknown): void;
export declare function detach<T extends Message>(port: Port, handler: (message: T) => unknown): void;
export declare function catchMessages<T extends Backend>(port: Port): (fs: FilesystemOf<T>) => Promise<void>;
/**
 * @internal
 */
export declare function waitOnline(port: Port): Promise<void>;
