import type { KeyLike, JWSHeaderParameters, JSONWebKeySet, FlattenedJWSInput } from '../types';
/** @private */
export declare function isJWKSLike(jwks: unknown): jwks is JSONWebKeySet;
/** @private */
export declare class LocalJWKSet<T extends KeyLike = KeyLike> {
    protected _jwks?: JSONWebKeySet;
    private _cached;
    constructor(jwks: unknown);
    getKey(protectedHeader?: JWSHeaderParameters, token?: FlattenedJWSInput): Promise<T>;
}
/**
 * Returns a function that resolves to a key object from a locally stored, or otherwise available,
 * JSON Web Key Set.
 *
 * It uses the "alg" (JWS Algorithm) Header Parameter to determine the right JWK "kty" (Key Type),
 * then proceeds to match the JWK "kid" (Key ID) with one found in the JWS Header Parameters (if
 * there is one) while also respecting the JWK "use" (Public Key Use) and JWK "key_ops" (Key
 * Operations) Parameters (if they are present on the JWK).
 *
 * Only a single public key must match the selection process. As shown in the example below when
 * multiple keys get matched it is possible to opt-in to iterate over the matched keys and attempt
 * verification in an iterative manner.
 *
 * @param jwks JSON Web Key Set formatted object.
 */
export declare function createLocalJWKSet<T extends KeyLike = KeyLike>(jwks: JSONWebKeySet): (protectedHeader?: JWSHeaderParameters, token?: FlattenedJWSInput) => Promise<T>;
