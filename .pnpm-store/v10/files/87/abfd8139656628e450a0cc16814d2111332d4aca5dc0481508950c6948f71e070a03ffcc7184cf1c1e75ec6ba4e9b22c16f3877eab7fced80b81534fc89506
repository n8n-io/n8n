import type { KeyLike } from '../types';
/**
 * A generic Error that all other JOSE specific Error subclasses extend.
 *
 */
export declare class JOSEError extends Error {
    /** A unique error code for the particular error subclass. */
    static get code(): string;
    /** A unique error code for the particular error subclass. */
    code: string;
    constructor(message?: string);
}
/**
 * An error subclass thrown when a JWT Claim Set member validation fails.
 *
 */
export declare class JWTClaimValidationFailed extends JOSEError {
    static get code(): 'ERR_JWT_CLAIM_VALIDATION_FAILED';
    code: string;
    /** The Claim for which the validation failed. */
    claim: string;
    /** Reason code for the validation failure. */
    reason: string;
    constructor(message: string, claim?: string, reason?: string);
}
/**
 * An error subclass thrown when a JWT is expired.
 *
 */
export declare class JWTExpired extends JOSEError implements JWTClaimValidationFailed {
    static get code(): 'ERR_JWT_EXPIRED';
    code: string;
    /** The Claim for which the validation failed. */
    claim: string;
    /** Reason code for the validation failure. */
    reason: string;
    constructor(message: string, claim?: string, reason?: string);
}
/**
 * An error subclass thrown when a JOSE Algorithm is not allowed per developer preference.
 *
 */
export declare class JOSEAlgNotAllowed extends JOSEError {
    static get code(): 'ERR_JOSE_ALG_NOT_ALLOWED';
    code: string;
}
/**
 * An error subclass thrown when a particular feature or algorithm is not supported by this
 * implementation or JOSE in general.
 *
 */
export declare class JOSENotSupported extends JOSEError {
    static get code(): 'ERR_JOSE_NOT_SUPPORTED';
    code: string;
}
/**
 * An error subclass thrown when a JWE ciphertext decryption fails.
 *
 */
export declare class JWEDecryptionFailed extends JOSEError {
    static get code(): 'ERR_JWE_DECRYPTION_FAILED';
    code: string;
    message: string;
}
/**
 * An error subclass thrown when a JWE ciphertext decompression fails.
 *
 */
export declare class JWEDecompressionFailed extends JOSEError {
    static get code(): 'ERR_JWE_DECOMPRESSION_FAILED';
    code: string;
    message: string;
}
/**
 * An error subclass thrown when a JWE is invalid.
 *
 */
export declare class JWEInvalid extends JOSEError {
    static get code(): 'ERR_JWE_INVALID';
    code: string;
}
/**
 * An error subclass thrown when a JWS is invalid.
 *
 */
export declare class JWSInvalid extends JOSEError {
    static get code(): 'ERR_JWS_INVALID';
    code: string;
}
/**
 * An error subclass thrown when a JWT is invalid.
 *
 */
export declare class JWTInvalid extends JOSEError {
    static get code(): 'ERR_JWT_INVALID';
    code: string;
}
/**
 * An error subclass thrown when a JWK is invalid.
 *
 */
export declare class JWKInvalid extends JOSEError {
    static get code(): 'ERR_JWK_INVALID';
    code: string;
}
/**
 * An error subclass thrown when a JWKS is invalid.
 *
 */
export declare class JWKSInvalid extends JOSEError {
    static get code(): 'ERR_JWKS_INVALID';
    code: string;
}
/**
 * An error subclass thrown when no keys match from a JWKS.
 *
 */
export declare class JWKSNoMatchingKey extends JOSEError {
    static get code(): 'ERR_JWKS_NO_MATCHING_KEY';
    code: string;
    message: string;
}
/**
 * An error subclass thrown when multiple keys match from a JWKS.
 *
 */
export declare class JWKSMultipleMatchingKeys extends JOSEError {
    /** @ignore */
    [Symbol.asyncIterator]: () => AsyncIterableIterator<KeyLike>;
    static get code(): 'ERR_JWKS_MULTIPLE_MATCHING_KEYS';
    code: string;
    message: string;
}
/**
 * Timeout was reached when retrieving the JWKS response.
 *
 */
export declare class JWKSTimeout extends JOSEError {
    static get code(): 'ERR_JWKS_TIMEOUT';
    code: string;
    message: string;
}
/**
 * An error subclass thrown when JWS signature verification fails.
 *
 */
export declare class JWSSignatureVerificationFailed extends JOSEError {
    static get code(): 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
    code: string;
    message: string;
}
