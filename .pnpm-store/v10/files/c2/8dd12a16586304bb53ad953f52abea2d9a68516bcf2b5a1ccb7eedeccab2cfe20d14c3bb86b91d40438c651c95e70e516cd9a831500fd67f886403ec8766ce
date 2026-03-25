import { AuthError } from "./AuthError.js";
import * as InteractionRequiredAuthErrorCodes from "./InteractionRequiredAuthErrorCodes.js";
export { InteractionRequiredAuthErrorCodes };
/**
 * InteractionRequiredServerErrorMessage contains string constants used by error codes and messages returned by the server indicating interaction is required
 */
export declare const InteractionRequiredServerErrorMessage: string[];
export declare const InteractionRequiredAuthSubErrorMessage: string[];
/**
 * Interaction required errors defined by the SDK
 * @deprecated Use InteractionRequiredAuthErrorCodes instead
 */
export declare const InteractionRequiredAuthErrorMessage: {
    noTokensFoundError: {
        code: string;
        desc: string;
    };
    native_account_unavailable: {
        code: string;
        desc: string;
    };
    bad_token: {
        code: string;
        desc: string;
    };
};
/**
 * Error thrown when user interaction is required.
 */
export declare class InteractionRequiredAuthError extends AuthError {
    /**
     * The time the error occured at
     */
    timestamp: string;
    /**
     * TraceId associated with the error
     */
    traceId: string;
    /**
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/claims-challenge.md
     *
     * A string with extra claims needed for the token request to succeed
     * web site: redirect the user to the authorization page and set the extra claims
     * web api: include the claims in the WWW-Authenticate header that are sent back to the client so that it knows to request a token with the extra claims
     * desktop application or browser context: include the claims when acquiring the token interactively
     * app to app context (client_credentials): include the claims in the AcquireTokenByClientCredential request
     */
    claims: string;
    /**
     * Server error number;
     */
    readonly errorNo?: string;
    constructor(errorCode?: string, errorMessage?: string, subError?: string, timestamp?: string, traceId?: string, correlationId?: string, claims?: string, errorNo?: string);
}
/**
 * Helper function used to determine if an error thrown by the server requires interaction to resolve
 * @param errorCode
 * @param errorString
 * @param subError
 */
export declare function isInteractionRequiredError(errorCode?: string, errorString?: string, subError?: string): boolean;
/**
 * Creates an InteractionRequiredAuthError
 */
export declare function createInteractionRequiredAuthError(errorCode: string): InteractionRequiredAuthError;
//# sourceMappingURL=InteractionRequiredAuthError.d.ts.map