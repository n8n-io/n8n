export declare class PromisePoolError<T, E = any> extends Error {
    /**
     * Returns the item that caused this error.
     */
    item: T;
    /**
     * Returns the original, raw error instance.
     */
    raw: E;
    /**
     * Create a new instance for the given `message` and `item`.
     *
     * @param error  The original error
     * @param item   The item causing the error
     */
    constructor(error: E, item: T);
    /**
     * Returns a new promise pool error instance wrapping the `error` and `item`.
     *
     * @param {*} error
     * @param {*} item
     *
     * @returns {PromisePoolError}
     */
    static createFrom<T, E = any>(error: E, item: T): PromisePoolError<T>;
    /**
     * Returns the error message from the given `error`.
     *
     * @param {*} error
     *
     * @returns {String}
     */
    private messageFrom;
}
