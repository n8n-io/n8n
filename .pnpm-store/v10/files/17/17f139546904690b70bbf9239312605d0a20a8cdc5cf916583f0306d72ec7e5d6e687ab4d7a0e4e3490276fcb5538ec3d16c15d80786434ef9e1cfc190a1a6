/**
 * @packageDocumentation
 */

/** @public */
export declare class Asyncify {
    private value;
    private exports;
    private dataPtr;
    init<T extends WebAssembly.Exports, U extends Array<Exclude<keyof T, AsyncifyExportName>>>(memory: WebAssembly.Memory, instance: {
        readonly exports: T;
    }, options: AsyncifyOptions): {
        readonly exports: AsyncifyExports<T, U>;
    };
    private assertState;
    wrapImportFunction<T extends Function>(f: T): T;
    wrapImports<T extends WebAssembly.Imports>(imports: T): T;
    wrapExportFunction<T extends Function>(f: T): AsyncifyExportFunction<T>;
    wrapExports<T extends WebAssembly.Exports>(exports: T): AsyncifyExports<T, void>;
    wrapExports<T extends WebAssembly.Exports, U extends Array<Exclude<keyof T, AsyncifyExportName>>>(exports: T, needWrap: U): AsyncifyExports<T, U>;
}

/** @public */
export declare type AsyncifyExportFunction<T> = T extends Callable ? (...args: Parameters<T>) => Promise<ReturnType<T>> : T;

/** @public */
export declare type AsyncifyExportName = 'asyncify_get_state' | 'asyncify_start_unwind' | 'asyncify_stop_unwind' | 'asyncify_start_rewind' | 'asyncify_stop_rewind';

/** @public */
export declare type AsyncifyExports<T, U> = T extends Record<string, any> ? {
    [P in keyof T]: T[P] extends Callable ? U extends Array<Exclude<keyof T, AsyncifyExportName>> ? P extends U[number] ? AsyncifyExportFunction<T[P]> : T[P] : AsyncifyExportFunction<T[P]> : T[P];
} : T;

/** @public */
export declare function asyncifyLoad(asyncify: AsyncifyOptions, urlOrBuffer: string | URL | BufferSource | WebAssembly.Module, imports?: WebAssembly.Imports): Promise<WebAssembly.WebAssemblyInstantiatedSource>;

/** @public */
export declare function asyncifyLoadSync(asyncify: AsyncifyOptions, buffer: BufferSource | WebAssembly.Module, imports?: WebAssembly.Imports): WebAssembly.WebAssemblyInstantiatedSource;

/** @public */
export declare interface AsyncifyOptions {
    wasm64?: boolean;
    tryAllocate?: boolean | {
        size?: number;
        name?: string;
    };
    wrapExports?: string[];
}

/** @public */
export declare interface AsyncWASIOptions extends WASIOptions {
    fs: {
        promises: IFsPromises;
    };
    asyncify?: Asyncify;
}

/** @public */
export declare interface BaseEncodingOptions {
    encoding?: BufferEncoding_2;
}

/** @public */
export declare interface BigIntStats extends StatsBase<bigint> {
}

/** @public */
declare type BufferEncoding_2 = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';
export { BufferEncoding_2 as BufferEncoding }

/** @public */
export declare type BufferEncodingOption = 'buffer' | {
    encoding: 'buffer';
};

/** @public */
export declare type Callable = (...args: any[]) => any;

/** @public */
export declare function createAsyncWASI(options?: AsyncWASIOptions): Promise<WASI>;

/** @public */
export declare function extendMemory(memory: WebAssembly.Memory): Memory;

/** @public */
export declare interface FileHandle {
    readonly fd: number;
    datasync(): Promise<void>;
    sync(): Promise<void>;
    read<TBuffer extends Uint8Array>(buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<{
        bytesRead: number;
        buffer: TBuffer;
    }>;
    stat(opts?: StatOptions & {
        bigint?: false;
    }): Promise<Stats>;
    stat(opts: StatOptions & {
        bigint: true;
    }): Promise<BigIntStats>;
    stat(opts?: StatOptions): Promise<Stats | BigIntStats>;
    truncate(len?: number): Promise<void>;
    utimes(atime: string | number | Date, mtime: string | number | Date): Promise<void>;
    write<TBuffer extends Uint8Array>(buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<{
        bytesWritten: number;
        buffer: TBuffer;
    }>;
    write(data: string | Uint8Array, position?: number, encoding?: BufferEncoding_2): Promise<{
        bytesWritten: number;
        buffer: string;
    }>;
    close(): Promise<void>;
}

/** @public */
export declare interface FinalizeBindingsOptions {
    memory?: WebAssembly.Memory;
}

/** @public */
export declare interface IDirent {
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    name: string;
}

/** @public */
export declare interface IFs {
    fstatSync(fd: number, options?: StatOptions & {
        bigint?: false;
    }): Stats;
    fstatSync(fd: number, options: StatOptions & {
        bigint: true;
    }): BigIntStats;
    fstatSync(fd: number, options?: StatOptions): Stats | BigIntStats;
    statSync(path: PathLike, options?: StatOptions & {
        bigint?: false;
    }): Stats;
    statSync(path: PathLike, options: StatOptions & {
        bigint: true;
    }): BigIntStats;
    statSync(path: PathLike, options?: StatOptions): Stats | BigIntStats;
    lstatSync(path: PathLike, options?: StatOptions & {
        bigint?: false;
    }): Stats;
    lstatSync(path: PathLike, options: StatOptions & {
        bigint: true;
    }): BigIntStats;
    lstatSync(path: PathLike, options?: StatOptions): Stats | BigIntStats;
    utimesSync(path: PathLike, atime: string | number | Date, mtime: string | number | Date): void;
    openSync(path: PathLike, flags: OpenMode, mode?: Mode): number;
    readSync(fd: number, buffer: ArrayBufferView, offset: number, length: number, position: number | null): number;
    readSync(fd: number, buffer: ArrayBufferView, opts?: ReadSyncOptions): number;
    writeSync(fd: number, buffer: ArrayBufferView, offset?: number, length?: number, position?: number): number;
    writeSync(fd: number, string: string, position?: number, encoding?: BufferEncoding_2): number;
    closeSync(fd: number): void;
    readlinkSync(path: PathLike, options?: BaseEncodingOptions | BufferEncoding_2): string;
    readlinkSync(path: PathLike, options: BufferEncodingOption): Uint8Array;
    readlinkSync(path: PathLike, options?: BaseEncodingOptions | string): string | Uint8Array;
    realpathSync(path: PathLike, options?: BaseEncodingOptions | BufferEncoding_2): string;
    realpathSync(path: PathLike, options: BufferEncodingOption): Uint8Array;
    realpathSync(path: PathLike, options?: BaseEncodingOptions | string): string | Uint8Array;
    truncateSync(path: PathLike, len?: number): void;
    ftruncateSync(fd: number, len?: number): void;
    fdatasyncSync(fd: number): void;
    futimesSync(fd: number, atime: string | number | Date, mtime: string | number | Date): void;
    readdirSync(path: PathLike, options?: {
        encoding: BufferEncoding_2 | null;
        withFileTypes?: false;
    } | BufferEncoding_2): string[];
    readdirSync(path: PathLike, options: {
        encoding: 'buffer';
        withFileTypes?: false;
    } | 'buffer'): Uint8Array[];
    readdirSync(path: PathLike, options?: BaseEncodingOptions & {
        withFileTypes?: false;
    } | BufferEncoding_2): string[] | Uint8Array[];
    readdirSync(path: PathLike, options: BaseEncodingOptions & {
        withFileTypes: true;
    }): IDirent[];
    fsyncSync(fd: number): void;
    mkdirSync(path: PathLike, options: MakeDirectoryOptions & {
        recursive: true;
    }): string | undefined;
    mkdirSync(path: PathLike, options?: Mode | (MakeDirectoryOptions & {
        recursive?: false;
    })): void;
    mkdirSync(path: PathLike, options?: Mode | MakeDirectoryOptions): string | undefined;
    rmdirSync(path: PathLike, options?: RmDirOptions): void;
    linkSync(existingPath: PathLike, newPath: PathLike): void;
    unlinkSync(path: PathLike): void;
    renameSync(oldPath: PathLike, newPath: PathLike): void;
    symlinkSync(target: PathLike, path: PathLike, type?: 'dir' | 'file' | 'junction'): void;
}

/** @public */
export declare interface IFsPromises {
    stat(path: PathLike, options?: StatOptions & {
        bigint?: false;
    }): Promise<Stats>;
    stat(path: PathLike, options: StatOptions & {
        bigint: true;
    }): Promise<BigIntStats>;
    stat(path: PathLike, options?: StatOptions): Promise<Stats | BigIntStats>;
    lstat(path: PathLike, options?: StatOptions & {
        bigint?: false;
    }): Promise<Stats>;
    lstat(path: PathLike, options: StatOptions & {
        bigint: true;
    }): Promise<BigIntStats>;
    lstat(path: PathLike, options?: StatOptions): Promise<Stats | BigIntStats>;
    utimes(path: PathLike, atime: string | number | Date, mtime: string | number | Date): Promise<void>;
    open(path: PathLike, flags: OpenMode, mode?: Mode): Promise<FileHandle>;
    read<TBuffer extends Uint8Array>(handle: FileHandle, buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<{
        bytesRead: number;
        buffer: TBuffer;
    }>;
    write<TBuffer extends Uint8Array>(handle: FileHandle, buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<{
        bytesWritten: number;
        buffer: TBuffer;
    }>;
    readlink(path: PathLike, options?: BaseEncodingOptions | BufferEncoding_2): Promise<string>;
    readlink(path: PathLike, options: BufferEncodingOption): Promise<Uint8Array>;
    readlink(path: PathLike, options?: BaseEncodingOptions | string): Promise<string | Uint8Array>;
    realpath(path: PathLike, options?: BaseEncodingOptions | BufferEncoding_2): Promise<string>;
    realpath(path: PathLike, options: BufferEncodingOption): Promise<Uint8Array>;
    realpath(path: PathLike, options?: BaseEncodingOptions | string): Promise<string | Uint8Array>;
    truncate(path: PathLike, len?: number): Promise<void>;
    ftruncate(handle: FileHandle, len?: number): Promise<void>;
    fdatasync(handle: FileHandle): Promise<void>;
    futimes(handle: FileHandle, atime: string | number | Date, mtime: string | number | Date): Promise<void>;
    readdir(path: PathLike, options?: {
        encoding: BufferEncoding_2 | null;
        withFileTypes?: false;
    } | BufferEncoding_2): Promise<string[]>;
    readdir(path: PathLike, options: {
        encoding: 'buffer';
        withFileTypes?: false;
    } | 'buffer'): Promise<Uint8Array[]>;
    readdir(path: PathLike, options?: BaseEncodingOptions & {
        withFileTypes?: false;
    } | BufferEncoding_2): Promise<string[] | Uint8Array[]>;
    readdir(path: PathLike, options: BaseEncodingOptions & {
        withFileTypes: true;
    }): Promise<IDirent[]>;
    fsync(handle: FileHandle): Promise<void>;
    mkdir(path: PathLike, options: MakeDirectoryOptions & {
        recursive: true;
    }): Promise<string | undefined>;
    mkdir(path: PathLike, options?: Mode | (MakeDirectoryOptions & {
        recursive?: false;
    })): Promise<void>;
    mkdir(path: PathLike, options?: Mode | MakeDirectoryOptions): Promise<string | undefined>;
    rmdir(path: PathLike, options?: RmDirOptions): Promise<void>;
    link(existingPath: PathLike, newPath: PathLike): Promise<void>;
    unlink(path: PathLike): Promise<void>;
    rename(oldPath: PathLike, newPath: PathLike): Promise<void>;
    symlink(target: PathLike, path: PathLike, type?: 'dir' | 'file' | 'junction'): Promise<void>;
}

declare const kBindingName: unique symbol;

declare const kExitCode: unique symbol;

declare const kInstance: unique symbol;

declare const kSetMemory: unique symbol;

declare const kStarted: unique symbol;

/** @public */
export declare function load(wasmInput: string | URL | BufferSource | WebAssembly.Module, imports?: WebAssembly.Imports): Promise<WebAssembly.WebAssemblyInstantiatedSource>;

/** @public */
export declare function loadSync(wasmInput: BufferSource | WebAssembly.Module, imports?: WebAssembly.Imports): WebAssembly.WebAssemblyInstantiatedSource;

/** @public */
export declare interface MakeDirectoryOptions {
    recursive?: boolean;
    mode?: Mode;
}

/** @public */
export declare class Memory extends WebAssemblyMemory {
    constructor(descriptor: WebAssembly.MemoryDescriptor);
    get HEAP8(): Int8Array;
    get HEAPU8(): Uint8Array;
    get HEAP16(): Int16Array;
    get HEAPU16(): Uint16Array;
    get HEAP32(): Int32Array;
    get HEAPU32(): Uint32Array;
    get HEAP64(): BigInt64Array;
    get HEAPU64(): BigUint64Array;
    get HEAPF32(): Float32Array;
    get HEAPF64(): Float64Array;
    get view(): DataView;
}

/** @public */
export declare type Mode = number | string;

/** @public */
export declare type OpenMode = number | string;

/** @public */
export declare type PathLike = string | Uint8Array | URL;

/** @public */
export declare type PromisifyExports<T, U> = T extends Record<string, any> ? {
    [P in keyof T]: T[P] extends Callable ? U extends Array<keyof T> ? P extends U[number] ? AsyncifyExportFunction<T[P]> : T[P] : AsyncifyExportFunction<T[P]> : T[P];
} : T;

/** @public */
export declare interface ReadSyncOptions {
    offset?: number;
    length?: number;
    position?: number;
}

/** @public */
export declare interface RmDirOptions {
    maxRetries?: number;
    recursive?: boolean;
    retryDelay?: number;
}

/** @public */
export declare interface StatOptions {
    bigint?: boolean;
}

/** @public */
export declare interface Stats extends StatsBase<number> {
}

/** @public */
export declare interface StatsBase<T> {
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    dev: T;
    ino: T;
    mode: T;
    nlink: T;
    uid: T;
    gid: T;
    rdev: T;
    size: T;
    blksize: T;
    blocks: T;
    atimeMs: T;
    mtimeMs: T;
    ctimeMs: T;
    birthtimeMs: T;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
}

/** @public */
export declare interface SyncWASIOptions extends WASIOptions {
    fs?: IFs;
}

/** @public */
export declare class WASI {
    private [kSetMemory];
    private [kStarted];
    private [kExitCode];
    private [kInstance];
    private [kBindingName];
    readonly wasiImport: Record<string, any>;
    constructor(options?: SyncWASIOptions);
    finalizeBindings(instance: WebAssembly.Instance, { memory }?: FinalizeBindingsOptions): void;
    start(instance: WebAssembly.Instance): number | undefined | Promise<number> | Promise<undefined>;
    initialize(instance: WebAssembly.Instance): void | Promise<void>;
    getImportObject(): Record<string, Record<string, any>>;
}

/** @public */
export declare interface WASIOptions {
    version?: 'unstable' | 'preview1';
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
    preopens?: Record<string, string> | undefined;
    /**
     * @defaultValue `false`
     */
    returnOnExit?: boolean | undefined;
    print?: (str: string) => void;
    printErr?: (str: string) => void;
}

/** @public */
export declare const WebAssemblyMemory: {
    new (descriptor: WebAssembly.MemoryDescriptor): WebAssembly.Memory;
    prototype: WebAssembly.Memory;
};

/** @public */
export declare function wrapAsyncExport<T extends Function = any>(f: Function): T;

/** @public */
export declare function wrapAsyncImport<T extends (...args: any[]) => any>(f: T, parameterType: WebAssembly.ValueType[], returnType: WebAssembly.ValueType[]): (...args: [object, ...Parameters<T>]) => ReturnType<T>;

/** @public */
export declare function wrapExports<T extends WebAssembly.Exports>(exports: T): PromisifyExports<T, void>;

/** @public */
export declare function wrapExports<T extends WebAssembly.Exports, U extends Array<keyof T>>(exports: T, needWrap: U): PromisifyExports<T, U>;

export { }

export as namespace wasmUtil;
