/**
 * Symbols used internally within ts-pattern to construct and discriminate
 * Guard, Not, and Select, and AnonymousSelect patterns
 *
 * Symbols have the advantage of not appearing in auto-complete suggestions in
 * user defined patterns, and eliminate the risk of property
 * overlap between ts-pattern internals and user defined patterns.
 *
 * These symbols have to be visible to tsc for type inference to work, but
 * users should not import them
 * @module
 * @private
 * @internal
 */
export declare const matcher: unique symbol;
export type matcher = typeof matcher;
export declare const unset: unique symbol;
export type unset = typeof unset;
export declare const isVariadic: unique symbol;
export type isVariadic = typeof isVariadic;
export declare const anonymousSelectKey = "@ts-pattern/anonymous-select-key";
export type anonymousSelectKey = typeof anonymousSelectKey;
export declare const override: unique symbol;
export type override = typeof override;
