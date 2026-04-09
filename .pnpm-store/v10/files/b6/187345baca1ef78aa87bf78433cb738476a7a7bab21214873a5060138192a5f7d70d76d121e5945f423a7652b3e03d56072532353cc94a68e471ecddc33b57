import type { ExtractProperties } from 'utilium';
import type { Inode, InodeLike } from '../..//internal/inode.js';
import type { MountConfiguration } from '../../config.js';
import type { File } from '../../internal/file.js';
import type { CreationOptions, UsageInfo } from '../../internal/filesystem.js';
import type { Backend, FilesystemOf } from '../backend.js';
import { FileSystem } from '../../internal/filesystem.js';
import { Stats } from '../../stats.js';
import * as RPC from './rpc.js';
type FSMethods = ExtractProperties<FileSystem, (...args: any[]) => Promise<any> | UsageInfo>;
type FSMethod = keyof FSMethods;
export type FSRequest<TMethod extends FSMethod = FSMethod> = RPC.Message & {
    [M in TMethod]: {
        method: M;
        args: Parameters<FSMethods[M]>;
    };
}[TMethod];
declare const PortFS_base: import("../../index.js").Mixin<typeof FileSystem, import("../../mixins/async.js").AsyncMixin>;
/**
 * PortFS lets you access an FS instance that is running in a port, or the other way around.
 *
 * Note that *direct* synchronous operations are not permitted on the PortFS,
 * regardless of the configuration option of the remote FS.
 */
export declare class PortFS extends PortFS_base {
    readonly options: RPC.Options;
    readonly port: RPC.Port;
    /**`
     * @hidden
     */
    _sync: import("../index.js").StoreFS<import("../memory.js").InMemoryStore>;
    /**
     * Constructs a new PortFS instance that connects with the FS running on `options.port`.
     */
    constructor(options: RPC.Options);
    protected rpc<const T extends FSMethod>(method: T, ...args: Parameters<FSMethods[T]>): Promise<Awaited<ReturnType<FSMethods[T]>>>;
    ready(): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    stat(path: string): Promise<Stats>;
    sync(path: string, data: Uint8Array | undefined, stats: Readonly<InodeLike | Inode>): Promise<void>;
    openFile(path: string, flag: string): Promise<File>;
    createFile(path: string, flag: string, mode: number, options: CreationOptions): Promise<File>;
    unlink(path: string): Promise<void>;
    rmdir(path: string): Promise<void>;
    mkdir(path: string, mode: number, options: CreationOptions): Promise<void>;
    readdir(path: string): Promise<string[]>;
    exists(path: string): Promise<boolean>;
    link(srcpath: string, dstpath: string): Promise<void>;
    read(path: string, buffer: Uint8Array, offset: number, length: number): Promise<void>;
    write(path: string, buffer: Uint8Array, offset: number): Promise<void>;
}
/** @internal */
export declare function handleRequest(port: RPC.Port, fs: FileSystem & {
    _descriptors?: Map<number, File>;
}, request: FSRequest): Promise<void>;
export declare function attachFS(port: RPC.Port, fs: FileSystem): void;
export declare function detachFS(port: RPC.Port, fs: FileSystem): void;
declare const _Port: {
    name: string;
    options: {
        port: {
            type: "object";
            required: true;
            validator(port: RPC.Port): void;
        };
        timeout: {
            type: "number";
            required: false;
        };
    };
    create(options: RPC.Options): PortFS;
};
type _Port = typeof _Port;
export interface Port extends _Port {
}
/**
 * @category Backends and Configuration
 */
export declare const Port: Port;
/**
 * @category Backends and Configuration
 */
export declare function resolveRemoteMount<T extends Backend>(port: RPC.Port, config: MountConfiguration<T>, _depth?: number): Promise<FilesystemOf<T>>;
export {};
