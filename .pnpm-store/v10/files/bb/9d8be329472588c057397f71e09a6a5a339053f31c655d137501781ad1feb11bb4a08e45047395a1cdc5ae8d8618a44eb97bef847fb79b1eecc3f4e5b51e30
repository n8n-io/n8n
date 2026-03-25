import type { KeyLike, FlattenedJWS, JWSHeaderParameters, SignOptions } from '../../types';
/**
 * The FlattenedSign class is used to build and sign Flattened JWS objects.
 *
 */
export declare class FlattenedSign {
    private _payload;
    private _protectedHeader;
    private _unprotectedHeader;
    /** @param payload Binary representation of the payload to sign. */
    constructor(payload: Uint8Array);
    /**
     * Sets the JWS Protected Header on the FlattenedSign object.
     *
     * @param protectedHeader JWS Protected Header.
     */
    setProtectedHeader(protectedHeader: JWSHeaderParameters): this;
    /**
     * Sets the JWS Unprotected Header on the FlattenedSign object.
     *
     * @param unprotectedHeader JWS Unprotected Header.
     */
    setUnprotectedHeader(unprotectedHeader: JWSHeaderParameters): this;
    /**
     * Signs and resolves the value of the Flattened JWS object.
     *
     * @param key Private Key or Secret to sign the JWS with. See
     *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
     * @param options JWS Sign options.
     */
    sign(key: KeyLike | Uint8Array, options?: SignOptions): Promise<FlattenedJWS>;
}
