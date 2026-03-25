import { AuthError } from "./AuthError.js";
/**
 * Represents network related errors
 */
export declare class NetworkError extends AuthError {
    error: AuthError;
    httpStatus?: number;
    responseHeaders?: Record<string, string>;
    constructor(error: AuthError, httpStatus?: number, responseHeaders?: Record<string, string>);
}
/**
 * Creates NetworkError object for a failed network request
 * @param error - Error to be thrown back to the caller
 * @param httpStatus - Status code of the network request
 * @param responseHeaders - Response headers of the network request, when available
 * @returns NetworkError object
 */
export declare function createNetworkError(error: AuthError, httpStatus?: number, responseHeaders?: Record<string, string>, additionalError?: Error): NetworkError;
//# sourceMappingURL=NetworkError.d.ts.map