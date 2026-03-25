/**
 * @module
 * Crypto utility.
 */
import type { JSONValue } from './types';
type Algorithm = {
    name: string;
    alias: string;
};
type Data = string | boolean | number | JSONValue | ArrayBufferView | ArrayBuffer;
export declare const sha256: (data: Data) => Promise<string | null>;
export declare const sha1: (data: Data) => Promise<string | null>;
export declare const md5: (data: Data) => Promise<string | null>;
export declare const createHash: (data: Data, algorithm: Algorithm) => Promise<string | null>;
export {};
