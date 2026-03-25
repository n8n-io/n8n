/**
 * JSON Web Key Thumbprint and JSON Web Key Thumbprint URI
 *
 * @module
 */
import type * as types from '../types.d.ts';
/**
 * Calculates a base64url-encoded JSON Web Key (JWK) Thumbprint
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwk/thumbprint'`.
 *
 * @param key Key to calculate the thumbprint for.
 * @param digestAlgorithm Digest Algorithm to use for calculating the thumbprint. Default is
 *   "sha256".
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc7638 RFC7638}
 */
export declare function calculateJwkThumbprint(key: types.JWK | types.CryptoKey | types.KeyObject, digestAlgorithm?: 'sha256' | 'sha384' | 'sha512'): Promise<string>;
/**
 * Calculates a JSON Web Key (JWK) Thumbprint URI
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwk/thumbprint'`.
 *
 * @param key Key to calculate the thumbprint for.
 * @param digestAlgorithm Digest Algorithm to use for calculating the thumbprint. Default is
 *   "sha256".
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9278 RFC9278}
 */
export declare function calculateJwkThumbprintUri(key: types.CryptoKey | types.KeyObject | types.JWK, digestAlgorithm?: 'sha256' | 'sha384' | 'sha512'): Promise<string>;
