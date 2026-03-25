import { AuthError } from "@azure/msal-common/node";
/**
 * NodeAuthErrorMessage class containing string constants used by error codes and messages.
 */
export declare const NodeAuthErrorMessage: {
    invalidLoopbackAddressType: {
        code: string;
        desc: string;
    };
    unableToLoadRedirectUri: {
        code: string;
        desc: string;
    };
    noAuthCodeInResponse: {
        code: string;
        desc: string;
    };
    noLoopbackServerExists: {
        code: string;
        desc: string;
    };
    loopbackServerAlreadyExists: {
        code: string;
        desc: string;
    };
    loopbackServerTimeout: {
        code: string;
        desc: string;
    };
    stateNotFoundError: {
        code: string;
        desc: string;
    };
    thumbprintMissing: {
        code: string;
        desc: string;
    };
    redirectUriNotSupported: {
        code: string;
        desc: string;
    };
};
export declare class NodeAuthError extends AuthError {
    constructor(errorCode: string, errorMessage?: string);
    /**
     * Creates an error thrown if loopback server address is of type string.
     */
    static createInvalidLoopbackAddressTypeError(): NodeAuthError;
    /**
     * Creates an error thrown if the loopback server is unable to get a url.
     */
    static createUnableToLoadRedirectUrlError(): NodeAuthError;
    /**
     * Creates an error thrown if the server response does not contain an auth code.
     */
    static createNoAuthCodeInResponseError(): NodeAuthError;
    /**
     * Creates an error thrown if the loopback server has not been spun up yet.
     */
    static createNoLoopbackServerExistsError(): NodeAuthError;
    /**
     * Creates an error thrown if a loopback server already exists when attempting to create another one.
     */
    static createLoopbackServerAlreadyExistsError(): NodeAuthError;
    /**
     * Creates an error thrown if the loopback server times out registering the auth code listener.
     */
    static createLoopbackServerTimeoutError(): NodeAuthError;
    /**
     * Creates an error thrown when the state is not present.
     */
    static createStateNotFoundError(): NodeAuthError;
    /**
     * Creates an error thrown when client certificate was provided, but neither the SHA-1 or SHA-256 thumbprints were provided
     */
    static createThumbprintMissingError(): NodeAuthError;
    /**
     * Creates an error thrown when redirectUri is provided in an unsupported scenario
     */
    static createRedirectUriNotSupportedError(): NodeAuthError;
}
//# sourceMappingURL=NodeAuthError.d.ts.map