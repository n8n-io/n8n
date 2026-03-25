/**
 * JSON Web Token (JWT) Claims Set Decoding (no validation, no signature checking)
 *
 * @module
 */
import type * as types from '../types.d.ts';
/**
 * Decodes a signed JSON Web Token payload. This does not validate the JWT Claims Set types or
 * values. This does not validate the JWS Signature. For a proper Signed JWT Claims Set validation
 * and JWS signature verification use `jose.jwtVerify()`. For an encrypted JWT Claims Set validation
 * and JWE decryption use `jose.jwtDecrypt()`.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwt/decode'`.
 *
 * @param jwt JWT token in compact JWS serialization.
 */
export declare function decodeJwt<PayloadType = types.JWTPayload>(jwt: string): PayloadType & types.JWTPayload;
