import type { JWK } from '../types';
/**
 * Calculates a base64url-encoded JSON Web Key (JWK) Thumbprint
 *
 * @param jwk JSON Web Key.
 * @param digestAlgorithm Digest Algorithm to use for calculating the thumbprint. Default is
 *   "sha256".
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc7638 RFC7638}
 */
export declare function calculateJwkThumbprint(jwk: JWK, digestAlgorithm?: 'sha256' | 'sha384' | 'sha512'): Promise<string>;
/**
 * Calculates a JSON Web Key (JWK) Thumbprint URI
 *
 * @param jwk JSON Web Key.
 * @param digestAlgorithm Digest Algorithm to use for calculating the thumbprint. Default is
 *   "sha256".
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9278 RFC9278}
 */
export declare function calculateJwkThumbprintUri(jwk: JWK, digestAlgorithm?: 'sha256' | 'sha384' | 'sha512'): Promise<string>;
