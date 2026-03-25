import { WeakPasswordReasons } from './types';
import { ErrorCode } from './error-codes';
export declare class AuthError extends Error {
    /**
     * Error code associated with the error. Most errors coming from
     * HTTP responses will have a code, though some errors that occur
     * before a response is received will not have one present. In that
     * case {@link #status} will also be undefined.
     */
    code: ErrorCode | (string & {}) | undefined;
    /** HTTP status code that caused the error. */
    status: number | undefined;
    protected __isAuthError: boolean;
    constructor(message: string, status?: number, code?: string);
}
export declare function isAuthError(error: unknown): error is AuthError;
export declare class AuthApiError extends AuthError {
    status: number;
    constructor(message: string, status: number, code: string | undefined);
}
export declare function isAuthApiError(error: unknown): error is AuthApiError;
export declare class AuthUnknownError extends AuthError {
    originalError: unknown;
    constructor(message: string, originalError: unknown);
}
export declare class CustomAuthError extends AuthError {
    name: string;
    status: number;
    constructor(message: string, name: string, status: number, code: string | undefined);
}
export declare class AuthSessionMissingError extends CustomAuthError {
    constructor();
}
export declare function isAuthSessionMissingError(error: any): error is AuthSessionMissingError;
export declare class AuthInvalidTokenResponseError extends CustomAuthError {
    constructor();
}
export declare class AuthInvalidCredentialsError extends CustomAuthError {
    constructor(message: string);
}
export declare class AuthImplicitGrantRedirectError extends CustomAuthError {
    details: {
        error: string;
        code: string;
    } | null;
    constructor(message: string, details?: {
        error: string;
        code: string;
    } | null);
    toJSON(): {
        name: string;
        message: string;
        status: number;
        details: {
            error: string;
            code: string;
        } | null;
    };
}
export declare function isAuthImplicitGrantRedirectError(error: any): error is AuthImplicitGrantRedirectError;
export declare class AuthPKCEGrantCodeExchangeError extends CustomAuthError {
    details: {
        error: string;
        code: string;
    } | null;
    constructor(message: string, details?: {
        error: string;
        code: string;
    } | null);
    toJSON(): {
        name: string;
        message: string;
        status: number;
        details: {
            error: string;
            code: string;
        } | null;
    };
}
export declare class AuthRetryableFetchError extends CustomAuthError {
    constructor(message: string, status: number);
}
export declare function isAuthRetryableFetchError(error: unknown): error is AuthRetryableFetchError;
/**
 * This error is thrown on certain methods when the password used is deemed
 * weak. Inspect the reasons to identify what password strength rules are
 * inadequate.
 */
export declare class AuthWeakPasswordError extends CustomAuthError {
    /**
     * Reasons why the password is deemed weak.
     */
    reasons: WeakPasswordReasons[];
    constructor(message: string, status: number, reasons: string[]);
}
export declare function isAuthWeakPasswordError(error: unknown): error is AuthWeakPasswordError;
export declare class AuthInvalidJwtError extends CustomAuthError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map