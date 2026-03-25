/**
 * A monad that captures the result of a function call or an error if it was not
 * successful. Railway programming, enabled by this type, can be a nicer
 * alternative to traditional exception throwing because it allows functions to
 * declare all _known_ errors with static types and then check for them
 * exhaustively in application code. Thrown exception have a type of `unknown`
 * and break out of regular control flow of programs making them harder to
 * inspect and more verbose work with due to try-catch blocks.
 */
export type Result<T, E = unknown> = {
    ok: true;
    value: T;
    error?: never;
} | {
    ok: false;
    value?: never;
    error: E;
};
export declare function OK<V>(value: V): Result<V, never>;
export declare function ERR<E>(error: E): Result<never, E>;
/**
 * unwrap is a convenience function for extracting a value from a result or
 * throwing if there was an error.
 */
export declare function unwrap<T>(r: Result<T, unknown>): T;
/**
 * unwrapAsync is a convenience function for resolving a value from a Promise
 * of a result or rejecting if an error occurred.
 */
export declare function unwrapAsync<T>(pr: Promise<Result<T, unknown>>): Promise<T>;
//# sourceMappingURL=fp.d.ts.map