export declare function scrypt(password: string, salt: string): Uint8Array;
export declare function pbkdf2(password: string, salt: string): Uint8Array;
/**
 * Derives main seed. Takes a lot of time. Prefer `eskdf` method instead.
 */
export declare function deriveMainSeed(username: string, password: string): Uint8Array;
type AccountID = number | string;
type OptsLength = {
    keyLength: number;
};
type OptsMod = {
    modulus: bigint;
};
type KeyOpts = undefined | OptsLength | OptsMod;
export interface ESKDF {
    /**
     * Derives a child key. Child key will not be associated with any
     * other child key because of properties of underlying KDF.
     *
     * @param protocol - 3-15 character protocol name
     * @param accountId - numeric identifier of account
     * @param options - `keyLength: 64` or `modulus: 41920438n`
     * @example deriveChildKey('aes', 0)
     */
    deriveChildKey: (protocol: string, accountId: AccountID, options?: KeyOpts) => Uint8Array;
    /**
     * Deletes the main seed from eskdf instance
     */
    expire: () => void;
    /**
     * Account fingerprint
     */
    fingerprint: string;
}
/**
 * ESKDF
 * @param username - username, email, or identifier, min: 8 characters, should have enough entropy
 * @param password - password, min: 8 characters, should have enough entropy
 * @example
 * const kdf = await eskdf('example-university', 'beginning-new-example');
 * const key = kdf.deriveChildKey('aes', 0);
 * console.log(kdf.fingerprint);
 * kdf.expire();
 */
export declare function eskdf(username: string, password: string): Promise<ESKDF>;
export {};
//# sourceMappingURL=eskdf.d.ts.map