import { type CHash, type KDFInput } from './utils.ts';
export type Pbkdf2Opt = {
    c: number;
    dkLen?: number;
    asyncTick?: number;
};
/**
 * PBKDF2-HMAC: RFC 2898 key derivation function
 * @param hash - hash function that would be used e.g. sha256
 * @param password - password from which a derived key is generated
 * @param salt - cryptographic salt
 * @param opts - {c, dkLen} where c is work factor and dkLen is output message size
 * @example
 * const key = pbkdf2(sha256, 'password', 'salt', { dkLen: 32, c: Math.pow(2, 18) });
 */
export declare function pbkdf2(hash: CHash, password: KDFInput, salt: KDFInput, opts: Pbkdf2Opt): Uint8Array;
/**
 * PBKDF2-HMAC: RFC 2898 key derivation function. Async version.
 * @example
 * await pbkdf2Async(sha256, 'password', 'salt', { dkLen: 32, c: 500_000 });
 */
export declare function pbkdf2Async(hash: CHash, password: KDFInput, salt: KDFInput, opts: Pbkdf2Opt): Promise<Uint8Array>;
//# sourceMappingURL=pbkdf2.d.ts.map