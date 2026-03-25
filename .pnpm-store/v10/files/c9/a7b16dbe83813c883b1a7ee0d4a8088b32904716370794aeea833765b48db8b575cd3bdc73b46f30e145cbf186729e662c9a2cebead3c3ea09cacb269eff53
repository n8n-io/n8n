import type { EncryptOptions, CompactJWEHeaderParameters, JWEKeyManagementHeaderParameters, KeyLike } from '../types';
import { ProduceJWT } from './produce';
/**
 * The EncryptJWT class is used to build and encrypt Compact JWE formatted JSON Web Tokens.
 *
 */
export declare class EncryptJWT extends ProduceJWT {
    private _cek;
    private _iv;
    private _keyManagementParameters;
    private _protectedHeader;
    private _replicateIssuerAsHeader;
    private _replicateSubjectAsHeader;
    private _replicateAudienceAsHeader;
    /**
     * Sets the JWE Protected Header on the EncryptJWT object.
     *
     * @param protectedHeader JWE Protected Header. Must contain an "alg" (JWE Algorithm) and "enc"
     *   (JWE Encryption Algorithm) properties.
     */
    setProtectedHeader(protectedHeader: CompactJWEHeaderParameters): this;
    /**
     * Sets the JWE Key Management parameters to be used when encrypting. Use of this is method is
     * really only needed for ECDH based algorithms when utilizing the Agreement PartyUInfo or
     * Agreement PartyVInfo parameters. Other parameters will always be randomly generated when needed
     * and missing.
     *
     * @param parameters JWE Key Management parameters.
     */
    setKeyManagementParameters(parameters: JWEKeyManagementHeaderParameters): this;
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
    encrypt(key: KeyLike | Uint8Array, options?: EncryptOptions): Promise<string>;
}
