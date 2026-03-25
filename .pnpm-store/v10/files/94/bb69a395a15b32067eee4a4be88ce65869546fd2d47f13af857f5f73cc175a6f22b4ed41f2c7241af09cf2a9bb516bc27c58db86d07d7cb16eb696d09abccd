/**
 * @module
 * Type definitions for JWT utilities.
 */
export declare class JwtAlgorithmNotImplemented extends Error {
    constructor(alg: string);
}
export declare class JwtAlgorithmRequired extends Error {
    constructor();
}
export declare class JwtAlgorithmMismatch extends Error {
    constructor(expected: string, actual: string);
}
export declare class JwtTokenInvalid extends Error {
    constructor(token: string);
}
export declare class JwtTokenNotBefore extends Error {
    constructor(token: string);
}
export declare class JwtTokenExpired extends Error {
    constructor(token: string);
}
export declare class JwtTokenIssuedAt extends Error {
    constructor(currentTimestamp: number, iat: number);
}
export declare class JwtTokenIssuer extends Error {
    constructor(expected: string | RegExp, iss: string | null);
}
export declare class JwtHeaderInvalid extends Error {
    constructor(header: object);
}
export declare class JwtHeaderRequiresKid extends Error {
    constructor(header: object);
}
export declare class JwtSymmetricAlgorithmNotAllowed extends Error {
    constructor(alg: string);
}
export declare class JwtAlgorithmNotAllowed extends Error {
    constructor(alg: string, allowedAlgorithms: readonly string[]);
}
export declare class JwtTokenSignatureMismatched extends Error {
    constructor(token: string);
}
export declare class JwtPayloadRequiresAud extends Error {
    constructor(payload: object);
}
export declare class JwtTokenAudience extends Error {
    constructor(expected: string | string[] | RegExp, aud: string | string[]);
}
export declare enum CryptoKeyUsage {
    Encrypt = "encrypt",
    Decrypt = "decrypt",
    Sign = "sign",
    Verify = "verify",
    DeriveKey = "deriveKey",
    DeriveBits = "deriveBits",
    WrapKey = "wrapKey",
    UnwrapKey = "unwrapKey"
}
/**
 * JWT Payload
 */
export type JWTPayload = {
    [key: string]: unknown;
    /**
     * The token is checked to ensure it has not expired.
     */
    exp?: number;
    /**
     * The token is checked to ensure it is not being used before a specified time.
     */
    nbf?: number;
    /**
     * The token is checked to ensure it is not issued in the future.
     */
    iat?: number;
    /**
     * The token is checked to ensure it has been issued by a trusted issuer.
     */
    iss?: string;
    /**
     * The token is checked to ensure it is intended for a specific audience.
     */
    aud?: string | string[];
};
export type { HonoJsonWebKey } from './jws';
