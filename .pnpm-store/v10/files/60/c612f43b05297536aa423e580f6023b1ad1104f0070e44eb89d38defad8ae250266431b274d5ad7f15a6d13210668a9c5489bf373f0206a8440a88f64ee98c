/**
 * Encrypting JSON Web Encryption (JWE) in Compact Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/**
 * The CompactEncrypt class is used to build and encrypt Compact JWE strings.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwe/compact/encrypt'`.
 *
 */
export declare class CompactEncrypt {
    #private;
    /**
     * {@link CompactEncrypt} constructor
     *
     * @param plaintext Binary representation of the plaintext to encrypt.
     */
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
    setProtectedHeader(protectedHeader: types.CompactJWEHeaderParameters): this;
    /**
     * Sets the JWE Key Management parameters to be used when encrypting.
     *
     * (ECDH-ES) Use of this method is needed for ECDH based algorithms to set the "apu" (Agreement
     * PartyUInfo) or "apv" (Agreement PartyVInfo) parameters.
     *
     * @param parameters JWE Key Management parameters.
     */
    setKeyManagementParameters(parameters: types.JWEKeyManagementHeaderParameters): this;
    /**
     * Encrypts and resolves the value of the Compact JWE string.
     *
     * @param key Public Key or Secret to encrypt the JWE with. See
     *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
     * @param options JWE Encryption options.
     */
    encrypt(key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.EncryptOptions): Promise<string>;
}
