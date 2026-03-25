/**
 * Signing JSON Web Signature (JWS) in Flattened JSON Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/**
 * The FlattenedSign class is used to build and sign Flattened JWS objects.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jws/flattened/sign'`.
 *
 */
export declare class FlattenedSign {
    #private;
    /**
     * {@link FlattenedSign} constructor
     *
     * @param payload Binary representation of the payload to sign.
     */
    constructor(payload: Uint8Array);
    /**
     * Sets the JWS Protected Header on the FlattenedSign object.
     *
     * @param protectedHeader JWS Protected Header.
     */
    setProtectedHeader(protectedHeader: types.JWSHeaderParameters): this;
    /**
     * Sets the JWS Unprotected Header on the FlattenedSign object.
     *
     * @param unprotectedHeader JWS Unprotected Header.
     */
    setUnprotectedHeader(unprotectedHeader: types.JWSHeaderParameters): this;
    /**
     * Signs and resolves the value of the Flattened JWS object.
     *
     * @param key Private Key or Secret to sign the JWS with. See
     *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
     * @param options JWS Sign options.
     */
    sign(key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.SignOptions): Promise<types.FlattenedJWS>;
}
