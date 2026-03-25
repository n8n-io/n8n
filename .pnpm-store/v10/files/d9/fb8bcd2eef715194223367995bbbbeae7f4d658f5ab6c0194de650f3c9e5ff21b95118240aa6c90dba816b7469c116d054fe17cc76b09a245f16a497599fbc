/**
 * Interface defining the JSON formatted response of a 3rd party executable
 * used by the pluggable auth client.
 */
export interface ExecutableResponseJson {
    /**
     * The version of the JSON response. Only version 1 is currently supported.
     * Always required.
     */
    version: number;
    /**
     * Whether the executable ran successfully. Always required.
     */
    success: boolean;
    /**
     * The epoch time for expiration of the token in seconds, required for
     * successful responses.
     */
    expiration_time?: number;
    /**
     * The type of subject token in the response, currently supported values are:
     * urn:ietf:params:oauth:token-type:saml2
     * urn:ietf:params:oauth:token-type:id_token
     * urn:ietf:params:oauth:token-type:jwt
     */
    token_type?: string;
    /**
     * The error code from the executable, required when unsuccessful.
     */
    code?: string;
    /**
     * The error message from the executable, required when unsuccessful.
     */
    message?: string;
    /**
     * The ID token to be used as a subject token when token_type is id_token or jwt.
     */
    id_token?: string;
    /**
     * The response to be used as a subject token when token_type is saml2.
     */
    saml_response?: string;
}
/**
 * Defines the response of a 3rd party executable run by the pluggable auth client.
 */
export declare class ExecutableResponse {
    /**
     * The version of the Executable response. Only version 1 is currently supported.
     */
    readonly version: number;
    /**
     * Whether the executable ran successfully.
     */
    readonly success: boolean;
    /**
     * The epoch time for expiration of the token in seconds.
     */
    readonly expirationTime?: number;
    /**
     * The type of subject token in the response, currently supported values are:
     * urn:ietf:params:oauth:token-type:saml2
     * urn:ietf:params:oauth:token-type:id_token
     * urn:ietf:params:oauth:token-type:jwt
     */
    readonly tokenType?: string;
    /**
     * The error code from the executable.
     */
    readonly errorCode?: string;
    /**
     * The error message from the executable.
     */
    readonly errorMessage?: string;
    /**
     * The subject token from the executable, format depends on tokenType.
     */
    readonly subjectToken?: string;
    /**
     * Instantiates an ExecutableResponse instance using the provided JSON object
     * from the output of the executable.
     * @param responseJson Response from a 3rd party executable, loaded from a
     * run of the executable or a cached output file.
     */
    constructor(responseJson: ExecutableResponseJson);
    /**
     * @return A boolean representing if the response has a valid token. Returns
     * true when the response was successful and the token is not expired.
     */
    isValid(): boolean;
    /**
     * @return A boolean representing if the response is expired. Returns true if the
     * provided timeout has passed.
     */
    isExpired(): boolean;
}
/**
 * An error thrown by the ExecutableResponse class.
 */
export declare class ExecutableResponseError extends Error {
    constructor(message: string);
}
/**
 * An error thrown when the 'version' field in an executable response is missing or invalid.
 */
export declare class InvalidVersionFieldError extends ExecutableResponseError {
}
/**
 * An error thrown when the 'success' field in an executable response is missing or invalid.
 */
export declare class InvalidSuccessFieldError extends ExecutableResponseError {
}
/**
 * An error thrown when the 'expiration_time' field in an executable response is missing or invalid.
 */
export declare class InvalidExpirationTimeFieldError extends ExecutableResponseError {
}
/**
 * An error thrown when the 'token_type' field in an executable response is missing or invalid.
 */
export declare class InvalidTokenTypeFieldError extends ExecutableResponseError {
}
/**
 * An error thrown when the 'code' field in an executable response is missing or invalid.
 */
export declare class InvalidCodeFieldError extends ExecutableResponseError {
}
/**
 * An error thrown when the 'message' field in an executable response is missing or invalid.
 */
export declare class InvalidMessageFieldError extends ExecutableResponseError {
}
/**
 * An error thrown when the subject token in an executable response is missing or invalid.
 */
export declare class InvalidSubjectTokenError extends ExecutableResponseError {
}
