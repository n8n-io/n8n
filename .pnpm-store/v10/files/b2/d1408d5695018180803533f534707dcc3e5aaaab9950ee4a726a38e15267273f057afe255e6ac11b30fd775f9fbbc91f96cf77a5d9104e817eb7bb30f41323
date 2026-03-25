import type { KeyLike, JWEKeyManagementHeaderParameters, CompactJWEHeaderParameters, EncryptOptions } from '../../types';
/**
 * The CompactEncrypt class is used to build and encrypt Compact JWE strings.
 *
 */
export declare class CompactEncrypt {
    private _flattened;
    /** @param plaintext Binary representation of the plaintext to encrypt. */
    constructor(plaintext: Uint8Array);
    /**
     * Sets a content encryption key to use, by default a random suitable one is generated for the JWE
     * enc" (Encryption Algorithm) Header Parameter.
     *
     * @deprecated You should not use this method. It is only really intended for test and vector
     *   validation purposes.
     *
     * @param cek JWE Content Encryption Key.
     */
    setContentEncryptionKey(cek: Uint8Array): this;
    /**
     * Sets the JWE Initialization Vector to use for content encryption, by default a random suitable
     * one is generated for the JWE enc" (Encryption Algorithm) Header Parameter.
     *
     * @deprecated You should not use this method. It is only really intended for test and vector
     *   validation purposes.
     *
     * @param iv JWE Initialization Vector.
     */
    setInitializationVector(iv: Uint8Array): this;
    /**
     * Sets the JWE Protected Header on the CompactEncrypt object.
     *
     * @param protectedHeader JWE Protected Header object.
     */
    setProtectedHeader(protectedHeader: CompactJWEHeaderParameters): this;
    /**
     * Sets the JWE Key Management parameters to be used when encrypting the Content Encryption Key.
     * You do not need to invoke this method, it is only really intended for test and vector
     * validation purposes.
     *
     * @param parameters JWE Key Management parameters.
     */
    setKeyManagementParameters(parameters: JWEKeyManagementHeaderParameters): this;
    /**
     * Encrypts and resolves the value of the Compact JWE string.
     *
     * @param key Public Key or Secret to encrypt the JWE with. See
     *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
     * @param options JWE Encryption options.
     */
    encrypt(key: KeyLike | Uint8Array, options?: EncryptOptions): Promise<string>;
}
