"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationError = exports.NotFoundError = exports.APIError = exports.ZepError = void 0;
/**
 * Unified error class for all Zep errors.
 */
class ZepError extends Error {
    /**
     * Constructs a new ZepError instance.
     * @param {string} message - The error message.
     * @param {number} [code] - Optional error code associated with the error.
     * @param {any} [responseData] - Optional response associated with the error.
     */
    constructor(message, code, responseData) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.responseData = responseData;
    }
}
exports.ZepError = ZepError;
/**
 * Custom error class for unexpected API response errors.
 */
class APIError extends ZepError {
}
exports.APIError = APIError;
/**
 * Custom error class for not found errors.
 */
class NotFoundError extends ZepError {
}
exports.NotFoundError = NotFoundError;
/**
 * Custom error class for authentication errors.
 */
class AuthenticationError extends ZepError {
}
exports.AuthenticationError = AuthenticationError;
