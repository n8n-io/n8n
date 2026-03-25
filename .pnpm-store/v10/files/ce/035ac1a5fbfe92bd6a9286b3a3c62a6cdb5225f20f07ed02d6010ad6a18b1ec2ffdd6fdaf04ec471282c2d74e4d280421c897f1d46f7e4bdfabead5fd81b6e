/**
 * @module
 * JSON Web Signature (JWS)
 * https://datatracker.ietf.org/doc/html/rfc7515
 */
import type { SignatureAlgorithm } from './jwa';
export interface HonoJsonWebKey extends JsonWebKey {
    kid?: string;
}
export type SignatureKey = string | HonoJsonWebKey | CryptoKey;
export declare function signing(privateKey: SignatureKey, alg: SignatureAlgorithm, data: BufferSource): Promise<ArrayBuffer>;
export declare function verifying(publicKey: SignatureKey, alg: SignatureAlgorithm, signature: BufferSource, data: BufferSource): Promise<boolean>;
