import type { CompactJWSHeaderParameters, KeyLike, SignOptions } from '../../types';
/**
 * The CompactSign class is used to build and sign Compact JWS strings.
 *
 */
export declare class CompactSign {
    private _flattened;
    /** @param payload Binary representation of the payload to sign. */
    constructor(payload: Uint8Array);
    /**
     * Sets the JWS Protected Header on the Sign object.
     *
     * @param protectedHeader JWS Protected Header.
     */
    setProtectedHeader(protectedHeader: CompactJWSHeaderParameters): this;
    /**
     * Signs and resolves the value of the Compact JWS string.
     *
     * @param key Private Key or Secret to sign the JWS with. See
     *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
     * @param options JWS Sign options.
     */
    sign(key: KeyLike | Uint8Array, options?: SignOptions): Promise<string>;
}
