/**
 * Unified error class for all Zep errors.
 */
export declare class ZepError extends Error {
    code?: number;
    responseData?: any;
    /**
     * Constructs a new ZepError instance.
     * @param {string} message - The error message.
     * @param {number} [code] - Optional error code associated with the error.
     * @param {any} [responseData] - Optional response associated with the error.
     */
    constructor(message: string, code?: number, responseData?: any);
}
/**
 * Custom error class for unexpected API response errors.
 */
export declare class APIError extends ZepError {
}
/**
 * Custom error class for not found errors.
 */
export declare class NotFoundError extends ZepError {
}
/**
 * Custom error class for authentication errors.
 */
export declare class AuthenticationError extends ZepError {
}
