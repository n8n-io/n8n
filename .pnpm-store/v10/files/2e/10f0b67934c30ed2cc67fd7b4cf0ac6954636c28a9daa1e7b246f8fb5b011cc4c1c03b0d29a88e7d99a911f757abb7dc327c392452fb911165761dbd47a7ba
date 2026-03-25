export type ITSToStringLiteralAllowedType = string | number | boolean | bigint;
/**
 * `${T}`
 */
export type ITSToStringLiteral<T extends ITSToStringLiteralAllowedType> = `${T}`;
/**
 * T & `${T}`
 */
export type ITSTypeAndStringLiteral<T extends ITSToStringLiteralAllowedType> = T | ITSToStringLiteral<T>;
/**
 * S & `${T}`
 */
export type ITSAndStringLiteral<T extends ITSToStringLiteralAllowedType, S = string> = S | ITSToStringLiteral<T>;
/**
 * S & T & `${T}`
 */
export type ITSAndTypeAndStringLiteral<T extends ITSToStringLiteralAllowedType, S = string> = S | ITSTypeAndStringLiteral<T>;
