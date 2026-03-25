/**
 * @module
 * JSON Web Token (JWT)
 * https://datatracker.ietf.org/doc/html/rfc7519
 */
import type { AsymmetricAlgorithm, SignatureAlgorithm } from './jwa';
import type { HonoJsonWebKey, SignatureKey } from './jws';
import type { JWTPayload } from './types';
export interface TokenHeader {
    alg: SignatureAlgorithm;
    typ?: 'JWT';
    kid?: string;
}
export declare function isTokenHeader(obj: unknown): obj is TokenHeader;
export declare const sign: (payload: JWTPayload, privateKey: SignatureKey, alg?: SignatureAlgorithm) => Promise<string>;
export type VerifyOptions = {
    /** The expected issuer used for verifying the token */
    iss?: string | RegExp;
    /** Verify the `nbf` claim (default: `true`) */
    nbf?: boolean;
    /** Verify the `exp` claim (default: `true`) */
    exp?: boolean;
    /** Verify the `iat` claim (default: `true`) */
    iat?: boolean;
    /** Acceptable audience(s) for the token */
    aud?: string | string[] | RegExp;
};
export type VerifyOptionsWithAlg = {
    /** The algorithm used for decoding the token */
    alg: SignatureAlgorithm;
} & VerifyOptions;
export declare const verify: (token: string, publicKey: SignatureKey, algOrOptions: SignatureAlgorithm | VerifyOptionsWithAlg) => Promise<JWTPayload>;
export declare const verifyWithJwks: (token: string, options: {
    keys?: HonoJsonWebKey[];
    jwks_uri?: string;
    verification?: VerifyOptions;
    allowedAlgorithms: readonly AsymmetricAlgorithm[];
}, init?: RequestInit) => Promise<JWTPayload>;
export declare const decode: (token: string) => {
    header: TokenHeader;
    payload: JWTPayload;
};
export declare const decodeHeader: (token: string) => TokenHeader;
