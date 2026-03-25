'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisePoolError = void 0;
class PromisePoolError extends Error {
    /**
     * Create a new instance for the given `message` and `item`.
     *
     * @param error  The original error
     * @param item   The item causing the error
     */
    constructor(error, item) {
        super();
        this.raw = error;
        this.item = item;
        this.name = this.constructor.name;
        this.message = this.messageFrom(error);
        if (Error.captureStackTrace && typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    /**
     * Returns a new promise pool error instance wrapping the `error` and `item`.
     *
     * @param {*} error
     * @param {*} item
     *
     * @returns {PromisePoolError}
     */
    static createFrom(error, item) {
        return new this(error, item);
    }
    /**
     * Returns the error message from the given `error`.
     *
     * @param {*} error
     *
     * @returns {String}
     */
    messageFrom(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'object') {
            return error.message;
        }
        if (typeof error === 'string' || typeof error === 'number') {
            return error.toString();
        }
        return '';
    }
}
exports.PromisePoolError = PromisePoolError;
