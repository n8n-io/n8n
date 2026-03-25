/**
 * This exception can be thrown to indicate that an operation failed and an error message has already
 * been reported appropriately. Thus, the catch handler does not have responsibility for reporting
 * the error.
 *
 * @remarks
 * For example, suppose a tool writes interactive output to `console.log()`.  When an exception is thrown,
 * the `catch` handler will typically provide simplistic reporting such as this:
 *
 * ```ts
 * catch (error) {
 *   console.log("ERROR: " + error.message);
 * }
 * ```
 *
 * Suppose that the code performing the operation normally prints rich output to the console.  It may be able to
 * present an error message more nicely (for example, as part of a table, or structured log format).  Throwing
 * `AlreadyReportedError` provides a way to use exception handling to abort the operation, but instruct the `catch`
 * handler not to print an error a second time:
 *
 * ```ts
 * catch (error) {
 *   if (error instanceof AlreadyReportedError) {
 *     return;
 *   }
 *   console.log("ERROR: " + error.message);
 * }
 * ```
 *
 * @public
 */
export declare class AlreadyReportedError extends Error {
    constructor();
    static [Symbol.hasInstance](instance: object): boolean;
}
//# sourceMappingURL=AlreadyReportedError.d.ts.map