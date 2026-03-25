import { type KDFInput } from './utils.ts';
/**
 * Argon2 options.
 * * t: time cost, m: mem cost in kb, p: parallelization.
 * * key: optional key. personalization: arbitrary extra data.
 * * dkLen: desired number of output bytes.
 */
export type ArgonOpts = {
    t: number;
    m: number;
    p: number;
    version?: number;
    key?: KDFInput;
    personalization?: KDFInput;
    dkLen?: number;
    asyncTick?: number;
    maxmem?: number;
    onProgress?: (progress: number) => void;
};
/** argon2d GPU-resistant version. */
export declare const argon2d: (password: KDFInput, salt: KDFInput, opts: ArgonOpts) => Uint8Array;
/** argon2i side-channel-resistant version. */
export declare const argon2i: (password: KDFInput, salt: KDFInput, opts: ArgonOpts) => Uint8Array;
/** argon2id, combining i+d, the most popular version from RFC 9106 */
export declare const argon2id: (password: KDFInput, salt: KDFInput, opts: ArgonOpts) => Uint8Array;
/** argon2d async GPU-resistant version. */
export declare const argon2dAsync: (password: KDFInput, salt: KDFInput, opts: ArgonOpts) => Promise<Uint8Array>;
/** argon2i async side-channel-resistant version. */
export declare const argon2iAsync: (password: KDFInput, salt: KDFInput, opts: ArgonOpts) => Promise<Uint8Array>;
/** argon2id async, combining i+d, the most popular version from RFC 9106 */
export declare const argon2idAsync: (password: KDFInput, salt: KDFInput, opts: ArgonOpts) => Promise<Uint8Array>;
//# sourceMappingURL=argon2.d.ts.map