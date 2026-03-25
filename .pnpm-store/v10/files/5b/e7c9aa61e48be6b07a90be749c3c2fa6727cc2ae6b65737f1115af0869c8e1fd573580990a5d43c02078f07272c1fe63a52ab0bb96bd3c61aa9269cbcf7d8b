"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAUTH_ERRORS = exports.CustomOAuthError = exports.InvalidTargetError = exports.InsufficientScopeError = exports.InvalidClientMetadataError = exports.TooManyRequestsError = exports.MethodNotAllowedError = exports.InvalidTokenError = exports.UnsupportedTokenTypeError = exports.UnsupportedResponseTypeError = exports.TemporarilyUnavailableError = exports.ServerError = exports.AccessDeniedError = exports.InvalidScopeError = exports.UnsupportedGrantTypeError = exports.UnauthorizedClientError = exports.InvalidGrantError = exports.InvalidClientError = exports.InvalidRequestError = exports.OAuthError = void 0;
/**
 * Base class for all OAuth errors
 */
class OAuthError extends Error {
    constructor(message, errorUri) {
        super(message);
        this.errorUri = errorUri;
        this.name = this.constructor.name;
    }
    /**
     * Converts the error to a standard OAuth error response object
     */
    toResponseObject() {
        const response = {
            error: this.errorCode,
            error_description: this.message
        };
        if (this.errorUri) {
            response.error_uri = this.errorUri;
        }
        return response;
    }
    get errorCode() {
        return this.constructor.errorCode;
    }
}
exports.OAuthError = OAuthError;
/**
 * Invalid request error - The request is missing a required parameter,
 * includes an invalid parameter value, includes a parameter more than once,
 * or is otherwise malformed.
 */
class InvalidRequestError extends OAuthError {
}
exports.InvalidRequestError = InvalidRequestError;
InvalidRequestError.errorCode = 'invalid_request';
/**
 * Invalid client error - Client authentication failed (e.g., unknown client, no client
 * authentication included, or unsupported authentication method).
 */
class InvalidClientError extends OAuthError {
}
exports.InvalidClientError = InvalidClientError;
InvalidClientError.errorCode = 'invalid_client';
/**
 * Invalid grant error - The provided authorization grant or refresh token is
 * invalid, expired, revoked, does not match the redirection URI used in the
 * authorization request, or was issued to another client.
 */
class InvalidGrantError extends OAuthError {
}
exports.InvalidGrantError = InvalidGrantError;
InvalidGrantError.errorCode = 'invalid_grant';
/**
 * Unauthorized client error - The authenticated client is not authorized to use
 * this authorization grant type.
 */
class UnauthorizedClientError extends OAuthError {
}
exports.UnauthorizedClientError = UnauthorizedClientError;
UnauthorizedClientError.errorCode = 'unauthorized_client';
/**
 * Unsupported grant type error - The authorization grant type is not supported
 * by the authorization server.
 */
class UnsupportedGrantTypeError extends OAuthError {
}
exports.UnsupportedGrantTypeError = UnsupportedGrantTypeError;
UnsupportedGrantTypeError.errorCode = 'unsupported_grant_type';
/**
 * Invalid scope error - The requested scope is invalid, unknown, malformed, or
 * exceeds the scope granted by the resource owner.
 */
class InvalidScopeError extends OAuthError {
}
exports.InvalidScopeError = InvalidScopeError;
InvalidScopeError.errorCode = 'invalid_scope';
/**
 * Access denied error - The resource owner or authorization server denied the request.
 */
class AccessDeniedError extends OAuthError {
}
exports.AccessDeniedError = AccessDeniedError;
AccessDeniedError.errorCode = 'access_denied';
/**
 * Server error - The authorization server encountered an unexpected condition
 * that prevented it from fulfilling the request.
 */
class ServerError extends OAuthError {
}
exports.ServerError = ServerError;
ServerError.errorCode = 'server_error';
/**
 * Temporarily unavailable error - The authorization server is currently unable to
 * handle the request due to a temporary overloading or maintenance of the server.
 */
class TemporarilyUnavailableError extends OAuthError {
}
exports.TemporarilyUnavailableError = TemporarilyUnavailableError;
TemporarilyUnavailableError.errorCode = 'temporarily_unavailable';
/**
 * Unsupported response type error - The authorization server does not support
 * obtaining an authorization code using this method.
 */
class UnsupportedResponseTypeError extends OAuthError {
}
exports.UnsupportedResponseTypeError = UnsupportedResponseTypeError;
UnsupportedResponseTypeError.errorCode = 'unsupported_response_type';
/**
 * Unsupported token type error - The authorization server does not support
 * the requested token type.
 */
class UnsupportedTokenTypeError extends OAuthError {
}
exports.UnsupportedTokenTypeError = UnsupportedTokenTypeError;
UnsupportedTokenTypeError.errorCode = 'unsupported_token_type';
/**
 * Invalid token error - The access token provided is expired, revoked, malformed,
 * or invalid for other reasons.
 */
class InvalidTokenError extends OAuthError {
}
exports.InvalidTokenError = InvalidTokenError;
InvalidTokenError.errorCode = 'invalid_token';
/**
 * Method not allowed error - The HTTP method used is not allowed for this endpoint.
 * (Custom, non-standard error)
 */
class MethodNotAllowedError extends OAuthError {
}
exports.MethodNotAllowedError = MethodNotAllowedError;
MethodNotAllowedError.errorCode = 'method_not_allowed';
/**
 * Too many requests error - Rate limit exceeded.
 * (Custom, non-standard error based on RFC 6585)
 */
class TooManyRequestsError extends OAuthError {
}
exports.TooManyRequestsError = TooManyRequestsError;
TooManyRequestsError.errorCode = 'too_many_requests';
/**
 * Invalid client metadata error - The client metadata is invalid.
 * (Custom error for dynamic client registration - RFC 7591)
 */
class InvalidClientMetadataError extends OAuthError {
}
exports.InvalidClientMetadataError = InvalidClientMetadataError;
InvalidClientMetadataError.errorCode = 'invalid_client_metadata';
/**
 * Insufficient scope error - The request requires higher privileges than provided by the access token.
 */
class InsufficientScopeError extends OAuthError {
}
exports.InsufficientScopeError = InsufficientScopeError;
InsufficientScopeError.errorCode = 'insufficient_scope';
/**
 * Invalid target error - The requested resource is invalid, missing, unknown, or malformed.
 * (Custom error for resource indicators - RFC 8707)
 */
class InvalidTargetError extends OAuthError {
}
exports.InvalidTargetError = InvalidTargetError;
InvalidTargetError.errorCode = 'invalid_target';
/**
 * A utility class for defining one-off error codes
 */
class CustomOAuthError extends OAuthError {
    constructor(customErrorCode, message, errorUri) {
        super(message, errorUri);
        this.customErrorCode = customErrorCode;
    }
    get errorCode() {
        return this.customErrorCode;
    }
}
exports.CustomOAuthError = CustomOAuthError;
/**
 * A full list of all OAuthErrors, enabling parsing from error responses
 */
exports.OAUTH_ERRORS = {
    [InvalidRequestError.errorCode]: InvalidRequestError,
    [InvalidClientError.errorCode]: InvalidClientError,
    [InvalidGrantError.errorCode]: InvalidGrantError,
    [UnauthorizedClientError.errorCode]: UnauthorizedClientError,
    [UnsupportedGrantTypeError.errorCode]: UnsupportedGrantTypeError,
    [InvalidScopeError.errorCode]: InvalidScopeError,
    [AccessDeniedError.errorCode]: AccessDeniedError,
    [ServerError.errorCode]: ServerError,
    [TemporarilyUnavailableError.errorCode]: TemporarilyUnavailableError,
    [UnsupportedResponseTypeError.errorCode]: UnsupportedResponseTypeError,
    [UnsupportedTokenTypeError.errorCode]: UnsupportedTokenTypeError,
    [InvalidTokenError.errorCode]: InvalidTokenError,
    [MethodNotAllowedError.errorCode]: MethodNotAllowedError,
    [TooManyRequestsError.errorCode]: TooManyRequestsError,
    [InvalidClientMetadataError.errorCode]: InvalidClientMetadataError,
    [InsufficientScopeError.errorCode]: InsufficientScopeError,
    [InvalidTargetError.errorCode]: InvalidTargetError
};
//# sourceMappingURL=errors.js.map