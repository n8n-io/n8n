/**
 * Signing JSON Web Signature (JWS) in Compact Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/**
 * The CompactSign class is used to build and sign Compact JWS strings.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jws/compact/sign'`.
 *
 */
export declare class CompactSign {
    #private;
    /**
     * {@link CompactSign} constructor
     *
     * @param payload Binary representation of the payload to sign.
     */
    constructor(payload: Uint8Array);
    /**
     * Sets the JWS Protected Header on the CompactSign object.
     *
     * @param protectedHeader JWS Protected Header.
     */
    setProtectedHeader(protectedHeader: types.CompactJWSHeaderParameters): this;
    /**
     * Signs and resolves the value of the Compact JWS string.
     *
     * @param key Private Key or Secret to sign the JWS with. See
     *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
     * @param options JWS Sign options.
     */
    sign(key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.SignOptions): Promise<string>;
}
