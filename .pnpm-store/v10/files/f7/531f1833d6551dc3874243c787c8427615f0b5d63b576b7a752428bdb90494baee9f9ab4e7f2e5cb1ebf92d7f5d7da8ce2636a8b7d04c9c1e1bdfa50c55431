import type * as fs from 'node:fs';
import type { ClassLike, OptionalTuple } from 'utilium';
import { ErrnoError } from './internal/error.js';
declare global {
    function atob(data: string): string;
    function btoa(data: string): string;
}
/**
 * Encodes a string into a buffer
 * @internal
 */
export declare function encodeRaw(input: string): Uint8Array;
/**
 * Decodes a string from a buffer
 * @internal
 */
export declare function decodeRaw(input?: Uint8Array): string;
/**
 * Encodes a string into a buffer
 * @internal
 */
export declare function encodeUTF8(input: string): Uint8Array;
export { /** @deprecated @hidden */ encodeUTF8 as encode };
/**
 * Decodes a string from a buffer
 * @internal
 */
export declare function decodeUTF8(input?: Uint8Array): string;
export { /** @deprecated @hidden */ decodeUTF8 as decode };
/**
 * Decodes a directory listing
 * @hidden
 */
export declare function decodeDirListing(data: Uint8Array): Record<string, number>;
/**
 * Encodes a directory listing
 * @hidden
 */
export declare function encodeDirListing(data: Record<string, number>): Uint8Array;
export type Callback<Args extends unknown[] = [], NoError = undefined | void> = (e: ErrnoError | NoError, ...args: OptionalTuple<Args>) => unknown;
/**
 * Normalizes a mode
 * @param def default
 * @internal
 */
export declare function normalizeMode(mode: unknown, def?: number): number;
/**
 * Normalizes a time
 * @internal
 */
export declare function normalizeTime(time: string | number | Date): number;
/**
 * Normalizes a path
 * @internal
 */
export declare function normalizePath(p: fs.PathLike, noResolve?: boolean): string;
/**
 * Normalizes options
 * @param options options to normalize
 * @param encoding default encoding
 * @param flag default flag
 * @param mode default mode
 * @internal
 */
export declare function normalizeOptions(options: fs.WriteFileOptions | (fs.EncodingOption & {
    flag?: fs.OpenMode;
}) | undefined, encoding: (BufferEncoding | null) | undefined, flag: string, mode?: number): {
    encoding?: BufferEncoding | null;
    flag: string;
    mode: number;
};
export type Concrete<T extends ClassLike> = Pick<T, keyof T> & (new (...args: any[]) => InstanceType<T>);
/**
 * Generate a random ino
 * @internal @deprecated @hidden
 */
export declare function randomBigInt(): bigint;
/**
 * Prevents infinite loops
 * @internal
 * @deprecated Use `canary` from Utilium
 */
export declare function canary(path?: string, syscall?: string): () => void;
