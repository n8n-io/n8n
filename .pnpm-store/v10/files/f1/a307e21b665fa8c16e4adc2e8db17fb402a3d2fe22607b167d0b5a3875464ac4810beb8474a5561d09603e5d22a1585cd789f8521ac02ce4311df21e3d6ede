import type { GetTokenOptions } from "@azure/core-auth";
/**
 * See the official documentation for more details:
 *
 * https://learn.microsoft.com/azure/active-directory/develop/v1-protocols-oauth-code#error-response-1
 *
 * NOTE: This documentation is for v1 OAuth support but the same error
 * response details still apply to v2.
 */
export interface ErrorResponse {
    /**
     * The string identifier for the error.
     */
    error: string;
    /**
     * The error's description.
     */
    errorDescription: string;
    /**
     * An array of codes pertaining to the error(s) that occurred.
     */
    errorCodes?: number[];
    /**
     * The timestamp at which the error occurred.
     */
    timestamp?: string;
    /**
     * The trace identifier for this error occurrence.
     */
    traceId?: string;
    /**
     * The correlation ID to be used for tracking the source of the error.
     */
    correlationId?: string;
}
/**
 * Used for internal deserialization of OAuth responses. Public model is ErrorResponse
 * @internal
 */
export interface OAuthErrorResponse {
    error: string;
    error_description: string;
    error_codes?: number[];
    timestamp?: string;
    trace_id?: string;
    correlation_id?: string;
}
/**
 * The Error.name value of an CredentialUnavailable
 */
export declare const CredentialUnavailableErrorName = "CredentialUnavailableError";
/**
 * This signifies that the credential that was tried in a chained credential
 * was not available to be used as the credential. Rather than treating this as
 * an error that should halt the chain, it's caught and the chain continues
 */
export declare class CredentialUnavailableError extends Error {
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
/**
 * The Error.name value of an AuthenticationError
 */
export declare const AuthenticationErrorName = "AuthenticationError";
/**
 * Provides details about a failure to authenticate with Azure Active
 * Directory.  The `errorResponse` field contains more details about
 * the specific failure.
 */
export declare class AuthenticationError extends Error {
    /**
     * The HTTP status code returned from the authentication request.
     */
    readonly statusCode: number;
    /**
     * The error response details.
     */
    readonly errorResponse: ErrorResponse;
    constructor(statusCode: number, errorBody: object | string | undefined | null, options?: {
        cause?: unknown;
    });
}
/**
 * The Error.name value of an AggregateAuthenticationError
 */
export declare const AggregateAuthenticationErrorName = "AggregateAuthenticationError";
/**
 * Provides an `errors` array containing {@link AuthenticationError} instance
 * for authentication failures from credentials in a {@link ChainedTokenCredential}.
 */
export declare class AggregateAuthenticationError extends Error {
    /**
     * The array of error objects that were thrown while trying to authenticate
     * with the credentials in a {@link ChainedTokenCredential}.
     */
    errors: any[];
    constructor(errors: any[], errorMessage?: string);
}
/**
 * Optional parameters to the {@link AuthenticationRequiredError}
 */
export interface AuthenticationRequiredErrorOptions {
    /**
     * The list of scopes for which the token will have access.
     */
    scopes: string[];
    /**
     * The options passed to the getToken request.
     */
    getTokenOptions?: GetTokenOptions;
    /**
     * The message of the error.
     */
    message?: string;
    /**
     * The underlying cause, if any, that caused the authentication to fail.
     */
    cause?: unknown;
}
/**
 * Error used to enforce authentication after trying to retrieve a token silently.
 */
export declare class AuthenticationRequiredError extends Error {
    /**
     * The list of scopes for which the token will have access.
     */
    scopes: string[];
    /**
     * The options passed to the getToken request.
     */
    getTokenOptions?: GetTokenOptions;
    constructor(
    /**
     * Optional parameters. A message can be specified. The {@link GetTokenOptions} of the request can also be specified to more easily associate the error with the received parameters.
     */
    options: AuthenticationRequiredErrorOptions);
}
//# sourceMappingURL=errors.d.ts.map