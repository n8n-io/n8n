import { type KDFInput } from './utils.ts';
export type ScryptOpts = {
    N: number;
    r: number;
    p: number;
    dkLen?: number;
    asyncTick?: number;
    maxmem?: number;
    onProgress?: (progress: number) => void;
};
/**
 * Scrypt KDF from RFC 7914.
 * @param password - pass
 * @param salt - salt
 * @param opts - parameters
 * - `N` is cpu/mem work factor (power of 2 e.g. 2**18)
 * - `r` is block size (8 is common), fine-tunes sequential memory read size and performance
 * - `p` is parallelization factor (1 is common)
 * - `dkLen` is output key length in bytes e.g. 32.
 * - `asyncTick` - (default: 10) max time in ms for which async function can block execution
 * - `maxmem` - (default: `1024 ** 3 + 1024` aka 1GB+1KB). A limit that the app could use for scrypt
 * - `onProgress` - callback function that would be executed for progress report
 * @returns Derived key
 * @example
 * scrypt('password', 'salt', { N: 2**18, r: 8, p: 1, dkLen: 32 });
 */
export declare function scrypt(password: KDFInput, salt: KDFInput, opts: ScryptOpts): Uint8Array;
/**
 * Scrypt KDF from RFC 7914. Async version.
 * @example
 * await scryptAsync('password', 'salt', { N: 2**18, r: 8, p: 1, dkLen: 32 });
 */
export declare function scryptAsync(password: KDFInput, salt: KDFInput, opts: ScryptOpts): Promise<Uint8Array>;
//# sourceMappingURL=scrypt.d.ts.map