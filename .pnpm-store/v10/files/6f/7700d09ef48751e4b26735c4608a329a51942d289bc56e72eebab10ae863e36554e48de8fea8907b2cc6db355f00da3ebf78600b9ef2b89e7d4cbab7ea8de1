/**
 * Signing JSON Web Signature (JWS) in General JSON Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/** Used to build General JWS object's individual signatures. */
export interface Signature {
    /**
     * Sets the JWS Protected Header on the Signature object.
     *
     * @param protectedHeader JWS Protected Header.
     */
    setProtectedHeader(protectedHeader: types.JWSHeaderParameters): Signature;
    /**
     * Sets the JWS Unprotected Header on the Signature object.
     *
     * @param unprotectedHeader JWS Unprotected Header.
     */
    setUnprotectedHeader(unprotectedHeader: types.JWSHeaderParameters): Signature;
    /** A shorthand for calling addSignature() on the enclosing {@link GeneralSign} instance */
    addSignature(...args: Parameters<GeneralSign['addSignature']>): Signature;
    /** A shorthand for calling encrypt() on the enclosing {@link GeneralSign} instance */
    sign(...args: Parameters<GeneralSign['sign']>): Promise<types.GeneralJWS>;
    /** Returns the enclosing {@link GeneralSign} instance */
    done(): GeneralSign;
}
/**
 * The GeneralSign class is used to build and sign General JWS objects.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jws/general/sign'`.
 *
 */
export declare class GeneralSign {
    #private;
    /**
     * {@link GeneralSign} constructor
     *
     * @param payload Binary representation of the payload to sign.
     */
    constructor(payload: Uint8Array);
    /**
     * Adds an additional signature for the General JWS object.
     *
     * @param key Private Key or Secret to sign the individual JWS signature with. See
     *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
     * @param options JWS Sign options.
     */
    addSignature(key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.SignOptions): Signature;
    /** Signs and resolves the value of the General JWS object. */
    sign(): Promise<types.GeneralJWS>;
}
