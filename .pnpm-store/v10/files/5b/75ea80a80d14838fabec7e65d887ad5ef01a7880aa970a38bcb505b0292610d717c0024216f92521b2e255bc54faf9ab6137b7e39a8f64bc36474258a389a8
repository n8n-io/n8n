import type { KeyLike, FlattenedJWSInput, JWSHeaderParameters } from '../types';
/**
 * EmbeddedJWK is an implementation of a GetKeyFunction intended to be used with the JWS/JWT verify
 * operations whenever you need to opt-in to verify signatures with a public key embedded in the
 * token's "jwk" (JSON Web Key) Header Parameter. It is recommended to combine this with the verify
 * function's `algorithms` option to define accepted JWS "alg" (Algorithm) Header Parameter values.
 *
 */
export declare function EmbeddedJWK<T extends KeyLike = KeyLike>(protectedHeader?: JWSHeaderParameters, token?: FlattenedJWSInput): Promise<T>;
