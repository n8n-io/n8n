// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
function isErrorResponse(errorResponse) {
    return (errorResponse &&
        typeof errorResponse.error === "string" &&
        typeof errorResponse.error_description === "string");
}
/**
 * The Error.name value of an CredentialUnavailable
 */
export const CredentialUnavailableErrorName = "CredentialUnavailableError";
/**
 * This signifies that the credential that was tried in a chained credential
 * was not available to be used as the credential. Rather than treating this as
 * an error that should halt the chain, it's caught and the chain continues
 */
export class CredentialUnavailableError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = CredentialUnavailableErrorName;
    }
}
/**
 * The Error.name value of an AuthenticationError
 */
export const AuthenticationErrorName = "AuthenticationError";
/**
 * Provides details about a failure to authenticate with Azure Active
 * Directory.  The `errorResponse` field contains more details about
 * the specific failure.
 */
export class AuthenticationError extends Error {
    /**
     * The HTTP status code returned from the authentication request.
     */
    statusCode;
    /**
     * The error response details.
     */
    errorResponse;
    constructor(statusCode, errorBody, options) {
        let errorResponse = {
            error: "unknown",
            errorDescription: "An unknown error occurred and no additional details are available.",
        };
        if (isErrorResponse(errorBody)) {
            errorResponse = convertOAuthErrorResponseToErrorResponse(errorBody);
        }
        else if (typeof errorBody === "string") {
            try {
                // Most error responses will contain JSON-formatted error details
                // in the response body
                const oauthErrorResponse = JSON.parse(errorBody);
                errorResponse = convertOAuthErrorResponseToErrorResponse(oauthErrorResponse);
            }
            catch (e) {
                if (statusCode === 400) {
                    errorResponse = {
                        error: "invalid_request",
                        errorDescription: `The service indicated that the request was invalid.\n\n${errorBody}`,
                    };
                }
                else {
                    errorResponse = {
                        error: "unknown_error",
                        errorDescription: `An unknown error has occurred. Response body:\n\n${errorBody}`,
                    };
                }
            }
        }
        else {
            errorResponse = {
                error: "unknown_error",
                errorDescription: "An unknown error occurred and no additional details are available.",
            };
        }
        super(`${errorResponse.error} Status code: ${statusCode}\nMore details:\n${errorResponse.errorDescription},`, options);
        this.statusCode = statusCode;
        this.errorResponse = errorResponse;
        // Ensure that this type reports the correct name
        this.name = AuthenticationErrorName;
    }
}
/**
 * The Error.name value of an AggregateAuthenticationError
 */
export const AggregateAuthenticationErrorName = "AggregateAuthenticationError";
/**
 * Provides an `errors` array containing {@link AuthenticationError} instance
 * for authentication failures from credentials in a {@link ChainedTokenCredential}.
 */
export class AggregateAuthenticationError extends Error {
    /**
     * The array of error objects that were thrown while trying to authenticate
     * with the credentials in a {@link ChainedTokenCredential}.
     */
    errors;
    constructor(errors, errorMessage) {
        const errorDetail = errors.join("\n");
        super(`${errorMessage}\n${errorDetail}`);
        this.errors = errors;
        // Ensure that this type reports the correct name
        this.name = AggregateAuthenticationErrorName;
    }
}
function convertOAuthErrorResponseToErrorResponse(errorBody) {
    return {
        error: errorBody.error,
        errorDescription: errorBody.error_description,
        correlationId: errorBody.correlation_id,
        errorCodes: errorBody.error_codes,
        timestamp: errorBody.timestamp,
        traceId: errorBody.trace_id,
    };
}
/**
 * Error used to enforce authentication after trying to retrieve a token silently.
 */
export class AuthenticationRequiredError extends Error {
    /**
     * The list of scopes for which the token will have access.
     */
    scopes;
    /**
     * The options passed to the getToken request.
     */
    getTokenOptions;
    constructor(
    /**
     * Optional parameters. A message can be specified. The {@link GetTokenOptions} of the request can also be specified to more easily associate the error with the received parameters.
     */
    options) {
        super(options.message, options.cause ? { cause: options.cause } : undefined);
        this.scopes = options.scopes;
        this.getTokenOptions = options.getTokenOptions;
        this.name = "AuthenticationRequiredError";
    }
}
//# sourceMappingURL=errors.js.map