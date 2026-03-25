/**
 * JOSE module errors and error codes
 *
 * @module
 */
import type * as types from '../types.d.ts';
/**
 * A generic Error that all other JOSE specific Error subclasses extend.
 *
 */
export declare class JOSEError extends Error {
    /**
     * A unique error code for the particular error subclass.
     *
     * @ignore
     */
    static code: string;
    /** A unique error code for {@link JOSEError}. */
    code: string;
    /** @ignore */
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
/**
 * An error subclass thrown when a JWT Claim Set member validation fails.
 *
 */
export declare class JWTClaimValidationFailed extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWTClaimValidationFailed}. */
    code: string;
    /** The Claim for which the validation failed. */
    claim: string;
    /** Reason code for the validation failure. */
    reason: string;
    /**
     * The parsed JWT Claims Set (aka payload). Other JWT claims may or may not have been verified at
     * this point. The JSON Web Signature (JWS) or a JSON Web Encryption (JWE) structures' integrity
     * has however been verified. Claims Set verification happens after the JWS Signature or JWE
     * Decryption processes.
     */
    payload: types.JWTPayload;
    /** @ignore */
    constructor(message: string, payload: types.JWTPayload, claim?: string, reason?: string);
}
/**
 * An error subclass thrown when a JWT is expired.
 *
 */
export declare class JWTExpired extends JOSEError implements JWTClaimValidationFailed {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWTExpired}. */
    code: string;
    /** The Claim for which the validation failed. */
    claim: string;
    /** Reason code for the validation failure. */
    reason: string;
    /**
     * The parsed JWT Claims Set (aka payload). Other JWT claims may or may not have been verified at
     * this point. The JSON Web Signature (JWS) or a JSON Web Encryption (JWE) structures' integrity
     * has however been verified. Claims Set verification happens after the JWS Signature or JWE
     * Decryption processes.
     */
    payload: types.JWTPayload;
    /** @ignore */
    constructor(message: string, payload: types.JWTPayload, claim?: string, reason?: string);
}
/**
 * An error subclass thrown when a JOSE Algorithm is not allowed per developer preference.
 *
 */
export declare class JOSEAlgNotAllowed extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JOSEAlgNotAllowed}. */
    code: string;
}
/**
 * An error subclass thrown when a particular feature or algorithm is not supported by this
 * implementation or JOSE in general.
 *
 */
export declare class JOSENotSupported extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JOSENotSupported}. */
    code: string;
}
/**
 * An error subclass thrown when a JWE ciphertext decryption fails.
 *
 */
export declare class JWEDecryptionFailed extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWEDecryptionFailed}. */
    code: string;
    /** @ignore */
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
/**
 * An error subclass thrown when a JWE is invalid.
 *
 */
export declare class JWEInvalid extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWEInvalid}. */
    code: string;
}
/**
 * An error subclass thrown when a JWS is invalid.
 *
 */
export declare class JWSInvalid extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWSInvalid}. */
    code: string;
}
/**
 * An error subclass thrown when a JWT is invalid.
 *
 */
export declare class JWTInvalid extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWTInvalid}. */
    code: string;
}
/**
 * An error subclass thrown when a JWK is invalid.
 *
 */
export declare class JWKInvalid extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWKInvalid}. */
    code: string;
}
/**
 * An error subclass thrown when a JWKS is invalid.
 *
 */
export declare class JWKSInvalid extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWKSInvalid}. */
    code: string;
}
/**
 * An error subclass thrown when no keys match from a JWKS.
 *
 */
export declare class JWKSNoMatchingKey extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWKSNoMatchingKey}. */
    code: string;
    /** @ignore */
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
/**
 * An error subclass thrown when multiple keys match from a JWKS.
 *
 */
export declare class JWKSMultipleMatchingKeys extends JOSEError {
    /** @ignore */
    [Symbol.asyncIterator]: () => AsyncIterableIterator<types.CryptoKey>;
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWKSMultipleMatchingKeys}. */
    code: string;
    /** @ignore */
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
/**
 * Timeout was reached when retrieving the JWKS response.
 *
 */
export declare class JWKSTimeout extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWKSTimeout}. */
    code: string;
    /** @ignore */
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
/**
 * An error subclass thrown when JWS signature verification fails.
 *
 */
export declare class JWSSignatureVerificationFailed extends JOSEError {
    /** @ignore */
    static code: string;
    /** A unique error code for {@link JWSSignatureVerificationFailed}. */
    code: string;
    /** @ignore */
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
