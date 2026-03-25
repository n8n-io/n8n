/**
 * Verification using a JSON Web Key Set (JWKS) available locally
 *
 * @module
 */
import type * as types from '../types.d.ts';
/**
 * Returns a function that resolves a JWS JOSE Header to a public key object from a locally stored,
 * or otherwise available, JSON Web Key Set.
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
 * Note: The function's purpose is to resolve public keys used for verifying signatures and will not
 * work for public encryption keys.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwks/local'`.
 *
 * @param jwks JSON Web Key Set formatted object.
 */
export declare function createLocalJWKSet(jwks: types.JSONWebKeySet): (protectedHeader?: types.JWSHeaderParameters, token?: types.FlattenedJWSInput) => Promise<types.CryptoKey>;
