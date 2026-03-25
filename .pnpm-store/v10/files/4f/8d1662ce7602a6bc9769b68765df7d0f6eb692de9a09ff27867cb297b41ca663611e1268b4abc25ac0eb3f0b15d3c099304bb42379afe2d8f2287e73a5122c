import { AuthError } from "@azure/msal-common/browser";
import * as NativeAuthErrorCodes from "./NativeAuthErrorCodes.js";
export { NativeAuthErrorCodes };
export type OSError = {
    error?: number;
    protocol_error?: string;
    properties?: object;
    status?: string;
    retryable?: boolean;
};
export declare const NativeAuthErrorMessages: {
    user_switch: string;
};
export declare class NativeAuthError extends AuthError {
    ext: OSError | undefined;
    constructor(errorCode: string, description?: string, ext?: OSError);
}
/**
 * These errors should result in a fallback to the 'standard' browser based auth flow.
 */
export declare function isFatalNativeAuthError(error: NativeAuthError): boolean;
/**
 * Create the appropriate error object based on the WAM status code.
 * @param code
 * @param description
 * @param ext
 * @returns
 */
export declare function createNativeAuthError(code: string, description?: string, ext?: OSError): AuthError;
//# sourceMappingURL=NativeAuthError.d.ts.map