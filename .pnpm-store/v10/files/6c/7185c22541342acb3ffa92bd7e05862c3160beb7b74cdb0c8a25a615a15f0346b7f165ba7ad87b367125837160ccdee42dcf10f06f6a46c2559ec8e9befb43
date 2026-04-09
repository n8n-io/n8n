import type * as fs from 'node:fs';
export type FileContents = ArrayBufferView | string;
/**
 * @internal @hidden Used for the internal `_open` functions
 */
export interface OpenOptions {
    flag: fs.OpenMode;
    mode?: fs.Mode | null;
    /**
     * If true, do not resolve symlinks
     */
    preserveSymlinks?: boolean;
    /**
     * If true, allows opening directories
     */
    allowDirectory?: boolean;
}
export interface ReaddirOptions {
    withFileTypes?: boolean;
    recursive?: boolean;
}
/** Helper union @hidden */
export type GlobOptionsU = fs.GlobOptionsWithFileTypes | fs.GlobOptionsWithoutFileTypes | fs.GlobOptions;
/** Helper with union @hidden */
export type ReaddirOptsU<T> = (ReaddirOptions & (fs.ObjectEncodingOptions | T)) | NullEnc;
/** Helper with intersection @hidden */
export type ReaddirOptsI<T> = ReaddirOptions & fs.ObjectEncodingOptions & T;
/** @hidden */
export type NullEnc = BufferEncoding | null;
