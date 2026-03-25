/**
 * Encrypting JSON Web Encryption (JWE) in General JSON Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/** Used to build General JWE object's individual recipients. */
export interface Recipient {
    /**
     * Sets the JWE Per-Recipient Unprotected Header on the Recipient object.
     *
     * @param unprotectedHeader JWE Per-Recipient Unprotected Header.
     */
    setUnprotectedHeader(unprotectedHeader: types.JWEHeaderParameters): Recipient;
    /** A shorthand for calling addRecipient() on the enclosing {@link GeneralEncrypt} instance */
    addRecipient(...args: Parameters<GeneralEncrypt['addRecipient']>): Recipient;
    /** A shorthand for calling encrypt() on the enclosing {@link GeneralEncrypt} instance */
    encrypt(...args: Parameters<GeneralEncrypt['encrypt']>): Promise<types.GeneralJWE>;
    /** Returns the enclosing {@link GeneralEncrypt} instance */
    done(): GeneralEncrypt;
}
/**
 * The GeneralEncrypt class is used to build and encrypt General JWE objects.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwe/general/encrypt'`.
 *
 */
export declare class GeneralEncrypt {
    #private;
    /**
     * {@link GeneralEncrypt} constructor
     *
     * @param plaintext Binary representation of the plaintext to encrypt.
     */
    constructor(plaintext: Uint8Array);
    /**
     * Adds an additional recipient for the General JWE object.
     *
     * @param key Public Key or Secret to encrypt the Content Encryption Key for the recipient with.
     *   See {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
     * @param options JWE Encryption options.
     */
    addRecipient(key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.CritOption): Recipient;
    /**
     * Sets the JWE Protected Header on the GeneralEncrypt object.
     *
     * @param protectedHeader JWE Protected Header object.
     */
    setProtectedHeader(protectedHeader: types.JWEHeaderParameters): this;
    /**
     * Sets the JWE Shared Unprotected Header on the GeneralEncrypt object.
     *
     * @param sharedUnprotectedHeader JWE Shared Unprotected Header object.
     */
    setSharedUnprotectedHeader(sharedUnprotectedHeader: types.JWEHeaderParameters): this;
    /**
     * Sets the Additional Authenticated Data on the GeneralEncrypt object.
     *
     * @param aad Additional Authenticated Data.
     */
    setAdditionalAuthenticatedData(aad: Uint8Array): this;
    /** Encrypts and resolves the value of the General JWE object. */
    encrypt(): Promise<types.GeneralJWE>;
}
