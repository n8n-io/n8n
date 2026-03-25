/**
 * An `Error` subclass that should be thrown to report an unexpected state that may indicate a software defect.
 * An application may handle this error by instructing the end user to report an issue to the application maintainers.
 *
 * @remarks
 * Do not use this class unless you intend to solicit bug reports from end users.
 *
 * @public
 */
export declare class InternalError extends Error {
    /**
     * If true, a JavScript `debugger;` statement will be invoked whenever the `InternalError` constructor is called.
     *
     * @remarks
     * Generally applications should not be catching and ignoring an `InternalError`.  Instead, the error should
     * be reported and typically the application will terminate.  Thus, if `InternalError` is constructed, it's
     * almost always something we want to examine in a debugger.
     */
    static breakInDebugger: boolean;
    /**
     * The underlying error message, without the additional boilerplate for an `InternalError`.
     */
    readonly unformattedMessage: string;
    /**
     * Constructs a new instance of the {@link InternalError} class.
     *
     * @param message - A message describing the error.  This will be assigned to
     * {@link InternalError.unformattedMessage}.  The `Error.message` field will have additional boilerplate
     * explaining that the user has encountered a software defect.
     */
    constructor(message: string);
    private static _formatMessage;
    /** @override */
    toString(): string;
}
//# sourceMappingURL=InternalError.d.ts.map