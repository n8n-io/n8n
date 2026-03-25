/**
 * JSON Web Token (JWT) Encryption (JWT is in JWE format)
 *
 * @module
 */
import type * as types from '../types.d.ts';
/**
 * The EncryptJWT class is used to build and encrypt Compact JWE formatted JSON Web Tokens.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwt/encrypt'`.
 *
 */
export declare class EncryptJWT implements types.ProduceJWT {
    #private;
    /**
     * {@link EncryptJWT} constructor
     *
     * @param payload The JWT Claims Set object. Defaults to an empty object.
     */
    constructor(payload?: types.JWTPayload);
    setIssuer(issuer: string): this;
    setSubject(subject: string): this;
    setAudience(audience: string | string[]): this;
    setJti(jwtId: string): this;
    setNotBefore(input: number | string | Date): this;
    setExpirationTime(input: number | string | Date): this;
    setIssuedAt(input?: number | string | Date): this;
    /**
     * Sets the JWE Protected Header on the EncryptJWT object.
     *
     * @param protectedHeader JWE Protected Header. Must contain an "alg" (JWE Algorithm) and "enc"
     *   (JWE Encryption Algorithm) properties.
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
     * Replicates the "iss" (Issuer) Claim as a JWE Protected Header Parameter.
     *
     * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-5.3 RFC7519#section-5.3}
     */
    replicateIssuerAsHeader(): this;
    /**
     * Replicates the "sub" (Subject) Claim as a JWE Protected Header Parameter.
     *
     * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-5.3 RFC7519#section-5.3}
     */
    replicateSubjectAsHeader(): this;
    /**
     * Replicates the "aud" (Audience) Claim as a JWE Protected Header Parameter.
     *
     * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-5.3 RFC7519#section-5.3}
     */
    replicateAudienceAsHeader(): this;
    /**
     * Encrypts and returns the JWT.
     *
     * @param key Public Key or Secret to encrypt the JWT with. See
     *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
     * @param options JWE Encryption options.
     */
    encrypt(key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.EncryptOptions): Promise<string>;
}
