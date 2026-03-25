/**
 * Verification using a JWK Embedded in a JWS Header
 *
 * @module
 */
import type * as types from '../types.d.ts';
/**
 * EmbeddedJWK is an implementation of a GetKeyFunction intended to be used with the JWS/JWT verify
 * operations whenever you need to opt-in to verify signatures with a public key embedded in the
 * token's "jwk" (JSON Web Key) Header Parameter. It is recommended to combine this with the verify
 * function's `algorithms` option to define accepted JWS "alg" (Algorithm) Header Parameter values.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwk/embedded'`.
 *
 */
export declare function EmbeddedJWK(protectedHeader?: types.JWSHeaderParameters, token?: types.FlattenedJWSInput): Promise<types.CryptoKey>;
