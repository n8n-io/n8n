'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
class ValidationError extends Error {
    /**
     * Create a new instance for the given `message`.
     *
     * @param message  The error message
     */
    constructor(message) {
        super(message);
        if (Error.captureStackTrace && typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    /**
     * Returns a validation error with the given `message`.
     */
    static createFrom(message) {
        return new this(message);
    }
}
exports.ValidationError = ValidationError;
